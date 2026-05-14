---
title: "fix: Resolve all ESLint errors across canvas and map-display modules"
type: fix
status: active
date: 2026-05-15
---

# fix: Resolve all ESLint errors across canvas and map-display modules

## Overview

There are ~35 ESLint errors (severity 4-8) across 8 files in the canvas and map-display modules. The errors fall into distinct categories that each require a specific fix pattern.

## Error Categories & Fix Strategies

### 1. `react-hooks/refs` — Cannot access ref `.current` during render (10 errors)

**Files:** `InfiniteCanvas.tsx`, `MapDisplay.tsx`, `useVfxLayer.ts`

**Problem:** Reading/writing `ref.current` in the render body violates React 19's stricter ref rules. Refs are "escape hatches" — their values aren't tracked by React's render cycle, so reading them during render can give stale values.

**Fix patterns:**

#### 1a. `InfiniteCanvas.tsx:282` — `transformRef.current.scale` read in JSX

```tsx
// BEFORE (line 282)
scale={transformRef.current.scale}

// FIX: Use state-derived scale value instead of reading ref during render.
// The component already has access to transform via getTransform() or state.
// Option A: Derive from existing state or add a `scale` state variable.
// Option B: Memoize scale from the last updateVisibility call.
```

The `transformRef` is used for imperative pan/zoom. You need a parallel `scale` state that updates alongside the ref — e.g. in the same `onWheel`/`onPointerMove` handler that updates `transformRef`, also call `setScale(newScale)`.

#### 1b. `MapDisplay.tsx:31` — `stateRef.current = state` in render body

```tsx
// BEFORE
const stateRef = useRef(state);
stateRef.current = state; // ← error: writing ref during render

// FIX: Move ref sync into useEffect
useEffect(() => {
  stateRef.current = state;
});
```

#### 1c. `MapDisplay.tsx:37,45,46,61,62,74,75` — Passing `ref.current` to hooks

```tsx
// BEFORE
useGridLayer(worldRef.current, state.grid, mapSize.w, mapSize.h);
useFowLayer(appRef.current, worldRef.current, ...);

// FIX: Change hook signatures to accept RefObject<T> instead of T | null.
// Inside each hook, read .current in useEffect (not during render).
// Example:
function useGridLayer(worldRef: RefObject<Container | null>, ...) {
  useEffect(() => {
    const world = worldRef.current;
    if (!world) return;
    // ... use world
  }, [worldRef, ...]);
}
```

**Alternative (simpler):** Store `app` and `worldContainer` in state instead of refs, since they're needed for rendering decisions. Use `useState` + set them in the `usePixiApp` hook.

#### 1d. `useVfxLayer.ts:66` — `instancesRef.current = vfxInstances` in render body

Same pattern as 1b. Wrap in `useEffect`.

---

### 2. `react-hooks/rules-of-hooks` — Conditional hook call (1 error)

**File:** `Minimap.tsx:42`

**Problem:** `useMemo` called after early return `if (!visible) return null;` on line 38.

```tsx
// BEFORE
function Minimap({ ..., visible }: MinimapProps) {
  if (!visible) return null;         // ← early return
  const visibleWindows = ...;
  const { ... } = useMemo(() => {    // ← hook after early return!

// FIX: Move ALL hooks above the early return. Move the early return
// after all hooks, or wrap the null-return in the JSX instead.
function Minimap({ ..., visible }: MinimapProps) {
  const visibleWindows = useMemo(
    () => windows.filter((w) => !w.minimized),
    [windows]
  );
  const { scale: mapScale, offsetX, offsetY } = useMemo(() => { ... }, [...]);

  if (!visible) return null;  // ← now safe, after all hooks
  // ... JSX
}
```

---

### 3. `react-hooks/set-state-in-effect` — Synchronous setState in effect (1 error)

**File:** `useViewportCulling.ts:115`

```tsx
// BEFORE
useEffect(() => {
  const nowVisible = computeVisible();
  setVisibleIds(nowVisible);          // ← cascading render
}, [computeVisible]);

// FIX: Use useMemo instead of useEffect+setState for derived state.
// visibleIds when windows change is purely derived data.
const initialVisibleIds = useMemo(() => computeVisible(), [computeVisible]);
// Then use initialVisibleIds to seed state, or merge into the
// existing setVisibleIds logic in updateVisibility.
```

**Alternative:** Use `startTransition` wrapper (already used in `updateVisibility`). Or replace the effect with direct initialization in `useState`:
```tsx
const [visibleIds, setVisibleIds] = useState<Set<string>>(() => computeVisible());
```
Since `computeVisible` depends on `windows`, when windows change the state needs updating. The cleanest fix: remove this effect entirely and call `updateVisibility()` from wherever windows change.

---

### 4. `react-hooks/immutability` — Mutating `app` canvas style in effects (4 errors)

**Files:** `useFowLayer.ts:195`, `useVfxLayer.ts:181`

**Problem:** `canvas.style.cursor = 'crosshair'` modifies the `app` parameter's canvas, which ESLint sees as mutating a prop.

```tsx
// BEFORE (inside useEffect)
canvas.style.cursor = 'crosshair';

// FIX: Use a separate ref for the canvas element, obtained independently.
// Option A: Pass canvasRef as a separate prop (not derived from app).
// Option B: Query the canvas element from the DOM:
const canvasEl = canvasAreaRef.current?.querySelector('canvas');
if (canvasEl) canvasEl.style.cursor = 'crosshair';

// Option C: Manage cursor via CSS class on parent div instead:
// Add/remove a CSS class that sets cursor on the container.
```

**Recommended:** Option C — manage cursor via state + CSS class. This avoids direct DOM mutation entirely:
```tsx
// In MapDisplay, add cursor state:
const [cursorClass, setCursorClass] = useState('');
// Pass setCursorClass to hooks, apply via className on canvas container
```

---

### 5. `no-case-declarations` — Lexical declarations in case blocks (2 errors)

**File:** `useVfxLayer.ts:277-278`

```tsx
// BEFORE
case 'explosion':
  const angle = Math.random() * Math.PI * 2;
  const speed = 40 + Math.random() * 80;

// FIX: Wrap case body in braces
case 'explosion': {
  const angle = Math.random() * Math.PI * 2;
  const speed = 40 + Math.random() * 80;
  p.vx = Math.cos(angle) * speed;
  p.vy = Math.sin(angle) * speed;
  p.life = 0.3 + Math.random() * 0.5;
  p.baseScale = 1 + Math.random();
  break;
}
```

---

### 6. `@typescript-eslint/no-unused-vars` (2 errors)

**Files:** `MapDisplay.tsx:22` (`_campaignId`), `MapDisplay.tsx:73` (`_removeVfx`), `PartyTracker.tsx:64` (`_campaignId`)

**Fix:** Remove unused destructured variables entirely or use them. The `_` prefix convention doesn't suppress this ESLint rule.

```tsx
// Option A: Omit from destructuring
export function MapDisplay({ toolState, onToolStateChange }: MapDisplayProps) {
// Remove campaignId from the interface if truly unused.

// Option B: If keeping for future use, add eslint-disable comment (not recommended)
```

For `_removeVfx`: either use `removeVfx` somewhere or destructure without it:
```tsx
const { clearAllVfx } = useVfxLayer(...);
```

---

### 7. `react-hooks/exhaustive-deps` — Missing dependencies (warnings, severity 4)

**File:** `useFocusPresets.ts` (6 warnings) — missing `campaignId` in deps

```tsx
// Lines 45, 91, 122, 155, 163, 191 — all missing campaignId
// FIX: Add campaignId to each dependency array
useEffect(() => { ... }, [campaignId]);          // line 45
useEffect(() => { ... }, [state, getTransform, campaignId]); // line 91
useCallback(async (...) => { ... }, [state, getTransform, campaignId]); // line 122
useCallback(async (...) => { ... }, [campaignId]); // line 155
useCallback(async (...) => { ... }, [campaignId]); // line 163
useCallback(async (...) => { ... }, [presets, state, getTransform, campaignId]); // line 191
```

**File:** `useViewportCulling.ts:121` — ref value in cleanup

```tsx
// FIX: Copy ref value inside effect body
useEffect(() => {
  const timers = pendingRemoveRef.current; // ← capture here
  return () => {
    for (const timer of timers.values()) {
      clearTimeout(timer);
    }
  };
}, []);
```

**File:** `useFowLayer.ts:97` — missing `fowDataUrl`
Already has comment "intentionally excluded". Add eslint-disable-next-line comment:
```tsx
// eslint-disable-next-line react-hooks/exhaustive-deps
}, [app, worldContainer, mapWidth, mapHeight]);
```

**File:** `useVfxLayer.ts:82-83` — ref values in cleanup
Same pattern as useViewportCulling. Copy ref values at effect start.

**File:** `PartyTracker.tsx:66` — `characters` logical expression unstable

```tsx
// BEFORE
const characters: Character[] = toolState?.characters ?? [];

// FIX: Wrap in useMemo
const characters = useMemo(
  () => toolState?.characters ?? [],
  [toolState?.characters]
);
```

## Acceptance Criteria

- [ ] Zero ESLint errors (severity 8) across all listed files
- [ ] Zero ESLint warnings (severity 4) across all listed files
- [ ] App builds successfully with `npm run build`
- [ ] All existing functionality works (pan/zoom, FoW painting, VFX, tokens, presets)

## Implementation Order

1. **Easy wins first:** `no-case-declarations` (braces), `no-unused-vars` (remove), conditional hook (`Minimap.tsx`)
2. **Dependency arrays:** Add missing deps in `useFocusPresets.ts`, fix ref captures in cleanup functions
3. **Ref-during-render:** `stateRef`/`instancesRef` writes → wrap in `useEffect`
4. **Hook signatures:** Refactor `useGridLayer`, `useFowLayer`, `useTokenLayer`, `useVfxLayer` to accept `RefObject` instead of `T | null`
5. **Canvas cursor mutation:** Refactor to CSS-class-based cursor management
6. **InfiniteCanvas scale:** Add state-based scale tracking
7. **useViewportCulling setState:** Replace effect with `useMemo` or direct call
8. **PartyTracker characters:** Wrap in `useMemo`
9. **Final:** Run `npx eslint src/ --max-warnings 0` to verify zero errors

## Files to Modify

| File | Errors | Warnings |
|---|---|---|
| `src/ui/canvas/InfiniteCanvas.tsx` | 1 | 0 |
| `src/ui/canvas/Minimap.tsx` | 1 | 0 |
| `src/ui/canvas/hooks/useViewportCulling.ts` | 1 | 1 |
| `src/ui/canvas/hooks/useFocusPresets.ts` | 0 | 6 |
| `src/ui/tools/map-display/MapDisplay.tsx` | 10 | 0 |
| `src/ui/tools/map-display/hooks/useFowLayer.ts` | 2 | 1 |
| `src/ui/tools/map-display/hooks/useVfxLayer.ts` | 4 | 2 |
| `src/ui/tools/party-tracker/PartyTracker.tsx` | 1 | 5 |

## Sources

- React 19 ref rules: https://react.dev/reference/react/useRef
- Rules of Hooks: https://react.dev/reference/rules/rules-of-hooks
- ESLint plugin react-hooks: https://react.dev/reference/eslint-plugin-react-hooks
