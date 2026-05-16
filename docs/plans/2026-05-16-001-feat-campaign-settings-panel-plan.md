---
title: "feat: Add Campaign Settings Panel"
type: feat
status: active
date: 2026-05-16
---

# feat: Add Campaign Settings Panel

## Overview

Add a settings button in the bottom-left corner of the infinite canvas that opens a full campaign settings modal. The modal uses a tabbed layout with four sections: main campaign settings, segment settings, instructions, and a technical/app panel. The segment settings and technical panel are scaffolded as empty placeholders for now.

## Problem Statement / Motivation

Currently there is no way to access or modify campaign settings once inside the canvas view. The user must return to the Hub to edit campaign details. A dedicated settings panel provides in-context access to campaign configuration and serves as the central hub for future tool-specific settings, instructions, and debugging utilities.

## Proposed Solution

1. **Settings button** — fixed-position glassmorphism button in the bottom-left corner of the canvas viewport (same pattern as `.backBtn` in top-left)
2. **Settings modal** — reuse the existing `<Modal>` component (Radix Dialog) with a `<Tabs>` component for section navigation
3. **Four tabs:**
   - **Główne (Main)** — campaign name, system, icon, status (edit existing `CampaignRow` fields)
   - **Segmenty (Segments)** — placeholder tab with "Coming soon" message
   - **Instrukcje (Instructions)** — placeholder tab with "Coming soon" message
   - **Panel techniczny (Technical)** — placeholder tab with "Coming soon" message

## Technical Considerations

- **Existing patterns:** The canvas already renders fixed overlay elements (back button, preset toolbar, minimap, minimize tray) as siblings inside `.viewport` div with `position: absolute`. Follow this exact pattern.
- **Modal reuse:** `src/ui/components/Modal/Modal.tsx` wraps Radix Dialog with glassmorphism. Use it directly.
- **Tabs reuse:** `src/ui/components/Tabs/` already exists. Use for section navigation inside the modal.
- **Campaign data:** `CampaignRow` from `database.ts` has fields: `name`, `system`, `icon_type`, `icon_value`, `status`. The main tab edits these.
- **IPC:** `window.electronAPI.campaigns` already has CRUD operations. Use existing `update` or add one if missing.
- **State flow:** The `InfiniteCanvas` receives `campaignId` as a prop. Load campaign data via IPC on modal open; save on confirm.
- **No new dependencies** — everything needed already exists in the component library.

## System-Wide Impact

- **Interaction graph**: Settings button renders in `InfiniteCanvas.tsx` → opens Modal → Main tab calls `electronAPI.campaigns.update()` → `database.ts` updates row + `persist()`
- **Error propagation**: IPC errors return null (existing pattern). Show inline error in modal if save fails.
- **State lifecycle risks**: Minimal — campaign metadata is independent of canvas state. No risk of orphaned state.
- **API surface parity**: `CampaignWizard` in Hub already edits campaign fields. Consider extracting shared form fields later, but for MVP keep them separate.

## Acceptance Criteria

- [ ] Gear/cog icon button visible in bottom-left corner of canvas, glassmorphism styled
- [ ] Clicking button opens settings modal with four tabs
- [ ] **Główne** tab shows editable campaign name, system, icon, and status fields
- [ ] Saving main settings persists to SQLite via IPC and updates UI
- [ ] **Segmenty**, **Instrukcje**, **Panel techniczny** tabs render placeholder content
- [ ] Modal closes on Escape, overlay click, or explicit close button
- [ ] Button does not overlap with MinimizeTray or other bottom-left elements
- [ ] Keyboard shortcut (e.g. `,` or `Ctrl+,`) opens settings

## Success Metrics

- Settings are accessible without leaving the canvas
- All four tabs render correctly
- Campaign edits persist across app restarts

## Dependencies & Risks

- **Dependency:** Existing `Modal`, `Tabs`, `Input`, `Button` components must work correctly
- **Risk:** Bottom-left positioning may conflict with `MinimizeTray` — verify layout during implementation
- **Risk:** Campaign update IPC may not exist yet — check `electronAPI.campaigns` surface and add if needed

## Implementation Sketch

### New Files

- `src/ui/canvas/CampaignSettings/CampaignSettings.tsx` — modal with tabs
- `src/ui/canvas/CampaignSettings/CampaignSettings.module.css` — styles
- `src/ui/canvas/CampaignSettings/MainSettingsTab.tsx` — campaign field editor
- `src/ui/canvas/CampaignSettings/PlaceholderTab.tsx` — reusable empty tab

### Modified Files

- `src/ui/canvas/InfiniteCanvas.tsx` — add settings button + `<CampaignSettings>` modal
- `src/ui/canvas/InfiniteCanvas.module.css` — add `.settingsBtn` style (mirror `.backBtn` positioning but bottom-left)
- `src/electron/database.ts` — add `updateCampaign()` if not present
- `src/electron/main.ts` — add IPC handler for campaign update if not present
- `src/electron/preload.ts` — expose campaign update if not present
- `src/ui/electron.d.ts` — type declaration for campaign update

## Sources & References

- Similar overlay pattern: `src/ui/canvas/InfiniteCanvas.tsx` (`.backBtn`, `<PresetToolbar>`)
- Modal component: `src/ui/components/Modal/Modal.tsx`
- Tabs component: `src/ui/components/Tabs/`
- Campaign data: `src/electron/database.ts:244` (`CampaignRow`)
- Hub campaign editing: `src/ui/views/Hub/Hub.tsx` (`CampaignWizard`)
