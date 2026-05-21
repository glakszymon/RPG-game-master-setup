---
title: "feat: Hub Wizard Guided Onboarding & Demo Campaign"
type: feat
status: active
date: 2026-05-21
origin: docs/brainstorms/2026-05-14-hub-screen-requirements.md
---

# feat: Hub Wizard Guided Onboarding & Demo Campaign

## Overview

Enhance the existing Hub screen with two features:
1. **Multi-step Campaign Wizard** — add an optional Step 2 (party members) as guided onboarding after the existing Step 1 (name+system+icon)
2. **Demo Campaign** — a preloaded campaign with example data, permanently visible with a "Demo" badge until manually deleted

The Hub, campaign grid, wizard modal, navigation animations, and IPC CRUD are all already implemented. This plan covers incremental additions only.

## Problem Statement / Motivation

New users create a campaign but don't discover the party tracker until they enter the canvas. A guided onboarding step during creation shows what's possible. A demo campaign provides a pre-built example to explore without setup effort.

## Proposed Solution

### Multi-step Wizard

Extend `CampaignWizard.tsx` with a step indicator and optional Step 2:

- **Step 1** (existing, required): name, system, icon — unchanged
- **Step 2** (new, skippable): "Add party members" — shows simplified party member form (name + class/role). "Skip" button prominently visible. Brief copy explaining this can be done later on canvas.

On Step 1 submit → campaign is created via IPC immediately → wizard advances to Step 2 (or user skips). Step 2 saves party members via existing party tracker IPC (`party:save-members` or similar).

### Demo Campaign

- On first-ever app launch (no campaigns in DB), seed a "Demo Campaign" via `database.ts`
- Campaign has `status: 'demo'` or a flag field `is_demo: 1`
- `CampaignCard` renders a `<Badge>Demo</Badge>` overlay on demo campaigns
- Demo campaign includes: 3-4 example party members, a sample map reference, example notes
- User can delete it like any other campaign via three-dots menu

## Technical Considerations

### Existing Code to Modify

| File | Change |
|------|--------|
| `src/ui/views/Hub/CampaignWizard.tsx` | Add step state, step indicator, Step 2 form, skip/back buttons |
| `src/ui/views/Hub/CampaignWizard.module.css` | Step indicator styles, Step 2 layout |
| `src/ui/views/Hub/CampaignCard.tsx` | Render "Demo" badge when `is_demo` |
| `src/ui/views/Hub/CampaignCard.module.css` | Badge styling |
| `src/ui/views/Hub/Hub.tsx` | Update `onSave` handler to accept campaignId for Step 2 flow |
| `src/electron/database.ts` | Add `seedDemoCampaign()`, add `is_demo` column or status value |
| `src/electron/main.ts` | Call seed on first launch, expose party member creation IPC if not existing |
| `src/ui/electron.d.ts` | Update types for `is_demo` field on CampaignData |

### Architecture

- Wizard stays as Radix Dialog modal — no routing change needed
- Step state managed with `useState<1 | 2>(1)` inside wizard
- Campaign creation happens at Step 1 submit (existing `onSave`), Step 2 uses the new campaign ID
- Demo seeding: check if `campaigns` table is empty on app start, if yes call `seedDemoCampaign()`

### No New Dependencies

CSS transitions for step animation. No Framer Motion (per tutorial.md decision).

## Acceptance Criteria

- [ ] Wizard shows step indicator (1/2) after Step 1 submit
- [ ] Step 2 shows party member mini-form (name + class) with Add/Remove
- [ ] "Skip" button on Step 2 is prominent and clearly labeled
- [ ] Skipping Step 2 closes wizard and shows new campaign in grid
- [ ] Completing Step 2 saves members and closes wizard
- [ ] First-ever launch seeds a Demo Campaign with example data
- [ ] Demo campaign shows "Demo" badge on its card
- [ ] Demo campaign is deletable via three-dots menu (same as any campaign)
- [ ] Edit mode (quick edit) still works and only shows Step 1
- [ ] `npm run build` and `npm run lint` pass

## Success Metrics

- New user sees Demo Campaign on first launch without any action
- Campaign creation with skip takes <15 seconds
- Step 2 communicates optionality clearly (measured by label text + skip button prominence)

## Dependencies & Risks

- **Party member IPC**: Need to verify if `party:save-members` or equivalent exists for saving members outside the canvas party tracker. If not, need to add it.
- **Database migration**: Adding `is_demo` field — since sql.js with no migration framework, handle via ALTER TABLE IF NOT EXISTS pattern already used in project.

## Implementation Phases

### Phase 1: Multi-step Wizard UI (~1-2h)
- Add step state to CampaignWizard
- Build Step 2 form (party member name+class, add/remove rows)
- Step indicator dots + skip/back buttons
- CSS transitions between steps

### Phase 2: Step 2 Persistence (~30min)
- Wire Step 2 submit to party member IPC
- Ensure campaign ID is available for Step 2 (returned from Step 1 create)

### Phase 3: Demo Campaign (~1h)
- Add `is_demo` column/flag to campaigns table
- Create `seedDemoCampaign()` in database.ts with example data
- Call on first launch (empty campaigns check)
- Badge rendering on CampaignCard

## Sources & References

- **Origin document:** [docs/brainstorms/2026-05-14-hub-screen-requirements.md](docs/brainstorms/2026-05-14-hub-screen-requirements.md) — Key decisions: guided onboarding wizard, demo campaign with permanent badge, zoom-in animation (already implemented)
- Existing wizard: `src/ui/views/Hub/CampaignWizard.tsx`
- Hub component: `src/ui/views/Hub/Hub.tsx`
- Database: `src/electron/database.ts`
- Design tokens: `src/ui/styles/tokens.css`
