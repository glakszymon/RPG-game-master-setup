---
title: "feat: Floating Utilities (Sticky Note + Audio Recorder)"
type: feat
status: active
date: 2026-05-21
origin: docs/brainstorms/2026-05-21-floating-utilities-requirements.md
---

# Floating Utilities — Sticky Note + Audio Recorder

## Overview

Add a floating utilities layer — viewport-fixed draggable widgets independent of the canvas pan/zoom. First utilities: a disposable Sticky Note scratchpad and a session Audio Recorder producing per-segment files.

## Problem Statement

During live RPG sessions, GMs need instant access to ephemeral tools (quick note, recording) without navigating the infinite canvas. Current viewport overlays (MinimizeTray, PinnedTimers, Minimap) prove the pattern works but aren't user-configurable widgets.

(see origin: docs/brainstorms/2026-05-21-floating-utilities-requirements.md)

## Proposed Solution

Introduce a `FloatingUtilities` container rendered as a sibling of the existing viewport overlays inside `InfiniteCanvas.tsx`. Each utility is a small draggable widget with minimize-to-icon capability. Position persists in canvas state.

## Technical Approach

### Architecture

```
src/ui/
  floating/                         # New module
    FloatingLayer.tsx               # Container, renders active floating widgets
    FloatingWidget.tsx              # Draggable chrome wrapper (similar to CanvasWindow but simpler)
    types.ts                        # FloatingWidgetState, FloatingUtilityType
    hooks/
      useFloatingDrag.ts            # Pointer-event drag (no scale compensation needed — viewport coords)
    widgets/
      StickyNote.tsx                # Textarea widget
      StickyNote.module.css
      AudioRecorder.tsx             # MediaRecorder widget
      AudioRecorder.module.css
```

### Layer Integration

In `InfiniteCanvas.tsx`, after existing overlays:

```tsx
<FloatingLayer
  widgets={state.floatingWidgets}
  onWidgetUpdate={handleFloatingUpdate}
  campaignId={campaignId}
/>
```

### State Model

```typescript
interface FloatingWidgetState {
  id: string
  type: 'sticky-note' | 'audio-recorder'
  x: number          // viewport px
  y: number          // viewport px
  minimized: boolean
  // no toolState needed — these are simple enough for local state
}
```

Add `floatingWidgets: FloatingWidgetState[]` to `CanvasState`. This persists positions via the existing `useCanvasPersistence` debounce-save. Sticky note TEXT is intentionally NOT persisted (ephemeral by design).

### Implementation Phases

#### Phase 1: Framework + Sticky Note

1. Define `FloatingWidgetState` type in `src/ui/floating/types.ts`
2. Create `FloatingWidget.tsx` — draggable wrapper with title bar, minimize button, close button
3. Create `FloatingLayer.tsx` — renders widgets + minimized icon tray
4. Create `StickyNote.tsx` — simple `<textarea>` with local state
5. Add `floatingWidgets` to `CanvasState`, add reducer actions: `ADD_FLOATING`, `UPDATE_FLOATING`, `REMOVE_FLOATING`
6. Wire into `InfiniteCanvas.tsx`
7. Add UI to open a floating utility (context menu or toolbar button)

#### Phase 2: Audio Recorder

1. Create `AudioRecorder.tsx` — uses `navigator.mediaDevices.getUserMedia` + `MediaRecorder` API
2. Each "record" press creates a new segment → saves via IPC to campaign audio folder
3. New IPC channel: `floating:save-audio-segment` — accepts `{ campaignId, buffer: ArrayBuffer, filename: string }`
4. Widget UI: record button (toggles red), elapsed time display, segment counter
5. Files saved as `session-YYYY-MM-DD-NNN.webm` (WebM/Opus — natively supported by MediaRecorder in Chromium)

### Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| Separate from CanvasWindow | Canvas windows transform with pan/zoom; floating widgets are viewport-fixed. Different drag math, different persistence semantics. |
| No scale compensation in drag | Widgets live in viewport coordinates, not canvas coordinates |
| Ephemeral sticky content | Differentiates from Notebook; zero persistence overhead |
| WebM/Opus format | Native MediaRecorder output in Chromium — no transcoding needed |
| Segments model | Each press = new file. Simpler than pause/resume; easier post-session management |
| Position in CanvasState blob | Reuses existing persistence infra; no new DB table |

### Minimized Icon Behavior

When minimized, the widget collapses to a small icon (e.g., 32x32) staying in its last position. Clicking the icon restores the widget. This avoids needing a separate dock/tray for floating utilities.

## System-Wide Impact

- **CanvasState extension**: Adding `floatingWidgets` array. Backward-compatible — old saves have `undefined`, defaulting to `[]` on load.
- **IPC addition**: One new channel for audio saving. Follows existing `soundboard:import-audio` pattern.
- **No interference** with existing overlays (MinimizeTray, PinnedTimers, Minimap) — separate layer.

## Acceptance Criteria

- [ ] Floating widget renders above canvas, does not move with pan/zoom
- [ ] Widget can be dragged to any viewport position
- [ ] Widget can be minimized to icon and restored
- [ ] Widget position persists across app restarts
- [ ] Sticky Note: user can type text; text clears on app restart
- [ ] Audio Recorder: clicking record starts capturing microphone audio
- [ ] Audio Recorder: clicking stop saves a `.webm` file to campaign folder
- [ ] Audio Recorder: displays elapsed time while recording
- [ ] Audio Recorder: each recording creates a separate numbered file
- [ ] Old campaign saves (without `floatingWidgets`) load without errors

## Dependencies & Risks

- **Microphone permissions**: Electron needs `navigator.mediaDevices.getUserMedia` — works by default in Electron (no special permission model on desktop), but user OS may block mic access.
- **MediaRecorder availability**: Guaranteed in Electron's Chromium. WebM/Opus is the default codec.

## Sources & References

- **Origin document:** [docs/brainstorms/2026-05-21-floating-utilities-requirements.md](docs/brainstorms/2026-05-21-floating-utilities-requirements.md)
- Existing viewport overlays: `src/ui/canvas/InfiniteCanvas.tsx:538-593`
- CanvasWindow drag pattern: `src/ui/canvas/CanvasWindow.tsx`
- Audio IPC pattern: `soundboard:import-audio` in `src/electron/main.ts`
- State persistence: `src/ui/canvas/hooks/useCanvasPersistence.ts`
