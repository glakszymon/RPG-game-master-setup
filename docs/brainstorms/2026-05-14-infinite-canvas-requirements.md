---
date: 2026-05-14
topic: infinite-canvas
---

# Infinite Canvas — Core Workspace

## Problem Frame

The infinite canvas is the foundational UI layer of Game Master Panel. Every tool (Combat Tracker, Party Tracker, Soundboard, etc.) runs inside a window on this canvas. The canvas must support free-form window placement with pan/zoom navigation, performant rendering with 10+ simultaneous windows, and persistent layout state per campaign. Getting this right is a prerequisite for all other features.

## Requirements

### Canvas core

- R-C1. Custom HTML/CSS/React implementation — no canvas/WebGL library. The canvas is a pannable, zoomable DOM container with CSS `transform` for viewport manipulation.
- R-C2. Pan/zoom via a lightweight helper library (panzoom or d3-zoom — decision deferred to planning). Must support mouse wheel zoom, middle-click/scroll drag pan, and trackpad gestures.
- R-C3. Configurable canvas background: solid dark (`--bg-base`), dot grid, or line grid. Stored per campaign.
- R-C4. Canvas has no boundaries — infinite scrolling in all directions.

### Window system

- R-W1. Windows are React components with absolute positioning on the canvas, rendered as glassmorphism surfaces per the design system (R16-R18 of design-system-requirements).
- R-W2. Window title bar: tool icon + name on left, minimize and close buttons on right.
- R-W3. Drag windows by title bar. Drag on canvas background pans the viewport.
- R-W4. Resize via edge and corner handles (8-directional, like OS windows).
- R-W5. Per-tool minimum size constraints (e.g. Combat Tracker min 400x300). No maximum size. No snap-to-grid.
- R-W6. Z-order: clicking a window brings it to front. Pin option (always-on-top) per window — pinned windows stay above all unpinned regardless of click order.
- R-W7. Multiple instances of the same tool allowed (e.g. two Notepads side by side). Each instance has independent state.
- R-W8. No maximize/fullscreen — only manual resize (per R67).

### Minimize behavior

- R-M1. Minimized windows collapse into a tray area anchored near the minimap corner (viewport-fixed, not canvas-positioned).
- R-M2. Minimized windows display as small labeled pills (tool icon + name). Click to restore to previous position and size.
- R-M3. Tray scrolls or wraps if many windows are minimized.

### Minimap

- R-MM1. Minimap in a fixed corner of the viewport (bottom-right recommended) showing schematic rectangles for each window with color-coding by tool type.
- R-MM2. Viewport indicator rectangle showing current visible area.
- R-MM3. View-only — no click interaction. Navigation only through canvas pan/zoom.
- R-MM4. Minimap can be toggled visible/hidden.

### Context menu

- R-CM1. Right-click on canvas background opens a context menu with tools grouped by category:
  - **Combat Tools**: Combat Tracker, Dice Roller
  - **Party & NPCs**: Party Tracker, Bestiary
  - **World & Time**: Weather Generator, Time Tracker, Shop Generator
  - **Notes & Content**: Notepad, Map Display
  - **Audio/Visual**: Soundboard
- R-CM2. Categories are collapsible/expandable. Clicking a tool opens a new window instance at the right-click position.
- R-CM3. Context menu styled with glassmorphism per design system.

### Animations

- R-A1. Window open: scale from 0.95 + fade in (CSS transition, ~250ms).
- R-A2. Window close: scale to 0.95 + fade out (~200ms). Remove from DOM after animation completes.
- R-A3. Window minimize: animate shrinking toward the tray area (~250ms).
- R-A4. Window restore from minimize: animate expanding from tray to restored position (~250ms).
- R-A5. All animations use CSS transitions per design system (R23-R27) — no spring physics, no Framer Motion.

### Performance

- R-P1. Viewport culling: windows fully outside the visible viewport are unmounted from the DOM.
- R-P2. Critical window state (form data, scroll position, playback state) is persisted to store before unmount and restored on re-mount, so culling is invisible to the user.
- R-P3. Target: smooth 60fps pan/zoom with 15+ windows on canvas (though most will be culled).

### Persistence

- R-S1. Canvas state saved to SQLite per campaign: window positions, sizes, open/closed/minimized state, z-order, pin state, zoom level, viewport position, background setting.
- R-S2. Autosave with debounce (~500ms) on every discrete change (window move, resize, close, open, minimize).
- R-S3. On campaign load, restore full canvas state from last save.

## Scope Boundaries

- No window snapping, tiling, or alignment guides — fully free-form (per R65)
- No maximize/fullscreen for windows (per R67)
- No drag-and-drop between windows in this scope (tool-specific feature)
- No multi-select / group-move of windows
- No canvas "pages" or tabs — one canvas per campaign
- Minimap is view-only, not interactive

## Success Criteria

- DM can open 10+ tool windows, arrange them freely, and navigate the canvas without lag
- Canvas layout persists perfectly across application restarts
- Windows feel native and responsive (open/close/minimize animations are smooth)
- Glassmorphism styling is consistent across all windows
- Multiple instances of the same tool work independently

## Key Decisions

- **Custom DOM implementation over React Flow/Pixi.js**: Windows contain rich DOM content (Radix components, text editors, forms). React Flow's node-graph abstraction fights the windowing use case. Pixi.js can't render DOM content. A custom approach gives full control with zero abstraction mismatch.
- **Lightweight pan/zoom library**: Avoids reinventing transform math, touch gestures, and momentum — delegate to panzoom or d3-zoom.
- **Viewport culling for performance**: Unmount off-screen windows. Cheaper than keeping all mounted. Requires state hydration but aligns with SQLite persistence.
- **Minimize to tray (not in-place)**: Keeps canvas clean; minimized windows are always accessible regardless of viewport position.
- **Grouped context menu**: R69 in main requirements updated — categories scale better with 15+ tools.
- **Edge/corner resize handles**: Familiar OS-like interaction; worth the implementation cost for usability.
- **Per-tool minimum sizes**: Prevents unusable tiny windows while allowing full freedom otherwise.

## Dependencies / Assumptions

- Design system tokens and glassmorphism styles must exist before building windows (design-system-requirements)
- SQLite schema for campaign data must accommodate canvas state (layout JSON or normalized tables)
- Pan/zoom library choice (panzoom vs d3-zoom) needs evaluation during planning

## Outstanding Questions

### Deferred to Planning

- [Affects R-C2][Needs research] panzoom vs d3-zoom — evaluate bundle size, API ergonomics, React compatibility, touch support
- [Affects R-P1][Technical] Viewport culling implementation: IntersectionObserver vs manual bounds checking against transform state
- [Affects R-S1][Technical] Canvas state storage format: single JSON blob per campaign vs normalized tables for windows
- [Affects R-W4][Technical] Resize handle implementation: custom pointer event handlers vs lightweight library (re-resizable)
- [Affects R-W3][Technical] Drag implementation: custom pointer events vs react-draggable (for title bar drag only)
- [Affects R-CM1][Technical] Context menu category assignment — should tool-to-category mapping be hardcoded or configurable?
- [Affects R-P2][Technical] State hydration strategy for culled windows — which state needs persisting per tool type?

## Next Steps

→ `/ce:plan` for structured implementation planning (no blocking questions remain)
