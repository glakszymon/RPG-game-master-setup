---
date: 2026-05-14
topic: focus-presets
---

# Focus Presets

## Problem Frame

During a TTRPG session, the Game Master cycles between distinct contexts (combat, exploration, social encounters, prep) that each benefit from a different set of tool windows arranged on the infinite canvas. Currently the GM must manually open, close, and reposition windows each time the context shifts. Focus Presets let the GM save named layout snapshots and restore them instantly, reducing friction during live play.

## Requirements

- R1. A preset captures: which toolTypes are open, each window's position and size, and the viewport transform (pan + zoom level)
- R2. Presets do NOT capture internal tool state (toolState) — windows open with current/default state
- R3. Activating a preset is **additive** by default: opens the preset's windows at saved positions without closing existing windows
- R4. A secondary "clean activate" action closes all windows not in the preset, then restores the preset layout
- R5. Activation animates: smooth viewport pan/zoom to saved transform (~200-300ms CSS transition) with fade-in for newly opened windows
- R6. A special "Last Setup" preset is automatically saved whenever the canvas state changes (leveraging existing 500ms debounce). It is always available for restore but cannot be renamed or deleted
- R7. Users can save the current layout as a named preset (user-provided name)
- R8. No hard limit on number of user-created presets
- R9. Users can rename, overwrite (re-save current layout), and delete presets
- R10. Presets are accessed via a persistent small dropdown/toolbar fixed to the viewport edge (not inside the canvas)
- R11. Keyboard shortcuts for activating presets (e.g. Ctrl+1 through Ctrl+9 for first 9)
- R12. Presets are scoped per campaign (same as canvas state persistence)

## Success Criteria

- GM can switch from "exploration" to "combat" layout in under 2 seconds (one click or shortcut)
- No loss of open windows when using additive activation
- "Last Setup" always reflects the most recent manual arrangement
- Presets survive app restart (persisted to SQLite)

## Scope Boundaries

- No preset sharing between campaigns
- No preset import/export
- No auto-detection of "which context you're in" — purely manual activation
- No grouping or categorization of presets (flat list)
- No multi-select windows to save a subset — always saves entire current layout
- Toolbar design details (exact position, icon) deferred to planning/implementation

## Key Decisions

- **Additive by default**: Chosen over full-replace to avoid accidental loss of ad-hoc windows opened during play. Clean activate available as explicit secondary action.
- **No toolState in presets**: Keeps presets lightweight and avoids confusing state collisions (e.g. restoring a stale combat tracker mid-fight). Windows use whatever state they currently have or defaults.
- **Persistent toolbar over context menu**: Presets need to be instantly accessible during live play — burying them in a right-click menu adds friction.
- **Viewport included in snapshot**: The viewport position is part of the spatial context — combat windows might be arranged in a different canvas region than exploration windows.
- **No limit on presets**: Power users may want many contextual layouts; storage cost is negligible.

## Dependencies / Assumptions

- Viewport transform (pan/zoom) must be included in persisted state. Current `CanvasState` type does not include it yet (noted in infinite-canvas requirements R-S1 but not yet implemented in types).
- CSS transitions are sufficient for the animation (per design system constraint R27 — no Framer Motion).

## Outstanding Questions

### Resolve Before Planning

_(none)_

### Deferred to Planning

- [Affects R10][Needs research] Exact toolbar placement and component design — top-right? bottom? How does it interact with minimap and minimize tray?
- [Affects R5][Technical] How to animate viewport pan/zoom smoothly with panzoom library — does it support animated transitions or do we need to implement manual interpolation?
- [Affects R6][Technical] Storage format for presets in SQLite — separate table or JSON blob alongside canvas state?
- [Affects R11][Technical] Keyboard shortcut conflicts with existing tinykeys bindings

## Next Steps

→ `/ce:plan` for structured implementation planning
