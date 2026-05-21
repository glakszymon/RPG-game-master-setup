---
title: "feat: Campaign Settings — Tool Panels & Background Image"
type: feat
status: active
date: 2026-05-21
---

# feat: Campaign Settings — Tool Panels & Background Image

## Overview

Expand the existing Campaign Settings modal (`CampaignSettings.tsx`) with two enhancements:

1. **Mirror tool settings panels** — Add Party Tracker, Time Clock, and Calendar settings tabs inside Campaign Settings. These must be copies of the existing settings UI that share the same underlying state (editing either location updates the same data).
2. **Campaign background image** — Add ability to set a campaign photo displayed as background on the Hub screen.

## Problem Statement / Motivation

Currently tool settings are only accessible when the tool window is open on the canvas. Game masters need a centralized place to configure their campaign's tools, especially during initial setup before opening individual windows. Additionally, the Hub screen is visually plain — a campaign background image adds personality and quick identification.

## Proposed Solution

### Part 1: Tool Settings in Campaign Settings

Add three new tabs to `CampaignSettings.tsx`:
- **Party Tracker** — mirrors card structure editor (CardEditor) and card size
- **Time Clock** — mirrors dawn/dusk, custom buttons, auto-advance settings
- **Calendar** — mirrors months, weekdays, holidays, solstice, current date settings

**Key architectural decision:** These settings panels must read/write the same persisted state as the tool windows. Since tool state is stored per-window in `canvas_state` (via `WindowState.toolState`), the campaign settings tabs need to:
1. Load the tool state from the relevant window's `toolState` in the canvas state
2. Update that same state via the existing `onToolStateChange` pattern
3. If no window of that type exists yet, read/write a "default" tool state stored separately (e.g., a `campaign_tool_defaults` table or stored in campaign metadata)

**Simpler approach:** Extract the settings UI from each tool into standalone components that accept state + onChange props. Use them in both locations.

### Part 2: Campaign Background Image

- Add `background_path TEXT` column to `campaigns` table
- Add image picker in Main settings tab (or dedicated "Appearance" tab)
- Store the file path on disk; load via `readImage` IPC (base64 data URL) — same pattern as map images
- Display as background on Hub screen behind the campaign grid

## Technical Considerations

### Architecture

- **Extracted settings components:** Create `PartyTrackerSettings`, `TimeClockSettings`, `CalendarSettings` components that encapsulate just the settings UI
- **Shared state access:** Settings panels in Campaign Settings need IPC calls to load/save canvas state for specific tool windows
- **New IPC channel needed:** `canvas:get-tool-state` / `canvas:set-tool-state` to read/write individual tool state by campaign + tool type

### Files to modify/create

| Action | File | Purpose |
|--------|------|---------|
| Create | `src/ui/tools/party-tracker/PartyTrackerSettings.tsx` | Extracted settings panel |
| Create | `src/ui/tools/time-clock/TimeClockSettings.tsx` | Extracted settings panel |
| Create | `src/ui/tools/time-calendar/CalendarSettings.tsx` | Extracted settings panel |
| Modify | `src/ui/tools/party-tracker/PartyTracker.tsx` | Use extracted component |
| Modify | `src/ui/tools/time-clock/TimeClock.tsx` | Use extracted component |
| Modify | `src/ui/tools/time-calendar/TimeCalendar.tsx` | Use extracted component |
| Modify | `src/ui/canvas/CampaignSettings/CampaignSettings.tsx` | Add new tabs |
| Modify | `src/electron/database.ts` | Add `background_path` column, new queries |
| Modify | `src/ui/electron.d.ts` | Update `CampaignData` interface |
| Modify | `src/ui/views/Hub/Hub.tsx` | Render background image |
| Modify | `src/ui/views/Hub/Hub.module.css` | Background image styles |
| Modify | `src/ui/canvas/CampaignSettings/MainSettingsTab.tsx` | Background image picker |

### Database migration

```sql
ALTER TABLE campaigns ADD COLUMN background_path TEXT DEFAULT NULL;
```

### Performance

- Background image on Hub: use CSS `background-image` with `object-fit: cover`, load base64 once on mount
- Tool state loading in Campaign Settings: load on tab activation (lazy), not on modal open

## Acceptance Criteria

- [ ] Campaign Settings modal has tabs for Party Tracker, Time Clock, and Calendar settings
- [ ] Changing settings in Campaign Settings reflects immediately when the tool window is open (shared state)
- [ ] Changing settings in the tool window reflects when opening Campaign Settings
- [ ] Background image picker in Campaign Settings (Main or Appearance tab)
- [ ] Selected background image displays on Hub screen behind campaign cards
- [ ] Background image persists across app restarts (stored as file path in DB, loaded via IPC)
- [ ] Removing/clearing background reverts to default solid background
- [ ] Extracted settings components work identically in both locations

## Implementation Phases

### Phase 1: Extract Settings Components

Extract settings UI from PartyTracker, TimeClock, and TimeCalendar into standalone components with `state` + `onChange` props.

### Phase 2: Campaign Settings Integration

Add tabs to CampaignSettings modal. Wire up IPC to load/save tool state from canvas state.

### Phase 3: Background Image

Add DB column, image picker UI, Hub background rendering.

## Dependencies & Risks

- **Risk:** If no tool window exists yet for a campaign, there's no `toolState` to read. Need a fallback — either create a default state or store campaign-level tool defaults.
- **Risk:** Keeping two UIs in sync with the same state requires careful prop threading. The extracted component pattern mitigates this.

## Sources & References

- Existing CampaignSettings: `src/ui/canvas/CampaignSettings/CampaignSettings.tsx`
- Party Tracker settings: `src/ui/tools/party-tracker/PartyTracker.tsx:119-176`
- Time Clock settings: `src/ui/tools/time-clock/TimeClock.tsx:230-339`
- Calendar settings: `src/ui/tools/time-calendar/TimeCalendar.tsx:236-504`
- Image loading pattern: `electronAPI.dialog.readImage` returns base64 data URL
- Hub screen: `src/ui/views/Hub/Hub.tsx:55-104`
