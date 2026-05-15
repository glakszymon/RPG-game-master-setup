---
title: "feat: Time Clock auto-advance & Calendar starting date"
type: feat
status: active
date: 2026-05-15
origin: docs/brainstorms/2026-05-15-time-tracker-requirements.md
---

# feat: Time Clock auto-advance & Calendar starting date

## Overview

Two enhancements to the existing Time Tracker:

1. **Auto-advance mode** for Time Clock — real time drives in-game time at a configurable ratio (e.g. 1 real min = 10 in-game min). User can start/stop at any time and still manually adjust.
2. **Starting date input** for Calendar — let user set initial day/month/year so campaigns don't always begin at Day 1, Month 1, Year 1.

## Proposed Solution

### Feature 1: Auto-Advance

Add an `autoAdvance` config object to `CampaignTimeState`:

```typescript
// src/ui/canvas/types.ts — add to CampaignTimeState
autoAdvance: {
  enabled: boolean;
  ratio: number;        // in-game minutes per 1 real minute (e.g. 10)
  lastTickAt: number | null; // Date.now() of last tick, null when paused
};
```

A new hook `useAutoAdvance` in `src/ui/tools/time-clock/hooks/` runs a `setInterval` (1s precision) that:
- Calculates elapsed real ms since `lastTickAt`
- Converts to in-game minutes via `ratio`
- Calls `onAdvanceTime(deltaMinutes)` (existing action)
- Updates `lastTickAt`

UI in TimeClock: a toggle button + ratio input in the control area. When active, show a pulsing indicator. Manual +/- buttons remain functional alongside auto-advance.

**Default:** `{ enabled: false, ratio: 10, lastTickAt: null }`

### Feature 2: Starting Date

Add a "Set Date" section in the Calendar settings modal. Three inputs: Day, Month (dropdown), Year. On save, update `currentDay`, `currentMonth`, `currentYear` via `onSetTimeState`.

This is purely a UI addition — the data model already supports arbitrary day/month/year values. No type changes needed.

## Technical Considerations

- **Auto-advance and in-game timers:** `ADVANCE_TIME` already ticks in-game timers, so auto-advance inherits timer behavior for free.
- **Persistence:** `lastTickAt` should be set to `null` on app close (or on load, recalculate missed time — simpler to just pause on close). Setting `lastTickAt = null` when `enabled` but app restarts avoids time jumps.
- **Precision:** 1-second interval is sufficient; sub-second precision unnecessary for tabletop RPG.
- **Performance:** Single `setInterval` in one component instance; negligible.

## Acceptance Criteria

- [ ] User can enable auto-advance from Time Clock UI (toggle button)
- [ ] User can configure ratio (in-game minutes per real minute) — default 10
- [ ] Clock visually advances in real time when auto-advance is on
- [ ] In-game timers tick correctly during auto-advance
- [ ] Midnight crossing during auto-advance advances calendar date
- [ ] Manual +/- buttons still work while auto-advance is active
- [ ] User can stop auto-advance at any time
- [ ] Auto-advance pauses when app is closed (no time jump on reopen)
- [ ] User can set starting date (day, month, year) in Calendar settings modal
- [ ] Setting date updates the shared CampaignTimeState immediately

## Implementation Phases

### Phase 1: Auto-Advance (~60% of work)

1. Add `autoAdvance` field to `CampaignTimeState` + `DEFAULT_TIME_STATE` in `src/ui/canvas/types.ts`
2. Create `src/ui/tools/time-clock/hooks/useAutoAdvance.ts` — interval logic
3. Update `TimeClock.tsx` — add toggle button, ratio input, pulsing indicator
4. Update `TimeClock.module.css` — styles for auto-advance controls + active indicator
5. Handle persistence edge case: set `lastTickAt = null` on initial load if `enabled` is true (in `useCanvasPersistence` or in the hook itself)

### Phase 2: Calendar Starting Date (~40% of work)

1. Update `src/ui/tools/time-calendar/TimeCalendar.tsx` — add date inputs to settings modal
2. Add day/month/year fields to the settings form state
3. On save, call `onSetTimeState` with updated `currentDay`, `currentMonth`, `currentYear`
4. Validate: day must be within month's day count, month within range

## Files to Create

- `src/ui/tools/time-clock/hooks/useAutoAdvance.ts`

## Files to Modify

- `src/ui/canvas/types.ts` — add `autoAdvance` to `CampaignTimeState` + default
- `src/ui/tools/time-clock/TimeClock.tsx` — auto-advance UI controls
- `src/ui/tools/time-clock/TimeClock.module.css` — auto-advance styles
- `src/ui/tools/time-calendar/TimeCalendar.tsx` — starting date inputs in settings modal

## Sources

- **Origin document:** [docs/brainstorms/2026-05-15-time-tracker-requirements.md](docs/brainstorms/2026-05-15-time-tracker-requirements.md)
- Existing time state: `src/ui/canvas/types.ts:165`
- Clock component: `src/ui/tools/time-clock/TimeClock.tsx`
- Canvas reducer ADVANCE_TIME: `src/ui/canvas/hooks/useCanvasState.ts:243`
