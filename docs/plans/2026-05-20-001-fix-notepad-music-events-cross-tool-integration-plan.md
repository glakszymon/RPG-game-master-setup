---
title: "fix: Notepad music & events cross-tool integration"
type: fix
status: active
date: 2026-05-20
---

# fix: Notepad music & events cross-tool integration

## Overview

The notepad dispatches CustomEvents for music playback (`notepad:play-music`, `notepad:play-track`, `notepad:stop-music`) and calendar date (`notepad:date-created`), but **no other tool listens for them**. Clicking the music badge or executing a macro with music/date steps does nothing visible.

## Problem Statement

- `MusicMention.tsx:33` dispatches `notepad:play-music` on `document` — no listener
- `useMacroExecutor.ts:57` dispatches `notepad:play-track` on `window` — no listener
- `useMacroExecutor.ts:63` dispatches `notepad:stop-music` on `window` — no listener
- `DateTag.tsx:40` dispatches `notepad:date-created` on `document` — no listener

## Proposed Solution

### Phase 1: Soundboard listens for music events

Add a `useEffect` in `Soundboard.tsx` that:
1. Listens for `notepad:play-track` and `notepad:play-music` on `window`
2. Extracts `detail.trackId` from the event
3. Finds the matching track in `state.tracks` by ID (or by name as fallback)
4. Calls the existing `handlePlay(trackId)` logic
5. Listens for `notepad:stop-music` — stops all currently playing tracks

**Event target consistency:** `MusicMention.tsx` dispatches on `document`, but `useMacroExecutor.ts` dispatches on `window`. Unify to `window` for both. Fix in `MusicMention.tsx:33`.

**Files to modify:**
- `src/ui/tools/soundboard/Soundboard.tsx` — add useEffect listener (~15 lines)
- `src/ui/tools/notepad/extensions/MusicMention.tsx:33` — change `document` → `window`

### Phase 2: Calendar/Time listens for date events

Add a `useEffect` in `InfiniteCanvas.tsx` (where `timeState` and `dispatch` live) that:
1. Listens for `notepad:date-created` on `window`
2. Extracts `detail.day`, `detail.month`, `detail.year`
3. Dispatches `SET_TIME_STATE` with updated date fields

**Event target consistency:** `DateTag.tsx` dispatches on `document`. Change to `window`.

**Files to modify:**
- `src/ui/canvas/InfiniteCanvas.tsx` — add useEffect listener (~12 lines)
- `src/ui/tools/notepad/extensions/DateTag.tsx:40` — change `document` → `window`

## Acceptance Criteria

- [ ] Clicking a `▶ TrackName` music badge in notepad plays that track in the soundboard (if soundboard window is open and track exists)
- [ ] Executing a macro with `play-music` step plays the track in the soundboard
- [ ] Executing a macro with `stop-music` step stops all soundboard playback
- [ ] Clicking a date tag in notepad sets the campaign calendar to that date (if any time tool window is open)
- [ ] Events use `window` consistently (not `document`)
- [ ] No errors if soundboard/calendar tool is not open (events simply go unhandled)
- [ ] Build passes (`npm run build`)

## Technical Considerations

- **Audio context resume:** Web Audio API requires user gesture to start. The soundboard's `useAudioEngine` has a `resume()` method. The event listener should call `engine.resume()` before `playTrack()`.
- **Track matching:** `notepad:play-music` from MusicMention passes `trackId` + `trackName`. Primary match by `id`, fallback match by `name` (case-insensitive) for robustness.
- **Calendar month mapping:** DateTag sends `month` as a number. Verify it aligns with `CampaignTimeState.currentMonth` indexing (0-based vs 1-based).
- **No soundboard open:** If soundboard is not mounted, listener doesn't exist — event is harmless no-op.

## MVP

### src/ui/tools/soundboard/Soundboard.tsx (add inside component)

```typescript
// Listen for cross-tool music events from notepad
useEffect(() => {
  const handlePlayTrack = (e: Event) => {
    const { trackId, trackName } = (e as CustomEvent).detail;
    const track = state.tracks.find(t => t.id === trackId)
      || state.tracks.find(t => t.name.toLowerCase() === trackName?.toLowerCase());
    if (track && !track.isPlaying) {
      engine.resume();
      handlePlay(track.id);
    }
  };
  const handleStopMusic = () => {
    state.tracks.filter(t => t.isPlaying).forEach(t => handleStop(t.id));
  };
  window.addEventListener('notepad:play-track', handlePlayTrack);
  window.addEventListener('notepad:play-music', handlePlayTrack);
  window.addEventListener('notepad:stop-music', handleStopMusic);
  return () => {
    window.removeEventListener('notepad:play-track', handlePlayTrack);
    window.removeEventListener('notepad:play-music', handlePlayTrack);
    window.removeEventListener('notepad:stop-music', handleStopMusic);
  };
}, [state.tracks, engine, handlePlay, handleStop]);
```

### src/ui/canvas/InfiniteCanvas.tsx (add inside component)

```typescript
// Listen for notepad date-created events → update campaign time
useEffect(() => {
  const handleDateCreated = (e: Event) => {
    const { day, month, year } = (e as CustomEvent).detail;
    if (day != null && month != null && year != null) {
      dispatch({ type: 'SET_TIME_STATE', timeState: { ...state.timeState, currentDay: day, currentMonth: month, currentYear: year } });
    }
  };
  window.addEventListener('notepad:date-created', handleDateCreated);
  return () => window.removeEventListener('notepad:date-created', handleDateCreated);
}, [state.timeState, dispatch]);
```

### src/ui/tools/notepad/extensions/MusicMention.tsx:33

```typescript
// Change from document to window
window.dispatchEvent(new CustomEvent('notepad:play-music', { detail: { trackId, trackName } }));
```

### src/ui/tools/notepad/extensions/DateTag.tsx:40

```typescript
// Change from document to window
window.dispatchEvent(new CustomEvent('notepad:date-created', { detail: { dateText, day, month, year } }));
```

## Sources

- Soundboard audio engine: `src/ui/tools/soundboard/hooks/useAudioEngine.ts`
- Soundboard component: `src/ui/tools/soundboard/Soundboard.tsx`
- Time state: `src/ui/canvas/types.ts:170` (CampaignTimeState)
- InfiniteCanvas time dispatch: `src/ui/canvas/InfiniteCanvas.tsx:242`
- MusicMention: `src/ui/tools/notepad/extensions/MusicMention.tsx`
- MacroExecutor: `src/ui/tools/notepad/hooks/useMacroExecutor.ts:55-63`
- DateTag: `src/ui/tools/notepad/extensions/DateTag.tsx:40`
