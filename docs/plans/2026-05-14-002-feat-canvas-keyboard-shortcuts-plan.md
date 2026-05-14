---
title: "feat: Canvas Keyboard Shortcuts System"
type: feat
status: active
date: 2026-05-14
---

# feat: Canvas Keyboard Shortcuts System

## Overview

Add an extensible keyboard shortcuts system to the infinite canvas. Covers zoom controls, undo/redo, escape-to-close, space+drag pan, and a help overlay (Ctrl+?). Designed for easy addition of new shortcuts without touching core logic.

## Problem Statement

The canvas currently has zero keyboard interaction. DMs expect standard shortcuts (Ctrl+Z, Ctrl+=/-, Escape) for efficient workflow. The system must be extensible — as new tools arrive, each may register its own shortcuts.

## Proposed Solution

Use **`tinykeys`** (~600 bytes gzipped) — a minimal, dependency-free keyboard shortcut library that maps key combos to callbacks. It handles modifier detection, key sequences, and event cleanup.

Architecture: a centralized **shortcut registry** pattern where shortcuts are declared as data (not scattered event listeners), making the system trivially extensible.

### Why tinykeys?

| Library | Size | API Style | Verdict |
|---------|------|-----------|---------|
| tinykeys | ~600B | Object map → callbacks | Best fit — declarative, tiny, no React coupling |
| react-hotkeys-hook | ~3 kB | Hook per shortcut | More React-idiomatic but scattered declarations |
| mousetrap | ~4 kB | Imperative `.bind()` | Older, larger, no tree-shaking |
| hotkeys-js | ~3 kB | Imperative | Similar to mousetrap |

tinykeys wins on size and declarative API — a single object describes all shortcuts, which is exactly the extensibility pattern we need.

## Technical Approach

### Architecture

```
src/ui/canvas/
├── hooks/
│   ├── useKeyboardShortcuts.ts   — main hook: registers all shortcuts via tinykeys
│   ├── useUndoRedo.ts            — undo/redo state machine (history stack)
│   └── useSpacePan.ts            — space+drag pan override
├── ShortcutsOverlay.tsx          — Ctrl+? help dialog
├── ShortcutsOverlay.module.css
├── shortcuts.ts                  — shortcut registry (data declarations)
└── types.ts                      — add ShortcutDefinition type
```

### Shortcut Registry Pattern

```typescript
// canvas/shortcuts.ts

export interface ShortcutDefinition {
  keys: string;           // tinykeys format: "$mod+z", "Escape", etc.
  label: string;          // Human-readable: "Undo"
  category: string;       // "Navigation" | "Editing" | "Window" | "General"
  description: string;    // Shown in help overlay
}

/**
 * Central registry — add a new shortcut by adding one entry here.
 * The handler is wired in useKeyboardShortcuts by matching `id`.
 */
export const SHORTCUTS: Record<string, ShortcutDefinition> = {
  undo:       { keys: '$mod+z',       label: 'Undo',           category: 'Editing',    description: 'Cofnij ostatnią akcję' },
  redo:       { keys: '$mod+y',       label: 'Redo',           category: 'Editing',    description: 'Ponów cofniętą akcję' },
  zoomIn:     { keys: '$mod+=',       label: 'Zoom In',        category: 'Navigation', description: 'Przybliż canvas' },
  zoomOut:    { keys: '$mod+-',       label: 'Zoom Out',       category: 'Navigation', description: 'Oddal canvas' },
  zoomReset:  { keys: '$mod+0',       label: 'Reset Zoom',     category: 'Navigation', description: 'Resetuj zoom do 100%' },
  escape:     { keys: 'Escape',       label: 'Close/Cancel',   category: 'Window',     description: 'Zamknij aktywne okno lub dialog' },
  helpPanel:  { keys: '$mod+Shift+/', label: 'Show Shortcuts', category: 'General',    description: 'Pokaż listę skrótów' },
};
```

`$mod` is tinykeys' cross-platform modifier (Ctrl on Windows/Linux, Cmd on Mac).

### useKeyboardShortcuts Hook

```typescript
// canvas/hooks/useKeyboardShortcuts.ts
import tinykeys from 'tinykeys';
import { SHORTCUTS } from '../shortcuts';

export function useKeyboardShortcuts(handlers: Record<string, () => void>) {
  useEffect(() => {
    const bindings: Record<string, (e: KeyboardEvent) => void> = {};

    for (const [id, def] of Object.entries(SHORTCUTS)) {
      if (handlers[id]) {
        bindings[def.keys] = (e) => {
          e.preventDefault();
          handlers[id]();
        };
      }
    }

    const unsubscribe = tinykeys(window, bindings);
    return unsubscribe;
  }, [handlers]);
}
```

Usage in `InfiniteCanvas.tsx`:

```typescript
useKeyboardShortcuts({
  undo: () => undo(),
  redo: () => redo(),
  zoomIn: () => panzoomRef.current?.zoomIn(),
  zoomOut: () => panzoomRef.current?.zoomOut(),
  zoomReset: () => resetZoom(),
  escape: () => closeTopmostWindow(),
  helpPanel: () => setShowShortcuts(true),
});
```

### useUndoRedo Hook

```typescript
// canvas/hooks/useUndoRedo.ts

interface UndoRedoState<T> {
  past: T[];
  present: T;
  future: T[];
}

// Wraps canvas reducer — intercepts dispatches to build history stack.
// Debounces rapid moves (drag) into single undo entries.
// Max history: 50 entries.
```

Strategy: wraps `useCanvasState` dispatch. Each action (except `MOVE_WINDOW` during active drag, `UPDATE_TOOL_STATE`) pushes previous state to `past[]`. Undo pops from `past`, pushes to `future`. Redo reverses.

**Drag coalescing:** During a drag operation, only the final `MOVE_WINDOW` (on pointer up) is recorded as an undo entry — intermediate positions are not.

### useSpacePan Hook

```typescript
// canvas/hooks/useSpacePan.ts

// On Space keydown: set cursor to 'grab', enable panzoom even over windows
// On Space keyup: restore cursor, disable panzoom-over-windows
// On pointerdown while space held: cursor = 'grabbing'
// On pointerup: cursor = 'grab'
```

Implementation: temporarily remove `excludeClass: 'canvas-window'` from panzoom config while Space is held (or add a transparent overlay that captures pan events above windows).

### ShortcutsOverlay Component

Modal dialog (Radix Dialog) showing all registered shortcuts grouped by category. Reads from `SHORTCUTS` registry — auto-updates when new shortcuts are added.

Styled with glassmorphism per design system. Two-column layout: shortcut key badge + description.

## Implementation Phases

### Phase 1: Core Infrastructure

**Files:** `shortcuts.ts`, `useKeyboardShortcuts.ts`, install tinykeys

- [ ] `npm install tinykeys`
- [ ] Create `shortcuts.ts` with `ShortcutDefinition` type and `SHORTCUTS` registry
- [ ] Create `useKeyboardShortcuts.ts` hook that maps registry to tinykeys bindings
- [ ] Wire zoom shortcuts to panzoom (`zoomIn`, `zoomOut`, `zoomReset`)
- [ ] Wire `Escape` to close topmost (highest z-index, non-pinned) window
- [ ] Prevent browser default for Ctrl+= / Ctrl+- / Ctrl+0 (native zoom)

**Success:** Zoom and Escape shortcuts work on the canvas.

### Phase 2: Undo/Redo

**Files:** `useUndoRedo.ts`, update `useCanvasState.ts`

- [ ] Implement `useUndoRedo` wrapper around canvas reducer
- [ ] History stack with max 50 entries
- [ ] Drag coalescing: record only final position per drag operation
- [ ] Exclude `UPDATE_TOOL_STATE` from undo (tool-specific undo is out of scope)
- [ ] Wire Ctrl+Z / Ctrl+Y to undo/redo
- [ ] Disable undo/redo when history is empty (no-op, no error)

**Success:** Can undo/redo window open, close, move, resize, minimize, pin operations.

### Phase 3: Space+Drag Pan

**Files:** `useSpacePan.ts`, update `InfiniteCanvas.tsx`

- [ ] Track Space key state (down/up) without triggering when focused on input/textarea
- [ ] While Space held: change cursor to `grab`, allow pan from anywhere (including over windows)
- [ ] On pointerdown while Space: cursor `grabbing`
- [ ] On Space release: restore normal cursor and behavior
- [ ] Ensure Space doesn't fire if user is typing in a tool window input

**Success:** Space+drag pans canvas even when pointer is over a window.

### Phase 4: Help Overlay

**Files:** `ShortcutsOverlay.tsx`, `ShortcutsOverlay.module.css`

- [ ] Radix Dialog triggered by Ctrl+? (Ctrl+Shift+/)
- [ ] Read all entries from `SHORTCUTS` registry, group by `category`
- [ ] Render key badges (styled `<kbd>` elements) + descriptions
- [ ] Glassmorphism styling consistent with other dialogs
- [ ] Close with Escape or click outside

**Success:** Ctrl+? opens overlay showing all registered shortcuts.

## Extensibility

Adding a new shortcut requires:

1. Add entry to `SHORTCUTS` in `shortcuts.ts`
2. Add handler in the `useKeyboardShortcuts` call

That's it. No event listener management, no cleanup logic, no new files. The help overlay auto-discovers new entries.

Future tools can register tool-specific shortcuts by extending the registry (e.g., Combat Tracker might add `Ctrl+N` for "Next Turn" when focused).

## Acceptance Criteria

- [ ] Ctrl+Z / Ctrl+Y undo/redo canvas operations (window move, resize, open, close, minimize, pin)
- [ ] Ctrl+= / Ctrl+- zoom in/out; Ctrl+0 resets to 100%
- [ ] Escape closes the topmost (highest z-index, non-pinned) open window
- [ ] Space+drag pans canvas (including when pointer is over a window)
- [ ] Space+drag does NOT fire when a text input is focused
- [ ] Ctrl+? (Ctrl+Shift+/) shows shortcuts help overlay
- [ ] Help overlay auto-reflects all registered shortcuts
- [ ] Browser native zoom (Ctrl+=/- on page) is suppressed while canvas is active
- [ ] Adding a new shortcut requires only 2 touch points (registry + handler)
- [ ] Undo history coalesces drag operations (not one entry per pixel)
- [ ] Max 50 undo entries; oldest discarded when exceeded

## Dependencies & Prerequisites

- **Infinite Canvas must exist** (Phase 1-2 of canvas plan) — panzoom ref and canvas state are required
- **tinykeys** (~600 bytes) — new dependency
- **Radix Dialog** — already in deps, used for shortcuts overlay

## Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Ctrl+=/- not suppressible in all browsers | Low | Medium | Use both `preventDefault` and `stopPropagation`. Test in Electron (Chromium) where it should work reliably. |
| Space+drag conflicts with Space in inputs | Medium | High | Check `document.activeElement` tag — skip pan if input/textarea/contenteditable is focused |
| Undo/redo state grows large with many windows | Low | Low | Cap at 50 entries. Store only diffs if needed (optimization, not MVP) |
| tinykeys `$mod` key format edge cases | Low | Low | Well-tested library. Fallback: explicit platform detection |

## Sources & References

### Internal References

- `src/ui/canvas/hooks/useCanvasState.ts` — reducer to wrap with undo/redo
- `src/ui/canvas/hooks/usePanZoom.ts` — panzoom ref for zoom shortcuts
- `src/ui/canvas/InfiniteCanvas.tsx` — integration point for hooks
- `docs/brainstorms/2026-05-13-game-master-panel-requirements.md:139` — R59 global undo/redo requirement

### External References

- tinykeys: https://github.com/jamiebuilds/tinykeys — ~600B keyboard shortcut library
- @panzoom/panzoom API: `zoomIn()`, `zoomOut()`, `zoom(1)` for reset
