---
title: "fix: Mouse position offset in map canvas due to ancestor CSS transforms"
type: fix
status: active
date: 2026-05-18
---

# fix: Mouse position offset in map canvas due to ancestor CSS transforms

## Overview

When clicking or dragging on the map canvas, interactions register approximately half a screen away from the actual cursor position. The same offset affects resize handles. The root cause is that `getBoundingClientRect()` returns **visual** (post-transform) dimensions when the canvas lives inside a CSS-transformed ancestor (`@panzoom/panzoom` on `.canvasInner`), corrupting both canvas sizing and mouse coordinate calculations.

## Problem Statement

The DOM hierarchy:
```
.canvasOuter
  .canvasInner (← panzoom applies CSS transform: scale(S) here)
    CanvasWindow (absolute positioned)
      MapDisplay
        .canvasArea
          <canvas>
```

When outer panzoom scale ≠ 1, three bugs compound:

1. **Canvas sizing bug** — `useCanvasRenderer.ts:160-168` uses `container.getBoundingClientRect()` to size the canvas. This returns `localSize × panzoomScale`, so the canvas is oversized in local space, then visually scaled again by the ancestor transform.

2. **Mouse coordinate bug** — All mouse handlers compute `e.clientX - rect.left` which yields a screen-space offset in range `[0, visualWidth]`, but `screenToWorld()` expects canvas-local coordinates in range `[0, localWidth]`. At scale 2×, clicks register at 2× the intended position.

3. **View transition corruption** — `ViewTransition.module.css` animates `scale(0.85)→scale(1)` on mount. If `resize()` fires during animation, canvas is permanently sized to 85% of correct.

## Proposed Solution

### Fix 1: Canvas sizing — use `clientWidth`/`clientHeight`

**File:** `src/ui/tools/map-display/hooks/useCanvasRenderer.ts:160-168`

Replace `getBoundingClientRect()` with `clientWidth`/`clientHeight` which return layout size unaffected by ancestor transforms:

```typescript
const resize = () => {
  const w = container.clientWidth;
  const h = container.clientHeight;
  const dpr = window.devicePixelRatio || 1;
  canvas.width = Math.floor(w * dpr);
  canvas.height = Math.floor(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  sizeRef.current = { w, h };
};
```

### Fix 2: Mouse coordinates — compensate for transform scale

In every mouse handler, convert screen-space offset to canvas-local offset:

```typescript
const rect = canvas.getBoundingClientRect();
const scaleX = canvas.clientWidth / rect.width;
const scaleY = canvas.clientHeight / rect.height;
const sx = (e.clientX - rect.left) * scaleX;
const sy = (e.clientY - rect.top) * scaleY;
```

**Affected locations (all need the same fix):**

| File | Lines | Context |
|------|-------|---------|
| `useCanvasRenderer.ts` | 209-211 | Wheel zoom |
| `useTokenRenderer.ts` | 443-444 | Token hit test (pointerdown) |
| `useTokenRenderer.ts` | 460-461 | Token drag (pointermove) |
| `useFowRenderer.ts` | 148-149 | FoW brush pointerdown |
| `useFowRenderer.ts` | 164-166 | FoW brush pointermove |
| `MapDisplay.tsx` | 387-390 | Cursor preview |
| `MapDisplay.tsx` | 247-250 | Drop handler |

Consider extracting a utility:

```typescript
// src/ui/tools/map-display/utils.ts
export function canvasLocalCoords(e: MouseEvent | PointerEvent, canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  return [
    (e.clientX - rect.left) * (canvas.clientWidth / rect.width),
    (e.clientY - rect.top) * (canvas.clientHeight / rect.height),
  ] as const;
}
```

### Fix 3: View transition — delay or re-trigger resize after animation

Either:
- Add `animationend` listener to re-fire resize after the zoom-in animation completes
- Or use `requestAnimationFrame` loop until ancestor transform stabilizes

### Fix 4 (optional): Stop wheel event propagation in map canvas

In `useCanvasRenderer.ts:230` wheel handler, add `e.stopPropagation()` to prevent outer panzoom from zooming simultaneously with the inner map zoom.

## Technical Considerations

- **`clientWidth` vs `getBoundingClientRect`**: `clientWidth` returns CSS layout size (padding-box) without transforms. It doesn't include fractional pixels, but floor-rounding the DPR multiplication already discards fractions.
- **ResizeObserver**: Already watches the container, so it will fire when the container's layout size actually changes. No change needed there.
- **Performance**: The scale ratio calculation is trivial arithmetic, no performance impact.

## Acceptance Criteria

- [ ] Clicking on the map canvas at any outer panzoom level registers at the correct position
- [ ] Token dragging follows the cursor exactly
- [ ] FoW brush paints where the cursor is
- [ ] Resize handles on CanvasWindow work at correct position
- [ ] Canvas fills its container correctly at all zoom levels
- [ ] Wheel zoom on map zooms toward the cursor position
- [ ] No regression when outer panzoom scale = 1 (default)

## Implementation Order

1. Extract `canvasLocalCoords` utility
2. Fix canvas sizing (Fix 1)
3. Update all mouse handlers (Fix 2)
4. Add animation-end resize re-trigger (Fix 3)
5. Add `stopPropagation` to map wheel handler (Fix 4)
6. Test at various outer panzoom levels (0.5×, 1×, 2×)

## Sources

- `src/ui/tools/map-display/hooks/useCanvasRenderer.ts:160-168` — canvas sizing
- `src/ui/tools/map-display/hooks/useCanvasRenderer.ts:209-211` — wheel handler
- `src/ui/tools/map-display/hooks/useTokenRenderer.ts:443-461` — token interactions
- `src/ui/tools/map-display/hooks/useFowRenderer.ts:148-166` — FoW brush
- `src/ui/tools/map-display/MapDisplay.tsx:247-250, 387-390` — drop & cursor
- `src/ui/canvas/hooks/usePanZoom.ts:54` — outer panzoom wheel
- `src/ui/views/ViewTransition.module.css:15-24` — zoom animation
