---
title: "fix: Player View — persistence, HP animation, combat effects legend"
type: fix
status: active
date: 2026-05-21
---

# fix: Player View — persistence, HP animation, combat effects legend

## Overview

Three corrections to the player-view module:
1. Window position not persisting across sessions (filtered out on reload)
2. Missing floating HP change animation (already exists in map-display)
3. No combat effects legend option (conditions exist in combat-tracker but aren't surfaceable in player view)

## Problem Statement

1. **Persistence:** `useCanvasPersistence.ts:45` defines `validToolTypes` but omits `'player-view'`. On campaign reload, the player-view window is silently discarded.
2. **HP Animation:** Map-display shows floating +/- numbers via `combat:hp-changed` event bus subscription. The player view broadcast (`usePlayerViewBroadcast.ts`) sends state to the LAN client but the client has no floating text animation.
3. **Effects Legend:** Combat tracker manages `ActiveCondition[]` per combatant with 10 built-in conditions + custom ones. Players have no way to see what these conditions mean during combat.

## Proposed Solution

### Fix 1: Add `'player-view'` to `validToolTypes`

**File:** `src/ui/canvas/hooks/useCanvasPersistence.ts:45`

Add `'player-view'` to the Set. One-line fix.

### Fix 2: HP floating animation in Player View broadcast

The player view has two display surfaces:
- **DM-side preview** (`PlayerPreview.tsx`) — canvas2D mini-preview
- **LAN client** (served HTML page) — what players see on their devices

**Approach:** Broadcast `combat:hp-changed` events to LAN clients via the existing broadcast mechanism. The LAN client already renders a canvas — add floating text rendering there identical to `useTokenRenderer.ts` logic (lines 339-364).

Steps:
1. In `usePlayerViewBroadcast.ts`: subscribe to `combat:hp-changed`, broadcast as a `'hp-animation'` message type
2. In the LAN client renderer: receive `hp-animation` messages, spawn floating text with same easing/duration (1200ms, easeOutCubic, 48px float distance, green/red colors)
3. In `PlayerPreview.tsx`: optionally show the same floating texts for DM feedback

**Constants to replicate:**
```ts
const FLOAT_DURATION = 1200;
const FLOAT_DISTANCE = 48;
const MAX_FLOATING_TEXTS = 50;
```

**Colors:** `#4ade80` (heal), `#ef4444` (damage)

### Fix 3: Combat effects legend toggle

**Approach:** Add a "Show Effects Legend" toggle to player view settings. When enabled, broadcast the list of possible conditions (name + color + description) to LAN clients, which render a collapsible legend panel.

Steps:
1. Extend `PlayerViewState` with `showEffectsLegend: boolean`
2. In `usePlayerViewBroadcast.ts`: when legend enabled, include conditions data in broadcast state (pull from combat-tracker's state via event bus or direct window state access)
3. LAN client: render a toggleable overlay panel listing condition names with their color indicators
4. Source conditions from: built-in 10 + any custom conditions defined in combat-tracker

**Condition colors** (from `useTokenRenderer.ts`):
- Stunned, Poisoned, Blinded, Frightened, Prone, Paralyzed, Charmed, Restrained, Invisible, Incapacitated — each has a mapped color used for token overlays

## Acceptance Criteria

- [ ] Player-view window position/size persists across campaign reload (`useCanvasPersistence.ts` — add to `validToolTypes`)
- [ ] Floating HP +/- numbers animate on LAN client when combat HP changes (1.2s duration, easeOutCubic, green heal / red damage)
- [ ] DM preview (`PlayerPreview.tsx`) also shows floating HP numbers
- [ ] New toggle in player-view UI: "Show Effects Legend"
- [ ] When enabled, LAN client displays a legend panel with all active combat conditions (name + color indicator)
- [ ] Legend updates live as conditions are added/removed in combat tracker
- [ ] `npm run build` and `npm run lint` pass

## Technical Considerations

- **Event bus coupling:** HP animation already uses `combat:hp-changed`. Legend can use `combat:conditions-changed` or read sibling window's `toolState` from canvas state.
- **LAN client is a separate HTML page** served by the built-in HTTP server — changes there are in `src/electron/` or a served static file. Need to locate where the client HTML/JS lives.
- **Performance:** Floating texts capped at 50 (same as map-display). Legend is static data, low overhead.
- **State shape change:** Adding `showEffectsLegend` to `PlayerViewState` — existing saved states will have `undefined` which defaults to `false`.

## Implementation Order

1. Fix persistence (1 line) — immediate win
2. HP animation broadcast + client rendering
3. Effects legend toggle + UI

## Sources

- `src/ui/canvas/hooks/useCanvasPersistence.ts:45` — validToolTypes Set
- `src/ui/tools/map-display/hooks/useTokenRenderer.ts:339-364` — floating text animation reference
- `src/ui/tools/combat-tracker/types.ts` — ActiveCondition, CombatCondition interfaces
- `src/ui/tools/player-view/hooks/usePlayerViewBroadcast.ts` — broadcast mechanism
- `src/ui/event-bus/event-bus.ts` — cross-tool event system
