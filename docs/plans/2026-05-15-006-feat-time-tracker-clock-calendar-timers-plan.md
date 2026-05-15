---
title: "feat: Add Time Tracker — Clock, Calendar & Session Timers"
type: feat
status: active
date: 2026-05-15
origin: docs/brainstorms/2026-05-15-time-tracker-requirements.md
---

# feat: Add Time Tracker — Clock, Calendar & Session Timers

## Enhancement Summary

**Deepened on:** 2026-05-15
**Sections enhanced:** 6 (Architecture, Sky Arc, Calendar Grid, Timers, CSS, System Impact)
**Research agents used:** Sky Arc Visualization, Calendar Grid Rendering, Timer Patterns, Shared State Architecture

### Key Improvements
1. SVG confirmed as best rendering approach for sky arc (CSS-animatable, no render loop)
2. Single `ADVANCE_TIME` reducer action with cascade logic (atomic midnight crossing + timer ticking)
3. Time actions added to `IGNORED_ACTIONS` in undo system (not `COALESCED`)
4. Timestamp-based real-time timers with `useSyncExternalStore` engine for 20+ timers without excessive re-renders
5. Cosine interpolation for solstice dawn/dusk (realistic slow change near solstices)

## Overview

Three tool windows for in-game time management: a sky-arc Clock, a configurable Calendar, and a Session Timer with custom countdown/stopwatch list. Shared campaign-level time state synchronizes all three windows.

## Problem Statement

DMs need to track in-game time (hour, date), manage custom fantasy calendars, and measure real session duration. Without dedicated tools, this requires manual notes and mental tracking — breaking flow during sessions. (see origin: docs/brainstorms/2026-05-15-time-tracker-requirements.md)

## Proposed Solution

Three separate ToolType windows on the canvas, backed by a shared campaign-level time model persisted in SQLite. The Clock drives time changes, the Calendar reflects date state, and Session Timer hosts both a real-time session stopwatch and custom timers that can tick in real-time or in-game time.

## Technical Approach

### Architecture

#### Critical: Shared Time State (SpecFlow gap #1 & #2)

The existing architecture stores `toolState` per-window in `WindowState.toolState`. Time state must be shared across 3 windows. Solution:

**New `timeState` field on `CanvasState`** — add a top-level `timeState: CampaignTimeState` to `CanvasState` (alongside `windows`, `background`, etc.). This avoids a new DB table while leveraging existing canvas persistence (500ms debounce save).

```typescript
export interface CanvasState {
  windows: WindowState[];
  background: BackgroundType;
  nextWindowId: number;
  timeState: CampaignTimeState;  // NEW — shared across all time tools
}
```

**Why lifted state, not React Context:** AGENTS.md explicitly says *"State flows top-down via props; no React Context for shared state"*. Lifting to `CanvasState` gives us persistence and undo/redo for free via existing infrastructure.

**Propagation:** `InfiniteCanvas.tsx` passes `timeState` + `onAdvanceTime` as additional props to time-tool components only. Non-time tools don't receive these props → `React.memo` on `ToolContent` prevents their re-render.

```typescript
// Stable callback — dispatch never changes
const advanceTime = useCallback(
  (minutes: number) => dispatch({ type: 'ADVANCE_TIME', minutes }),
  [dispatch],
);
```

#### Single Atomic Action for Time Changes

Use a single `ADVANCE_TIME` action that computes all cascades (hour overflow → day change → month/year change → timer ticking) in one pure reducer function:

```typescript
type CanvasAction =
  | { type: 'ADVANCE_TIME'; minutes: number }
  | { type: 'SET_TIME_STATE'; timeState: CampaignTimeState }
  // ... existing actions
```

**Why single action:** One undo point, one persistence write, no intermediate states. The cascade is deterministic pure arithmetic — extract into a testable `advanceTime()` utility function.

#### Undo/Redo: IGNORED, Not Coalesced

Add `ADVANCE_TIME` and `SET_TIME_STATE` to `IGNORED_ACTIONS` in `useUndoRedo`. Time progression is intentional and unidirectional — mixing spatial undo (window drag) with temporal undo (time reversal) creates confusing UX. Time has its own explicit reversal buttons (-1min, -1h, etc.).

#### Three Separate ToolTypes (SpecFlow gap #3)

Replace single `'time-tracker'` with three entries:
- `'time-clock'` — Sky arc + time controls
- `'time-calendar'` — Monthly grid + configuration
- `'time-session-timer'` — Stopwatch + custom timer list

Each gets its own min/default sizes. Window-local `toolState` stores UI-only state (e.g., which month is being viewed in calendar, settings modal open/closed).

### Data Model

```typescript
interface CampaignTimeState {
  // Clock
  currentMinute: number;        // 0-59
  currentHour: number;          // 0-23
  currentDay: number;           // 1-based
  currentMonth: number;         // 0-based index into calendar.months
  currentYear: number;

  // Clock settings
  dawnHour: number;             // e.g. 6
  duskHour: number;             // e.g. 18
  customTimeButtons: Array<{ label: string; minutes: number }>;

  // Calendar config
  calendarMode: 'simple' | 'advanced';
  calendar: CalendarConfig;

  // Session Timer
  sessionTimer: {
    startedAt: number | null;   // Date.now() timestamp when started (null = stopped)
    accumulatedMs: number;      // paused time accumulation
  };
  customTimers: CustomTimer[];
}

interface CalendarConfig {
  months: Array<{ name: string; days: number }>;
  weekDays: string[];           // e.g. ["Mon", "Tue", ...] or custom
  holidays: Array<{ month: number; day: number; name: string; color?: string }>;
  // Advanced mode only
  summerSolstice?: { month: number; day: number; dawnHour: number; duskHour: number };
  winterSolstice?: { month: number; day: number; dawnHour: number; duskHour: number };
}

interface CustomTimer {
  id: string;
  name: string;
  mode: 'real-time' | 'in-game';
  direction: 'up' | 'down';
  targetMinutes: number;        // countdown: start value; stopwatch: 0
  elapsedMinutes: number;       // in-game: advanced by clock delta
  // Real-time tracking (timestamp-based — survives app restart)
  startedAt: number | null;     // Date.now() when started; null = paused
  accumulatedMs: number;        // ms accumulated before last pause
  soundEnabled: boolean;
  completed: boolean;           // countdown reached 0
}
```

### Implementation Phases

#### Phase 1: Foundation — Shared State + Clock

**Tasks:**
1. Add `CampaignTimeState` to `CanvasState` in `src/ui/canvas/types.ts`
2. Add `ADVANCE_TIME` / `SET_TIME_STATE` actions to canvas reducer in `useCanvasState.ts`; extract pure `advanceTime()` utility with all cascade logic
3. Add time actions to `IGNORED_ACTIONS` in `useUndoRedo.ts`
4. Replace `'time-tracker'` ToolType with `'time-clock'`, `'time-calendar'`, `'time-session-timer'` in `types.ts` (update `TOOL_MIN_SIZES`, `TOOL_DEFAULT_SIZES`, `TOOL_INFO`, `TOOL_CATEGORIES`)
5. Update `InfiniteCanvas.tsx` — pass `timeState` + `onAdvanceTime` only to time-aware `ToolContent` cases
6. Create `src/ui/tools/time-clock/` — types.ts, TimeClock.tsx, TimeClock.module.css, index.ts
7. Implement sky arc visualization (SVG)
8. Implement fixed time buttons (+/- 1min, 10min, 1h, 4h, 1 day) with midnight crossing logic
9. Settings modal (via shared `Modal` component) for dawn/dusk hours + custom buttons

**Sky arc implementation — SVG approach:**

```tsx
// SVG semicircular arc with sun/moon positioned via cos/sin
const arcPath = `M ${cx - r} ${cy} A ${r} ${r} 0 0 1 ${cx + r} ${cy}`;

// Position calculation:
function calculateSkyPosition(hour: number, dawn: number, dusk: number) {
  let progress: number;
  if (hour >= dawn && hour <= dusk) {
    progress = (hour - dawn) / (dusk - dawn); // day: 0→1
  } else {
    const nightDuration = 24 - (dusk - dawn);
    const nightHour = hour >= dusk ? hour - dusk : hour + (24 - dusk);
    progress = nightHour / nightDuration; // night: 0→1
  }
  const angle = Math.PI * (1 - progress); // left→right across arc
  return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
}
```

CSS transitions on SVG `cx`/`cy` attributes handle smooth movement (Electron 42's Chromium supports this). Four phases: Night→Dawn→Day→Dusk with gradient colors:
- Day: `#FFA500` (orange)
- Night: `#8B5CF6` (purple)
- Dawn/Dusk: blended transitions
- SVG `<filter id="glow">` with `feGaussianBlur` (stdDeviation ≤ 4px for performance)

**Midnight crossing logic (pure function):**
```typescript
function advanceTime(state: CampaignTimeState, deltaMinutes: number): CampaignTimeState {
  let { currentMinute, currentHour, currentDay, currentMonth, currentYear } = state;
  const { calendar, customTimers } = state;

  // Advance minutes + cascade
  let totalMinutes = currentHour * 60 + currentMinute + deltaMinutes;
  // Handle day overflow/underflow
  while (totalMinutes >= 1440) { totalMinutes -= 1440; /* advance day */ }
  while (totalMinutes < 0) { totalMinutes += 1440; /* reverse day */ }

  // Advance in-game timers by same delta (symmetric for reversal)
  const updatedTimers = customTimers.map(t => {
    if (t.mode !== 'in-game') return t;
    const newElapsed = t.elapsedMinutes + deltaMinutes;
    const isCompleted = t.direction === 'down' && newElapsed >= t.targetMinutes;
    return { ...t, elapsedMinutes: newElapsed, completed: isCompleted };
  });

  return { ...state, currentHour, currentMinute, currentDay, currentMonth, currentYear, customTimers: updatedTimers };
}
```

**Default initial state:** 12:00, day 1, month 0, year 1. Real-world preset: current real date/time.

**Acceptance criteria:**
- [ ] Sky arc renders with sun/moon at correct position based on hour
- [ ] Gradient transitions: orange (day), purple (night), blended at dawn/dusk
- [ ] All fixed time buttons work correctly including midnight crossing
- [ ] Custom time buttons configurable via settings modal
- [ ] Dawn/dusk hours configurable, affect arc rendering
- [ ] State persists across app restarts via canvas persistence
- [ ] Opening multiple Clock windows shows same time (shared state)
- [ ] Non-time windows don't re-render when time changes

**Estimated effort:** ~3-4 days

**Files to create/modify:**
- `src/ui/canvas/types.ts` — modify ToolType union + add CampaignTimeState + DEFAULT_TIME_STATE
- `src/ui/canvas/hooks/useCanvasState.ts` — add ADVANCE_TIME/SET_TIME_STATE actions + advanceTime() pure utility
- `src/ui/canvas/hooks/useUndoRedo.ts` — add time actions to IGNORED_ACTIONS
- `src/ui/canvas/InfiniteCanvas.tsx` — add imports, stable callback, pass timeState to time-tool cases only
- `src/ui/tools/time-clock/types.ts` — NEW (local UI state: settingsOpen, etc.)
- `src/ui/tools/time-clock/TimeClock.tsx` — NEW
- `src/ui/tools/time-clock/SkyArc.tsx` — NEW (SVG arc component)
- `src/ui/tools/time-clock/TimeClock.module.css` — NEW
- `src/ui/tools/time-clock/index.ts` — NEW

#### Phase 2: Calendar

**Tasks:**
1. Create `src/ui/tools/time-calendar/` — types.ts, TimeCalendar.tsx, TimeCalendar.module.css, index.ts
2. Implement monthly grid view with weekday headers
3. Current day highlighting, holiday dots with tooltips (Radix `Tooltip`)
4. Month navigation (forward/back)
5. Settings modal: calendar mode selection, month/weekday config, holiday editor
6. Real-world preset auto-applied on first use (no empty state)
7. Advanced mode: solstice config

**Calendar grid algorithm:**

```typescript
function buildMonthGrid(months: MonthDef[], monthIndex: number, weekLength: number) {
  const daysInMonth = months[monthIndex].days;
  // Offset = total days before this month % weekLength
  let totalDaysBefore = 0;
  for (let i = 0; i < monthIndex; i++) totalDaysBefore += months[i].days;
  const startOffset = totalDaysBefore % weekLength;

  const totalCells = startOffset + daysInMonth;
  const totalRows = Math.ceil(totalCells / weekLength);
  // Fill grid: null for padding, day number for real days
}
```

Edge cases handled: 1-day weeks (vertical list), 1-day months (single cell), 50+ day months (many rows). Use CSS Grid with `repeat(weekLength, 1fr)`. `React.memo` on individual `DayCell` components prevents re-rendering all cells on navigation.

**Lunar phase calculation:**
```typescript
const absoluteDay = getAbsoluteDay(date, months); // year * daysPerYear + daysBeforeMonth + day
const phase = ((absoluteDay - referenceDay) % cycleLength + cycleLength) % cycleLength;
const normalizedPhase = phase / cycleLength; // 0 = new moon, 0.5 = full moon
const phaseIndex = Math.floor(normalizedPhase * 8) % 8; // 8 named phases
```

**Solstice interpolation — cosine curve (realistic):**
```typescript
// Cosine gives slow change near solstices, fast near equinoxes
const yearProgress = distFromWinterSolstice / daysPerYear;
const t = (1 - Math.cos(yearProgress * 2 * Math.PI)) / 2; // 0 at winter, 1 at summer
const dawn = lerp(winterDawn, summerDawn, t);
const dusk = lerp(winterDusk, summerDusk, t);
```

When Advanced mode is active, these calculated dawn/dusk values override the manual settings in the Clock.

**Acceptance criteria:**
- [ ] Monthly grid renders correctly for variable month lengths and week lengths
- [ ] Holidays shown as colored dots with tooltip on hover
- [ ] Month navigation works, current day highlighted
- [ ] Simple mode: manual month/day/holiday config
- [ ] Advanced mode: solstice affects Clock dawn/dusk
- [ ] Real-world preset works as default
- [ ] Date auto-advances when Clock crosses midnight
- [ ] Edge cases: 1-day week, 1-day month, 50+ day month all render correctly

**Estimated effort:** ~3-4 days

**Files to create:**
- `src/ui/tools/time-calendar/types.ts` — NEW (local UI: viewingMonth, settingsOpen)
- `src/ui/tools/time-calendar/TimeCalendar.tsx` — NEW
- `src/ui/tools/time-calendar/CalendarGrid.tsx` — NEW (grid rendering + DayCell)
- `src/ui/tools/time-calendar/hooks/useCalendarGrid.ts` — NEW (buildMonthGrid pure function)
- `src/ui/tools/time-calendar/hooks/useLunarPhase.ts` — NEW
- `src/ui/tools/time-calendar/hooks/useDaylightTimes.ts` — NEW (solstice interpolation)
- `src/ui/tools/time-calendar/TimeCalendar.module.css` — NEW
- `src/ui/tools/time-calendar/index.ts` — NEW

#### Phase 3: Session Timer

**Tasks:**
1. Create `src/ui/tools/time-session-timer/` — types.ts, TimeSessionTimer.tsx, TimeSessionTimer.module.css, index.ts
2. Session stopwatch as first item in timer list (prebuilt, non-deletable, real-time up-counter)
3. Custom timer list with inline creation form (+ button)
4. Timer creation: name, mode (real-time/in-game), direction (up/down), target time
5. In-game timer ticking integrated into `advanceTime()` reducer logic
6. Real-time timers: timestamp-based (`startedAt` + `accumulatedMs`)
7. Countdown completion: red color + CSS pulse animation + audio chime
8. Timer deletion (X button)

**Real-time timer engine — single rAF loop for all timers:**

Use `useSyncExternalStore` with a singleton `TimerEngine` class. One `requestAnimationFrame` loop computes elapsed time for all active real-time timers. Individual `TimerItem` components subscribe via `useTimerDisplay(id)` — only re-render when their displayed second changes. This handles 20+ simultaneous timers efficiently.

```typescript
// TimerEngine singleton: single rAF, notifies subscribers only when display-second changes
class TimerEngine {
  private timers: Map<string, TimerEntry>;
  private computed: Map<string, number>;  // id → current ms
  // subscribe/getSnapshot for useSyncExternalStore
}
```

**Expiration batching:** 100ms window via `setTimeout` — if DM clicks "+1 day" and 5 in-game timers expire, collect all into one batch, play chime once, mark all as expired.

**Audio chime:** Web Audio API `AudioBufferSourceNode` for loaded `.mp3`, or synthetic chime via `OscillatorNode` (no audio file needed):
```typescript
osc.frequency.setValueAtTime(880, ctx.currentTime);  // A5
gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
```

**In-game timer + clock reversal:** When DM reverses clock by N minutes, in-game timers reverse by N (handled in `advanceTime()` pure function). A completed countdown that gets un-expired (time reversed past its completion point) returns to active state.

**Acceptance criteria:**
- [ ] Session stopwatch counts real time, survives pause/resume and app restart
- [ ] Custom timers creatable via inline form
- [ ] In-game timers advance/reverse with Clock changes
- [ ] Real-time timers tick independently, survive app restart (timestamp-based)
- [ ] Countdown completion: red + pulse + sound (once per batch)
- [ ] Timer deletion works
- [ ] Multiple simultaneous expirations handled gracefully
- [ ] 20+ timers render without performance degradation

**Estimated effort:** ~2-3 days

**Files to create:**
- `src/ui/tools/time-session-timer/types.ts` — NEW
- `src/ui/tools/time-session-timer/TimeSessionTimer.tsx` — NEW
- `src/ui/tools/time-session-timer/TimerItem.tsx` — NEW (memoized individual timer)
- `src/ui/tools/time-session-timer/hooks/useTimerEngine.ts` — NEW (singleton rAF + useSyncExternalStore)
- `src/ui/tools/time-session-timer/hooks/useChimePlayer.ts` — NEW (Web Audio API)
- `src/ui/tools/time-session-timer/hooks/useExpirationBatcher.ts` — NEW
- `src/ui/tools/time-session-timer/TimeSessionTimer.module.css` — NEW
- `src/ui/tools/time-session-timer/index.ts` — NEW

### CSS Design

Follow existing glassmorphism design tokens. Key patterns:

**Sky arc container:**
```css
.container {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}
.celestialBody {
  transition: cx 1.5s ease-in-out, cy 1.5s ease-in-out, fill 2s ease;
}
```

**Timer expiration pulse:**
```css
.expired {
  animation: pulseGlow 1.5s ease-in-out infinite;
}
@keyframes pulseGlow {
  0%, 100% {
    box-shadow: 0 0 4px rgba(255, 80, 80, 0.3);
    border-color: rgba(255, 80, 80, 0.4);
  }
  50% {
    box-shadow: 0 0 16px rgba(255, 80, 80, 0.6), 0 0 32px rgba(255, 80, 80, 0.2);
    border-color: rgba(255, 80, 80, 0.8);
  }
}
```

**Calendar grid:**
```css
.dayGrid {
  display: grid;
  /* gridTemplateColumns set inline: repeat(weekLength, 1fr) */
  gap: 2px;
}
.currentDay {
  border: 1px solid var(--color-accent);
  background: rgba(var(--color-accent-rgb), 0.15);
}
.holidayDot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
}
```

## System-Wide Impact

- **State lifecycle:** Adding `timeState` to `CanvasState` means existing saved states without it will need a default fallback. Handle `timeState: undefined` in the reducer by applying `DEFAULT_TIME_STATE` on `LOAD_STATE`.
- **Migration:** No DB migration needed — `canvas_state` is a JSON blob. Old blobs simply lack `timeState`, which defaults on load.
- **Undo/redo:** Time actions in `IGNORED_ACTIONS` — no undo entries for time changes. This avoids confusing UX where Ctrl+Z might undo time instead of a window move.
- **Re-render isolation:** Only 3 time-tool windows receive `timeState` prop → other tools (map, party tracker, etc.) unaffected by time changes thanks to `React.memo` on `ToolContent`.
- **Performance:** SVG sky arc uses CSS transitions (no JS animation loop). Timer engine uses single rAF + `useSyncExternalStore` for efficient multi-timer display.

## Acceptance Criteria (Overall)

- [ ] Three tool windows openable from canvas toolbar under "World & Time" category
- [ ] Shared time state synchronized across all three windows
- [ ] Clock sky arc visually represents time of day with correct sun/moon position
- [ ] Calendar supports Simple and Advanced modes with full configuration
- [ ] Session timer tracks real elapsed time, custom timers work in both modes
- [ ] All state persists per campaign across app restarts
- [ ] Backward time changes are fully symmetric (clock, calendar, in-game timers)
- [ ] No performance degradation in existing tools when time changes

## Dependencies & Prerequisites

- Existing canvas persistence system (no changes needed)
- Shared `Modal` component for settings dialogs
- `Tooltip` component for holiday markers

## Sources & References

### Origin

- **Origin document:** [docs/brainstorms/2026-05-15-time-tracker-requirements.md](docs/brainstorms/2026-05-15-time-tracker-requirements.md) — Key decisions: three separate windows, sky arc visualization, shared synchronized time, configurable dawn/dusk, calendar mode selection (Simple/Advanced), in-game timers tick only with clock.

### Internal References

- Tool registration: `src/ui/canvas/types.ts:5-15` (ToolType union)
- Tool rendering: `src/ui/canvas/InfiniteCanvas.tsx:42-74` (ToolContent switch)
- State pattern: `src/ui/tools/party-tracker/PartyTracker.tsx:76-86` (patchState/updateState)
- Canvas persistence: `src/ui/canvas/hooks/useCanvasPersistence.ts` (debounced save)
- Undo system: `src/ui/canvas/hooks/useUndoRedo.ts` (IGNORED_ACTIONS set)
- Shared Modal: `src/ui/components/Modal/Modal.tsx` (Radix Dialog wrapper)
- Inspiration: `inspiracja/world.md` (Mithos World & Time Tools)
- AGENTS.md: "State flows top-down via props; no React Context for shared state"
