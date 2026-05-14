---
title: "feat: Infinite Canvas Windowing System"
type: feat
status: active
date: 2026-05-14
origin: docs/brainstorms/2026-05-14-infinite-canvas-requirements.md
---

# feat: Infinite Canvas Windowing System

## Overview

Build the foundational infinite canvas workspace for Game Master Panel — a pannable, zoomable DOM container where all tools (Combat Tracker, Party Tracker, Soundboard, etc.) run as draggable, resizable windows. This is Phase 1 MVP's first deliverable; every other feature depends on it.

## Problem Statement

The DM needs a spatial workspace to arrange multiple tool windows freely during an RPG session. No fixed layout — the DM decides where each tool lives, and the layout persists per campaign. The canvas must feel responsive with 10+ windows, support intuitive pan/zoom navigation, and save/restore state reliably.

(see origin: `docs/brainstorms/2026-05-14-infinite-canvas-requirements.md`)

## Proposed Solution

Custom DOM-based infinite canvas using CSS `transform` for viewport manipulation. Windows are absolutely-positioned React components on the canvas. Key libraries:

- **`@panzoom/panzoom`** (~3.4 kB) — handles canvas pan/zoom via CSS transforms, touch/trackpad support, `excludeClass` to prevent pan from window interactions
- **`react-draggable`** (~8 kB) — title-bar drag with `handle`, `cancel`, and critical `scale` prop for correct delta calculation inside transformed container
- **Custom resize** (~60 lines) — pointer event handlers for 8-directional edge/corner resize with scale compensation. No library handles the `scale` prop correctly for this use case.

**Total added bundle: ~12 kB gzipped.**

### Why not React Flow / Pixi.js?

- **React Flow**: node-graph abstraction (edges, handles, connections) fights a windowing use case. Custom nodes with title bars, resize, and rich DOM content require fighting the library.
- **Pixi.js**: WebGL canvas can't render DOM content (Radix inputs, text editors, forms). Glassmorphism impossible inside canvas.
- **react-rnd**: Considered for combined drag+resize, but its resize implementation doesn't handle the `scale` prop correctly inside a transformed container.

(see origin: Key Decisions section)

## Technical Approach

### Architecture

```
src/ui/
├── canvas/
│   ├── InfiniteCanvas.tsx          — viewport container + panzoom setup
│   ├── InfiniteCanvas.module.css
│   ├── CanvasWindow.tsx            — wraps ToolWindow with drag/resize/z-order
│   ├── CanvasWindow.module.css
│   ├── CanvasBackground.tsx        — dot grid / line grid / solid
│   ├── CanvasBackground.module.css
│   ├── ContextMenu.tsx             — right-click tool spawner (Radix DropdownMenu)
│   ├── ContextMenu.module.css
│   ├── Minimap.tsx                 — schematic overview
│   ├── Minimap.module.css
│   ├── MinimizeTray.tsx            — tray of minimized window pills
│   ├── MinimizeTray.module.css
│   ├── hooks/
│   │   ├── useCanvasState.ts       — useReducer for all canvas state
│   │   ├── usePanZoom.ts           — panzoom lifecycle + transform ref
│   │   ├── useWindowDrag.ts        — react-draggable wrapper
│   │   ├── useWindowResize.ts      — custom 8-dir pointer event resize
│   │   ├── useViewportCulling.ts   — AABB visibility check
│   │   └── useCanvasPersistence.ts — SQLite autosave with debounce
│   ├── types.ts                    — WindowState, CanvasState, ToolType
│   └── index.ts
```

### State Shape

```typescript
// canvas/types.ts

type ToolType = 'combat-tracker' | 'party-tracker' | 'bestiary' | 'notepad'
  | 'map-display' | 'soundboard' | 'weather-generator' | 'time-tracker'
  | 'shop-generator' | 'dice-roller';

interface WindowState {
  id: string;              // unique instance ID (uuid)
  toolType: ToolType;
  x: number;               // canvas-space position
  y: number;
  width: number;
  height: number;
  zIndex: number;           // derived from array order
  pinned: boolean;          // always-on-top
  minimized: boolean;
  toolState: unknown;       // serialized tool-specific state (for culling hydration)
}

interface CanvasState {
  windows: WindowState[];
  background: 'solid' | 'dot-grid' | 'line-grid';
  // viewport transform stored in ref, not React state (performance)
}

// Viewport transform (stored in ref, not state)
interface ViewportTransform {
  x: number;
  y: number;
  scale: number;
}
```

### Implementation Phases

#### Phase 1: Canvas Shell + Pan/Zoom (Foundation)

**Files:** `InfiniteCanvas.tsx`, `usePanZoom.ts`, `CanvasBackground.tsx`, `types.ts`

- [ ] Install `@panzoom/panzoom` — `npm install @panzoom/panzoom`
- [ ] Create viewport container (`overflow: hidden`, `width: 100%`, `height: 100vh`)
- [ ] Create canvas inner element with `ref` for panzoom
- [ ] Initialize panzoom in `usePanZoom` hook:
  - `canvas: true` mode (pan from parent, not children)
  - `minScale: 0.1`, `maxScale: 3`
  - `contain: 'none'` (infinite)
  - `excludeClass: 'canvas-window'` (prevent pan from window areas)
  - Attach `zoomWithWheel` to parent
  - Expose `getTransform()` for viewport culling and minimap
- [ ] `CanvasBackground`: render dot grid or line grid using CSS `background-image: radial-gradient(...)` or `repeating-linear-gradient(...)` — pattern scales with zoom via transform
- [ ] Store viewport transform in `useRef` (NOT useState) — panzoom writes directly to `element.style.transform`, React never re-renders for pan/zoom

**Success:** Empty canvas that pans and zooms smoothly with configurable background.

#### Phase 2: Window System (Core)

**Files:** `CanvasWindow.tsx`, `useWindowDrag.ts`, `useWindowResize.ts`, `useCanvasState.ts`

- [ ] Install `react-draggable` — `npm install react-draggable`
- [ ] `useCanvasState` reducer with actions: `OPEN_WINDOW`, `CLOSE_WINDOW`, `MOVE_WINDOW`, `RESIZE_WINDOW`, `MINIMIZE_WINDOW`, `RESTORE_WINDOW`, `FOCUS_WINDOW`, `TOGGLE_PIN`, `UPDATE_TOOL_STATE`
- [ ] `CanvasWindow` wraps existing `ToolWindow` component with:
  - `Draggable` from react-draggable: `handle=".tool-window-titlebar"`, `cancel=".tool-window-content"`, `scale={currentScale}`, controlled `position` prop
  - Absolute positioning: `style={{ position: 'absolute', left: 0, top: 0, transform: translate(x, y) }}`
- [ ] `useWindowResize` — custom hook:
  - 8 invisible resize handles (CSS `position: absolute`, 6px wide/tall along edges + corners)
  - `onPointerDown` → capture → `onPointerMove` (delta / scale) → `onPointerUp` release
  - Per-tool minimum size from a config map: `{ 'combat-tracker': { minW: 400, minH: 300 }, ... }`
  - Cursors: `n-resize`, `ne-resize`, `e-resize`, etc.
- [ ] Z-order via array position in `windows[]`:
  - `FOCUS_WINDOW` moves window to end of array
  - Pinned windows always render after unpinned (separate groups)
  - z-index derived: `unpinnedBase + arrayIndex` for unpinned, `pinnedBase + arrayIndex` for pinned
  - Use token `--z-tool-window` (10) as unpinned base, `--z-tool-window-active` (20) as pinned base
- [ ] CSS `contain: layout style paint` on each window for isolation
- [ ] Animations (CSS transitions):
  - Open: `scale(0.95) → scale(1)` + `opacity 0 → 1`, 250ms
  - Close: reverse, 200ms, unmount after `transitionend`
  - Already partially implemented in `ToolWindow.module.css` (`.toolWindow` open animation)

**Success:** Can open, drag, resize, focus, pin, and close windows on the canvas.

#### Phase 3: Minimize, Context Menu, Minimap

**Files:** `MinimizeTray.tsx`, `ContextMenu.tsx`, `Minimap.tsx`

- [ ] `MinimizeTray` — viewport-fixed overlay (bottom-right, above minimap):
  - Renders pills for each minimized window: icon + truncated name
  - Horizontal layout, overflow scroll with arrow indicators
  - Click pill → `RESTORE_WINDOW` action (animate from tray position to stored x/y)
  - Pin state persists through minimize/restore (pin is a window property, not visibility state)
- [ ] `ContextMenu` — uses Radix `DropdownMenu` (already in deps):
  - Trigger: `onContextMenu` on canvas background (not on windows)
  - Positioned in **viewport-space** (overlay), not canvas-space — Radix handles edge flipping natively
  - Grouped by category with labels:
    - Combat Tools: Combat Tracker, Dice Roller
    - Party & NPCs: Party Tracker, Bestiary
    - World & Time: Weather Generator, Time Tracker, Shop Generator
    - Notes & Content: Notepad, Map Display
    - Audio/Visual: Soundboard
  - On select: `OPEN_WINDOW` with position = right-click coords converted to canvas-space (`(clientX - viewport.x) / scale`)
  - Cascade offset: +24px diagonal when new window overlaps an existing one at same position
- [ ] `Minimap` — viewport-fixed overlay (bottom-right corner):
  - Renders colored rectangles per window (color by tool type), scaled to fit all windows in minimap bounds
  - Viewport indicator: rectangle showing visible area
  - View-only, no interaction
  - Toggle visibility with keyboard shortcut (deferred) or settings
  - `useEffect` re-derives minimap on `windows[]` or viewport transform change (debounced 100ms)

**Success:** Full window management UX — open tools from context menu, minimize to tray, see overview on minimap.

#### Phase 4: Viewport Culling + Performance

**Files:** `useViewportCulling.ts`, updates to `InfiniteCanvas.tsx`

- [ ] `useViewportCulling` hook:
  - Listen to panzoom `panzoomchange` event → get `{ x, y, scale }`
  - For each window: AABB overlap check with 50% margin (generous to avoid pop-in)
  - Return `Set<string>` of visible window IDs
  - Use `React.startTransition` to batch visibility updates during rapid panning
  - Debounce unmount: only unmount after 200ms of being off-screen (avoid thrash during fast pan)
- [ ] Tool state serialization contract:
  - Each tool component receives `initialState: unknown` prop and calls `onStateChange(state: unknown)` when its state changes
  - Canvas manager stores latest tool state in `WindowState.toolState` (in-memory, synchronous)
  - On unmount (culling): state is already in memory store — no last-second save needed
  - On re-mount: pass `toolState` back as `initialState`
  - SQLite persistence uses the debounced autosave (writes full canvas state including all toolStates)
- [ ] CSS `content-visibility: auto` on window content areas as additional browser-level optimization
- [ ] Performance validation: measure FPS during rapid pan with 15 windows using Chrome DevTools Performance tab

**Success:** Smooth 60fps pan/zoom with 15+ windows. No state loss when windows are culled.

#### Phase 5: SQLite Persistence

**Files:** `useCanvasPersistence.ts`, Electron IPC bridge

- [ ] Define SQLite schema for canvas state:

```sql
CREATE TABLE canvas_layouts (
  campaign_id TEXT PRIMARY KEY,
  viewport_x REAL NOT NULL DEFAULT 0,
  viewport_y REAL NOT NULL DEFAULT 0,
  viewport_scale REAL NOT NULL DEFAULT 1,
  background TEXT NOT NULL DEFAULT 'solid',
  updated_at TEXT NOT NULL
);

CREATE TABLE canvas_windows (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL REFERENCES canvas_layouts(campaign_id),
  tool_type TEXT NOT NULL,
  x REAL NOT NULL,
  y REAL NOT NULL,
  width REAL NOT NULL,
  height REAL NOT NULL,
  z_order INTEGER NOT NULL,
  pinned INTEGER NOT NULL DEFAULT 0,
  minimized INTEGER NOT NULL DEFAULT 0,
  tool_state TEXT,  -- JSON blob
  UNIQUE(campaign_id, id)
);
```

- [ ] Electron IPC bridge (does not exist yet — must be built):
  - `main.ts`: register `ipcMain.handle('canvas:save', ...)` and `ipcMain.handle('canvas:load', ...)`
  - Renderer: `window.electronAPI.canvasSave(state)` / `window.electronAPI.canvasLoad(campaignId)`
  - Use `contextBridge.exposeInMainWorld` for secure IPC
- [ ] `useCanvasPersistence` hook:
  - On canvas state change: debounce 500ms → serialize → IPC `canvas:save`
  - On campaign load: IPC `canvas:load` → hydrate `useCanvasState`
  - On app close (`beforeunload`): flush pending save immediately
- [ ] Install SQLite: `npm install better-sqlite3` + `npm install -D @types/better-sqlite3`

**Success:** Canvas layout persists perfectly across app restarts. Load time < 100ms for 20 windows.

## System-Wide Impact

### Interaction Graph

- `InfiniteCanvas` → mounts `CanvasWindow` instances → each mounts a tool component (Combat Tracker, etc.)
- Panzoom writes to DOM directly (`element.style.transform`) — bypasses React render cycle
- `useCanvasState` reducer is the single source of truth → dispatched by drag/resize/focus/open/close actions → triggers re-render of affected windows only
- `useCanvasPersistence` subscribes to state changes → debounced IPC to main process → SQLite write
- Tool components call `onStateChange` → updates `toolState` in memory → included in next SQLite write

### Error Propagation

- SQLite write failure: log error, retry once, show toast notification. Canvas continues working from memory state.
- Panzoom initialization failure: fatal — canvas is unusable. Show error overlay with reload option.
- Window component crash: React Error Boundary per window. Crashed window shows error state, other windows unaffected.

### State Lifecycle Risks

- **Culling + unsaved tool state**: Mitigated by synchronous in-memory state (toolState always current). SQLite is eventual consistency via debounce.
- **App crash before flush**: Debounced save means up to 500ms of state loss. Acceptable for window positions. Tool content (e.g., Notepad text) should have its own persistence layer.
- **Campaign switch without save flush**: Must flush pending save before loading new campaign.

## Acceptance Criteria

### Functional Requirements

- [ ] Canvas pans with middle-click drag or scroll-drag, zooms with mouse wheel (0.1x–3x)
- [ ] Three background options: solid dark, dot grid, line grid
- [ ] Windows open at right-click position via categorized context menu
- [ ] Windows drag by title bar, resize by 8 edge/corner handles
- [ ] Per-tool minimum sizes enforced during resize
- [ ] Click window → brings to front (z-order); pin toggle keeps window above all unpinned
- [ ] Multiple instances of same tool open independently
- [ ] Minimize → pill in tray; click pill → restore to previous position/size; pin state preserved
- [ ] Minimap shows schematic rectangles + viewport indicator; view-only
- [ ] Close animation completes before DOM removal
- [ ] Closing a window with dirty tool state shows confirmation dialog
- [ ] Canvas state auto-saved to SQLite per campaign with 500ms debounce
- [ ] Campaign load restores all windows, positions, zoom, background from SQLite
- [ ] New windows cascade +24px diagonally when overlapping existing window at same position

### Non-Functional Requirements

- [ ] 60fps pan/zoom with 15 open windows
- [ ] Canvas state load < 100ms for 20 windows
- [ ] Total added bundle < 15 kB gzipped
- [ ] All windows use CSS `contain: layout style paint`

### Quality Gates

- [ ] React Error Boundary on each window prevents cascade failures
- [ ] No React state updates during active pan/zoom (transform in ref only)
- [ ] Resize handles respect scale factor at all zoom levels

## Dependencies & Prerequisites

- **Design system must be implemented first** — tokens.css exists but components (ToolWindow) need to be finalized (see origin: Dependencies section)
- **SQLite + IPC bridge does not exist yet** — must be built as part of Phase 5 (or earlier as shared infrastructure)
- **No state management library** — plan uses `useReducer` at canvas level. If prop-drilling becomes painful with deeply nested tool content, consider `useContext` or Zustand. Evaluate after Phase 2.
- **Fonts must be bundled** — Exo 2, Michroma already specified in design system

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Panzoom `excludeClass` doesn't prevent pan from Radix dropdowns inside windows | Medium | High (broken UX) | Test early in Phase 1. Fallback: use panzoom `exclude` option with explicit element refs |
| react-draggable `scale` prop not accurate at extreme zoom | Low | Medium | Test at 0.1x and 3x zoom. Fallback: custom drag with pointer event delta / scale |
| 15+ windows cause layout thrash during resize | Medium | Medium | CSS `contain` isolates recalc. Profile early. |
| SQLite IPC overhead on rapid saves | Low | Low | Debounce handles this. Batch writes if needed. |
| Glassmorphism `backdrop-filter: blur()` perf with many overlapping windows | Medium | Medium | Test with 10+ overlapping windows on target hardware. Fallback: reduce blur radius or disable for non-focused windows |

## Alternative Approaches Considered

| Approach | Why Rejected |
|----------|-------------|
| React Flow | Node-graph abstraction (edges, handles) fights windowing. Custom nodes still need drag/resize logic. Overhead without benefit. |
| Pixi.js / WebGL | Can't render DOM content in windows. Would need hybrid DOM+canvas approach — massive complexity. |
| react-rnd (drag+resize combo) | Resize doesn't handle `scale` prop correctly inside transformed container. Would need forking. |
| Zustand for state | Premature for 10-20 windows. `useReducer` is simpler and sufficient. Re-evaluate if tool components need direct state access. |
| d3-zoom | Rich API but fights React for DOM ownership (`selection.on()` vs React events). @panzoom/panzoom is lighter and conflict-free. |

## Scope Boundaries (Explicit Exclusions)

- No undo/redo for window operations (move, resize, close)
- No window snapping, tiling, or alignment guides (per R65)
- No maximize/fullscreen windows (per R67)
- No drag-and-drop between windows
- No multi-select / group-move of windows
- No keyboard shortcuts for window management (deferred — architecture should not preclude it)
- No interactive minimap (click-to-navigate) — view-only

## Sources & References

### Origin

- **Origin document:** [docs/brainstorms/2026-05-14-infinite-canvas-requirements.md](docs/brainstorms/2026-05-14-infinite-canvas-requirements.md) — Custom DOM canvas decision, viewport culling, minimize-to-tray, grouped context menu, per-tool min sizes
- **Main requirements:** [docs/brainstorms/2026-05-13-game-master-panel-requirements.md](docs/brainstorms/2026-05-13-game-master-panel-requirements.md) — R5-R9, R63-R67
- **Design system:** [docs/brainstorms/2026-05-14-design-system-requirements.md](docs/brainstorms/2026-05-14-design-system-requirements.md) — glassmorphism tokens, CSS Modules, animation durations

### Internal References

- `src/ui/components/ToolWindow/ToolWindow.tsx` — existing window shell (presentational, no drag/resize)
- `src/ui/styles/tokens.css` — z-index tokens (`--z-tool-window: 10`, `--z-tool-window-active: 20`), animation durations, glassmorphism variables
- `src/ui/index.css` — `#root` is `100vh` flex column, `overflow: hidden` on body

### External References

- @panzoom/panzoom: https://github.com/timmywil/panzoom — CSS-transform pan/zoom, ~3.4 kB
- react-draggable: https://github.com/react-grid-layout/react-draggable — drag with handle/cancel/scale props, ~8 kB
