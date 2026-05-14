---
title: "feat: Focus Presets - Save and Restore Canvas Layouts"
type: feat
status: active
date: 2026-05-14
origin: docs/brainstorms/2026-05-14-focus-presets-requirements.md
---

# feat: Focus Presets - Save and Restore Canvas Layouts

## Overview

Focus Presets allow the Game Master to save named snapshots of their canvas layout (open windows, positions, sizes, viewport pan/zoom) and restore them instantly during live play. This enables fast context-switching between session phases (combat, exploration, social) without manually rearranging windows each time.

## Problem Statement / Motivation

During a TTRPG session, the GM cycles between contexts that each benefit from different tool windows. Currently switching context requires manually opening/closing/repositioning windows — friction that breaks flow during live play. (see origin: docs/brainstorms/2026-05-14-focus-presets-requirements.md)

## Proposed Solution

A preset system with:
- Named snapshots capturing window geometry + viewport transform
- Additive activation (opens preset windows without closing existing ones)
- Optional "clean activate" (closes everything not in preset first)
- Animated viewport transition + window fade-in
- Auto-saved "Last Setup" preset
- Persistent toolbar UI for instant access
- Keyboard shortcuts (Ctrl+1–9) for quick activation

## Technical Approach

### Architecture

```
FocusPreset type
    ├── name: string
    ├── windows: Array<{ toolType, x, y, width, height, pinned, minimized }>
    ├── viewport: ViewportTransform { x, y, scale }
    └── isAutoSave: boolean (for "Last Setup")

Storage: new `focus_presets` table in SQLite
    campaign_id TEXT, preset_id TEXT, name TEXT, data_json TEXT, updated_at TEXT
    PK: (campaign_id, preset_id)

IPC channels:
    presets:save, presets:load-all, presets:delete, presets:rename
```

### Key Technical Decisions

1. **Separate table over embedding in CanvasState** — presets are independent entities; embedding them would bloat every autosave and complicate the debounce logic.

2. **Additive restore via selective OPEN_WINDOW dispatches** — instead of LOAD_STATE (which replaces everything), iterate preset windows and open only those not already present. For "clean activate", close non-preset windows first.

3. **Animated viewport via panzoom's built-in `animate: true` option** — the `@panzoom/panzoom` library supports `{ animate: true }` on pan/zoom calls which uses CSS transitions. Need to expose this in `usePanZoom.ts`.

4. **Last Setup uses same debounce as canvas persistence** — hook into existing `useCanvasPersistence` save cycle to also update the auto-preset.

### Implementation Phases

#### Phase 1: Data Layer & Types

- Define `FocusPreset` interface in `src/ui/canvas/types.ts`
- Add `focus_presets` table creation in `database.ts` `initializeDatabase()`
- Add CRUD functions: `savePreset`, `loadPresets`, `deletePreset`, `renamePreset`
- Add IPC handlers in `main.ts` and expose in `preload.ts`
- Add type declarations in `electron.d.ts`

Files:
- `src/ui/canvas/types.ts` — add `FocusPreset` interface
- `src/electron/database.ts` — add table + CRUD
- `src/electron/main.ts` — add IPC handlers
- `src/electron/preload.ts` — expose channels
- `src/ui/electron.d.ts` — type declarations

#### Phase 2: State Management & Hook

- Create `src/ui/canvas/hooks/useFocusPresets.ts`:
  - Load all presets on mount
  - `savePreset(name)` — captures current windows + viewport
  - `activatePreset(id, clean?: boolean)` — additive or clean restore
  - `deletePreset(id)`, `renamePreset(id, name)`, `overwritePreset(id)`
  - Auto-save "Last Setup" on canvas state changes (piggyback on existing debounce)
- Extend `usePanZoom.ts`:
  - Add `panTo(x, y, scale, animate?: boolean)` method that uses panzoom's `{ animate: true }`
  - Expose in return value

Files:
- `src/ui/canvas/hooks/useFocusPresets.ts` (new)
- `src/ui/canvas/hooks/usePanZoom.ts` — add `panTo`

#### Phase 3: UI — Preset Toolbar

- Create `src/ui/canvas/PresetToolbar.tsx`:
  - Fixed-position overlay (same pattern as Minimap/MinimizeTray)
  - Compact dropdown showing preset list
  - Each preset: click = additive activate, secondary action = clean activate
  - "Save current as..." button → name input
  - Overflow menu per preset: rename, overwrite, delete
  - "Last Setup" always first, non-deletable, non-renamable
- Create `src/ui/canvas/PresetToolbar.module.css`
- Render in `InfiniteCanvas.tsx` as sibling to Minimap/MinimizeTray

Files:
- `src/ui/canvas/PresetToolbar.tsx` (new)
- `src/ui/canvas/PresetToolbar.module.css` (new)
- `src/ui/canvas/InfiniteCanvas.tsx` — render PresetToolbar

#### Phase 4: Keyboard Shortcuts & Animation

- Add `preset1`–`preset9` entries to `shortcuts.ts` (`$mod+Digit1` through `$mod+Digit9`)
- Wire handlers in `InfiniteCanvas.tsx` → activate nth preset
- Implement CSS transition for viewport animation (~250ms ease-out)
- Add fade-in class for newly opened windows (~200ms)

Files:
- `src/ui/canvas/shortcuts.ts` — add preset shortcuts
- `src/ui/canvas/hooks/useKeyboardShortcuts.ts` — handle new IDs
- `src/ui/canvas/InfiniteCanvas.tsx` — wire handlers
- `src/ui/canvas/CanvasWindow.module.css` — fade-in animation class

## System-Wide Impact

- **Interaction graph**: Save preset → IPC → SQLite write. Activate preset → multiple OPEN_WINDOW dispatches → triggers existing persistence debounce → auto-saves new combined state. This means "Last Setup" auto-updates after activation settles.
- **Error propagation**: SQLite write failure should show toast notification but not crash. Preset load failure on startup → empty preset list (graceful degradation).
- **State lifecycle risks**: "Clean activate" closes windows whose toolState may have unsaved changes. Mitigation: toolState is already auto-persisted per-window via existing debounce — no data loss risk.
- **API surface parity**: New IPC channels follow exact same pattern as existing `canvas:save`/`canvas:load`.

## Acceptance Criteria

- [ ] Can save current layout as a named preset (captures window positions/sizes + viewport)
- [ ] Can activate a preset additively (opens preset windows without closing others)
- [ ] Can "clean activate" a preset (closes non-preset windows, then restores)
- [ ] Viewport smoothly animates to saved pan/zoom position (~250ms)
- [ ] Newly opened windows fade in (~200ms)
- [ ] "Last Setup" auto-preset always reflects most recent manual arrangement
- [ ] "Last Setup" cannot be renamed or deleted
- [ ] Can rename, overwrite, and delete user presets
- [ ] Presets persist across app restarts (SQLite)
- [ ] Presets are scoped per campaign
- [ ] Ctrl+1 through Ctrl+9 activate first 9 presets
- [ ] Preset toolbar is always visible as fixed overlay
- [ ] No toolState captured in presets — windows open with current/default state

## Dependencies & Prerequisites

- Viewport transform (`ViewportTransform`) is already defined in types but not yet persisted in `CanvasState`. This plan does NOT depend on that — presets store viewport independently. However, the "Last Setup" auto-save needs to read current viewport from `usePanZoom`'s `getTransform()`.

## Sources & References

### Origin

- **Origin document:** [docs/brainstorms/2026-05-14-focus-presets-requirements.md](docs/brainstorms/2026-05-14-focus-presets-requirements.md) — Key decisions: additive activation by default, no toolState in presets, persistent toolbar UI, viewport included in snapshot, no preset limit.

### Internal References

- Canvas state types: `src/ui/canvas/types.ts:17-42`
- Persistence hook: `src/ui/canvas/hooks/useCanvasPersistence.ts`
- Database layer: `src/electron/database.ts:37-82`
- Panzoom hook: `src/ui/canvas/hooks/usePanZoom.ts`
- Shortcuts registry: `src/ui/canvas/shortcuts.ts`
- Fixed overlay pattern: `src/ui/canvas/Minimap.tsx`, `src/ui/canvas/MinimizeTray.tsx`
- Canvas reducer: `src/ui/canvas/hooks/useCanvasState.ts:14-191`
