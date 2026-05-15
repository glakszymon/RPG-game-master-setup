---
title: "fix: Map token addition causes image loss and module freeze"
type: fix
status: active
date: 2026-05-15
origin: docs/brainstorms/2026-05-14-map-display-requirements.md
---

# fix: Map token addition causes image loss and module freeze

## Overview

Adding characters from Party Tracker (or manually) onto the Map Display causes the map image to disappear and the module to become unresponsive, with no error in the console. The system must also be designed to support future token sources (Bestiary, Combat Tracker).

## Problem Statement

When a user drags a character from Party Tracker onto the map, or clicks "Add Token" in the toolbar:

1. The map image disappears (blank canvas)
2. The toolbar collapses to "Load Map" state (because `hasImage` becomes false)
3. The module appears frozen — no controls, no way to recover
4. No error is thrown in the console

**Root cause**: `stateRef.current` is updated asynchronously via `useEffect` (fires after render), but state-patching callbacks like `handleTokensChange` read `stateRef.current` synchronously during event handlers. When a token is added, the callback spreads `{ ...stateRef.current, tokens: newTokens }` — but `stateRef.current` may still hold `DEFAULT_MAP_STATE` (where `imagePath: null`) if the effect hasn't flushed yet. This overwrites the persisted `imagePath`, killing the map.

**Secondary issues discovered during analysis:**

- Multiple `onToolStateChange` calls in the same tick race against each other (e.g., `updateTokensBySource` + `addToken` — already partially fixed but pattern persists in other callbacks)
- `DEFAULT_MAP_STATE` spread on line 23 silently masks missing fields, creating a data-loss path with no warning
- No `world.destroyed` guards in several async code paths (partially fixed, but `fitToContainer` and `loadImage` still had gaps — now patched)
- `portraitPath` may be a data URL or a file path — `loadTokenAvatar` assumed file path only (now patched)

## Proposed Solution

### Fix 1 (ROOT CAUSE): Synchronous `stateRef` update

Replace the async `useEffect` ref sync with a synchronous assignment during render:

```typescript
// src/ui/tools/map-display/MapDisplay.tsx — line 30-31
// BEFORE (buggy):
const stateRef = useRef(state);
useEffect(() => { stateRef.current = state; });

// AFTER (fix):
const stateRef = useRef(state);
stateRef.current = state;  // synchronous — always current when callbacks read it
```

This is a well-known React pattern. Refs are mutable and updating them during render is safe as long as you don't trigger side effects. This eliminates the one-tick lag where `stateRef.current` is stale.

### Fix 2: Atomic state updates — eliminate spread-and-replace pattern

Every callback that patches state currently does:
```typescript
onToolStateChange({ ...stateRef.current, <field>: newValue });
```

This is fragile — if two callbacks fire before a re-render, the second overwrites the first's changes. Replace with a helper that reads the **current** ref at call time (safe after Fix 1):

```typescript
// src/ui/tools/map-display/MapDisplay.tsx
const patchState = useCallback((patch: Partial<MapDisplayState>) => {
  onToolStateChange({ ...stateRef.current, ...patch });
}, [onToolStateChange]);
```

Then all callbacks use `patchState({ tokens: newTokens })`, `patchState({ fowDataUrl: url })`, etc. This centralizes the pattern and makes it easy to add defensive checks.

### Fix 3: Defensive guard in `patchState` against imagePath loss

Add a runtime guard that prevents `imagePath` from being silently set to `null` when it was previously set:

```typescript
const patchState = useCallback((patch: Partial<MapDisplayState>) => {
  const current = stateRef.current;
  const next = { ...current, ...patch };
  // Safety: never silently erase imagePath if it existed
  if (current.imagePath && !next.imagePath && !('imagePath' in patch)) {
    console.warn('[MapDisplay] patchState would erase imagePath — blocked');
    next.imagePath = current.imagePath;
  }
  onToolStateChange(next);
}, [onToolStateChange]);
```

### Fix 4: Design token source abstraction for Bestiary support

The current `MapToken.sourceType` is `'party' | 'bestiary' | 'manual'`. The drag-drop protocol uses `dataTransfer.setData('application/json', ...)` with a `type` field. To support future sources:

```typescript
// Standardized drop payload protocol
interface MapDropPayload {
  type: 'party-character' | 'bestiary-creature';  // extensible
  id: string;
  name: string;
  portraitPath: string | null;
  // Optional metadata per source
  meta?: Record<string, unknown>;
}
```

The `handleDrop` handler should use a switch on `data.type` to set `sourceType` accordingly, rather than hardcoding `'party-character'` check.

## Technical Considerations

### Architecture impacts
- `stateRef` sync change is minimal and safe — no architectural change needed
- `patchState` helper is a refactor of existing pattern, no new dependencies
- Drop payload protocol is additive — doesn't break existing Party Tracker integration

### Performance implications
- Synchronous ref update has zero perf cost (removes a `useEffect`, actually slightly faster)
- `patchState` is equivalent cost to current pattern

### State persistence safety
- The existing canvas state JSON blob -> SQLite persistence is not affected
- `patchState` guard prevents data loss during persistence

## System-Wide Impact

- **Interaction graph**: `handleDrop` -> `addTokenWithSync` -> `onTokensChange` -> `handleTokensChange` -> `onToolStateChange` -> `dispatch(UPDATE_TOOL_STATE)` -> canvas reducer -> re-render -> `stateRef.current = state`
- **Error propagation**: Silent — `imagePath` becomes `null`, `hasImage` becomes `false`, UI collapses to "Load Map" state with no error. The `patchState` guard adds a `console.warn`.
- **State lifecycle risks**: The core risk is the stale ref. Fix 1 eliminates it. Fix 3 adds a safety net.
- **API surface parity**: `handleFowChange`, `updateGrid`, `updateVfxSettings`, `handleTokensChange` all use the same `{ ...stateRef.current, field }` pattern — all must use `patchState`.

## Acceptance Criteria

### Functional Requirements
- [ ] Dragging a character from Party Tracker onto the map adds a token WITHOUT removing the map image
- [ ] Adding a manual token via toolbar button works WITHOUT removing the map image
- [ ] Multiple tokens can be added in rapid succession without state corruption
- [ ] Existing tokens retain their positions when new tokens are added
- [ ] Token drag on map persists position correctly
- [ ] FoW painting does not interfere with token state (and vice versa)
- [ ] Drop handler supports future `bestiary-creature` type via switch pattern

### Non-Functional Requirements
- [ ] `console.warn` fires if `imagePath` would be silently erased (safety net, should never trigger after fix)
- [ ] No `useEffect` for `stateRef` sync — synchronous assignment only
- [ ] All state-patching callbacks use `patchState` helper — no direct `onToolStateChange({ ...stateRef.current })` calls remain

## MVP

### Phase 1: Core bug fix (stateRef + patchState)

#### `src/ui/tools/map-display/MapDisplay.tsx`

1. Replace `useEffect(() => { stateRef.current = state; })` with `stateRef.current = state;` (synchronous)
2. Create `patchState` helper with `imagePath` guard
3. Replace all `onToolStateChange({ ...stateRef.current, ... })` calls with `patchState({ ... })`
4. Consolidate `handleTokensChange`, `handleFowChange`, `updateGrid`, `updateVfxSettings`, `updateBrushSettings`, `applyZoom`, `fitToContainer` viewport update — all through `patchState`

#### `src/ui/tools/map-display/hooks/useTokenLayer.ts`

5. Verify `addTokenWithSync` works correctly with the new synchronous ref (it should — no change needed in the hook itself, the fix is in the callback it receives)

### Phase 2: Extensible drop protocol

#### `src/ui/tools/map-display/MapDisplay.tsx`

6. Refactor `handleDrop` to use switch on `data.type`:
   - `'party-character'` -> `sourceType: 'party'`
   - `'bestiary-creature'` -> `sourceType: 'bestiary'`
   - default: ignore

#### `src/ui/tools/map-display/types.ts`

7. Add `MapDropPayload` interface documenting the protocol

### Files affected

| File | Change |
|------|--------|
| `src/ui/tools/map-display/MapDisplay.tsx` | Sync ref, patchState, refactor all callbacks, drop handler switch |
| `src/ui/tools/map-display/types.ts` | Add `MapDropPayload` interface |
| `src/ui/tools/map-display/hooks/useTokenLayer.ts` | No changes needed (already fixed) |
| `src/ui/tools/party-tracker/CharacterCard.tsx` | No changes needed |

## Sources & References

- **Origin document:** [docs/brainstorms/2026-05-14-map-display-requirements.md](docs/brainstorms/2026-05-14-map-display-requirements.md) — token drag&drop from Party Tracker/Bestiary, free positioning, Combat Tracker integration
- Root cause location: `src/ui/tools/map-display/MapDisplay.tsx:30-31` (stateRef async update)
- State dispatch: `src/ui/canvas/InfiniteCanvas.tsx:301` (onToolStateChange -> UPDATE_TOOL_STATE)
- Reducer: `src/ui/canvas/hooks/useCanvasState.ts:164-170` (UPDATE_TOOL_STATE handler)
- Tutorial discoveries: `docs/brainstorms/tutorial.md` — Pixi.js v8 async init, destroyed container guards, mask-based FoW
