---
title: Hub Screen with Campaign Grid and Navigation
type: feat
status: active
date: 2026-05-14
origin: docs/brainstorms/2026-05-14-hub-screen-requirements.md
---

# Hub Screen with Campaign Grid and Navigation

## Overview

Implement the Hub screen as the application's entry point - a full-screen grid of campaign cards with navigation to the Map Creator and campaign canvas. This is the first view users see and the central routing point between all major views.

## Problem Statement

Currently the app renders `<InfiniteCanvas />` directly from `App.tsx` with no routing or campaign selection. Users need a way to create, select, and manage campaigns, and new users need a Demo Campaign to understand the app's capabilities. (see origin: docs/brainstorms/2026-05-14-hub-screen-requirements.md)

## Proposed Solution

Build a Hub view with:
- Header bar (app title + Map Creator button)
- Full-screen responsive grid of campaign cards
- "+" card for new campaign creation (minimal wizard: name + system + icon)
- Demo Campaign seeded on first launch
- Zoom-in transition animation to canvas
- Simple view router (no library - state-based)

## Technical Approach

### Architecture

**Routing:** State-based router in `App.tsx` (no react-router needed for 3 views: Hub, Canvas, MapCreator). Store current view + campaign ID in state.

**Data layer:** Campaign metadata in SQLite via sql.js. Schema: `campaigns` table with id, name, system, icon_type, icon_path, status, created_at, last_session_at.

**Animation:** CSS transitions + FLIP technique for zoom-in. No animation library needed for this scope.

### Implementation Phases

#### Phase 1: Router and Hub Shell

- Replace direct `<InfiniteCanvas />` render with view router in `App.tsx`
- Create `src/ui/views/Hub/` with header and empty grid
- Create `src/ui/views/Hub/Hub.tsx`, `Hub.module.css`
- Navigation state: `{ view: 'hub' | 'canvas' | 'mapCreator', campaignId?: string }`

**Files:**
- `src/ui/App.tsx` (modify - add router logic)
- `src/ui/views/Hub/Hub.tsx` (new)
- `src/ui/views/Hub/Hub.module.css` (new)
- `src/ui/views/Hub/index.ts` (new)

#### Phase 2: Campaign Data Layer

- Create `campaigns` table schema in SQLite
- CRUD operations: create, list, update, delete, archive
- First-launch detection + Demo Campaign seeding

**Files:**
- `src/data/schema/campaigns.sql` (new)
- `src/data/repositories/CampaignRepository.ts` (new)
- `src/data/seed/demoCampaign.ts` (new)

#### Phase 3: Campaign Cards Grid

- `CampaignCard` component showing: icon, name, system, last session date, status badge
- `NewCampaignCard` ("+") component
- Responsive grid layout (auto-fill columns)
- Three-dots menu with: Edit, Archive, Delete
- Sort by last_session_at descending

**Files:**
- `src/ui/views/Hub/CampaignCard.tsx` (new)
- `src/ui/views/Hub/CampaignCard.module.css` (new)
- `src/ui/views/Hub/NewCampaignCard.tsx` (new)
- `src/ui/views/Hub/CampaignGrid.tsx` (new)

#### Phase 4: Campaign Wizard

- Modal dialog (Radix UI Dialog) with form: name, system (text input), icon picker
- Icon picker: grid of preloaded fantasy SVG icons + upload custom image button
- On submit: create campaign in DB, add card to grid

**Files:**
- `src/ui/views/Hub/CampaignWizard.tsx` (new)
- `src/ui/views/Hub/CampaignWizard.module.css` (new)
- `src/ui/views/Hub/IconPicker.tsx` (new)
- `src/assets/icons/campaigns/` (new - preloaded SVG icons)

#### Phase 5: Transitions

- Hub → Canvas: zoom-in animation (card expands to fill viewport using FLIP)
- Hub → Map Creator: slide-left or fade transition (visually distinct)
- Canvas/MapCreator → Hub: reverse animations

**Files:**
- `src/ui/views/Hub/transitions.module.css` (new)
- `src/ui/views/ViewRouter.tsx` (new - handles animated transitions between views)

## System-Wide Impact

- **App.tsx** changes from single-view to multi-view (breaking change for current layout)
- **InfiniteCanvas** becomes a child of the router, receiving `campaignId` as prop
- **SQLite schema** gets first table (`campaigns`)
- No external dependencies added (CSS-only animations, existing Radix for modal)

## Acceptance Criteria

- [ ] App launches to Hub screen showing campaign grid
- [ ] "+" card opens wizard modal; completing it creates a campaign card
- [ ] Clicking a campaign card triggers zoom-in animation and loads canvas
- [ ] Header shows Map Creator button; clicking it navigates with distinct animation
- [ ] Campaign cards show name, system, icon, last session date, status badge
- [ ] Three-dots menu allows: quick edit name/icon, archive, delete
- [ ] Demo Campaign appears on first launch with sample data
- [ ] Demo Campaign is deletable
- [ ] Returning from canvas/map creator shows Hub
- [ ] Grid is responsive (2-4 columns depending on window width)
- [ ] Grid sorted by last session date (newest first)

## Success Metrics

- New user sees Demo Campaign and can open it in <5 seconds
- Creating a new campaign takes <30 seconds
- Transition animation feels smooth (60fps, <300ms duration)

## Dependencies & Prerequisites

- SQLite (sql.js) already available in dependencies
- Radix UI Dialog already available
- InfiniteCanvas component must accept `campaignId` prop (currently doesn't - needs minor refactor)

## Deferred Questions (from origin)

- Preloaded icon set selection (quantity, style, license) - decide during implementation
- Demo Campaign exact content (characters, map, notes) - define when building seed data
- Exact responsive breakpoints - decide during CSS implementation
- FLIP animation specifics - prototype during Phase 5

## Sources & References

### Origin

- **Origin document:** [docs/brainstorms/2026-05-14-hub-screen-requirements.md](docs/brainstorms/2026-05-14-hub-screen-requirements.md) — Key decisions: minimal wizard (name+system+icon only), zoom-in transition, Demo Campaign at first launch (deletable), Map Creator in header separate from grid.

### Internal References

- App entry point: `src/ui/App.tsx`
- Existing Card component: `src/ui/components/Card/`
- Design tokens: `src/ui/styles/tokens.css`
- SQL.js setup: `package.json` (sql.js dependency)
