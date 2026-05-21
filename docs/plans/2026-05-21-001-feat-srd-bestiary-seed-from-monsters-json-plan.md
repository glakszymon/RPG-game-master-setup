---
title: "feat: Seed Bestiary Library from SRD monsters.json"
type: feat
status: active
date: 2026-05-21
origin: docs/brainstorms/2026-05-15-bestiary-requirements.md
---

# feat: Seed Bestiary Library from SRD monsters.json

## Overview

Use the bundled `assets/monsters.json` (322 SRD creatures) as a pre-populated database for the bestiary library. Instead of requiring the DM to manually create every creature, the app ships with the full SRD monster catalog already available as templates.

This expands the original scope boundary ("Brak importu z plików") by treating the bundled JSON not as a user import but as built-in seed data — part of the application itself.

## Problem Statement / Motivation

Creating 300+ creatures manually is unrealistic. The SRD data is freely available and already present in `assets/monsters.json`. Pre-seeding the library gives immediate value on first launch while still allowing custom homebrew creatures alongside SRD ones.

## Proposed Solution

1. **Conversion module** — a pure function that maps a single `monsters.json` entry to a `CreatureTemplate` object
2. **Seed IPC channel** — `bestiary:seed-srd` triggered on first launch (or manually) to bulk-insert all SRD creatures
3. **SRD tag** — all seeded creatures get a `source:srd` tag to distinguish from homebrew
4. **Idempotent seeding** — uses deterministic IDs (e.g. `srd-<slugified-name>`) so re-seeding doesn't create duplicates

## Technical Approach

### Data Mapping (`assets/monsters.json` → `CreatureTemplate`)

| monsters.json field | CreatureTemplate field | Notes |
|---|---|---|
| `name` | `name` | Direct |
| `type` | `creatureType` | Direct (values match `CreatureType` union) |
| `armor_class` | `ac` | Direct number |
| `hit_points` | `hpDefault` | Direct number |
| `hit_dice` | `hpFormula` | Direct string |
| `challenge_rating` | `cr` | Direct string |
| `speed` (string) | `speed` (Record) | Parse "30 ft., fly 60 ft." → `{walk:30, fly:60}` |
| `strength..charisma` | `abilityScores` | Map 6 fields → `AbilityScores` |
| `*_save` fields | `savingThrows` | Map non-null save fields |
| `special_abilities` | `traits` | Map `{name, desc}` → `CreatureTrait[]` |
| `actions` | `actions` (non-legendary) | Map `{name, desc, attack_bonus, damage_dice, damage_bonus}` → `CreatureAction[]` |
| `legendary_actions` | `actions` (isLegendary=true) | Same mapping with `isLegendary: true` |
| `size` | `customFields` or tag | Add as tag `size:<value>` |
| `alignment` | `customFields` or tag | Add as tag |
| `damage_resistances`, `immunities`, `vulnerabilities` | `customFields` | Key-value pairs |
| `senses`, `languages` | `customFields` | Key-value pairs |
| `condition_immunities` | `customFields` | Key-value |

### Implementation Phases

#### Phase 1: Conversion Module

- **File:** `src/ui/tools/bestiary/srdConversion.ts`
- Pure function `convertSrdMonster(raw: SrdMonster): CreatureTemplate`
- Speed parser: regex on "30 ft., fly 60 ft., swim 40 ft." format
- Deterministic ID generation: `srd-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`
- Tags: `['source:srd', `type:${type}`, `size:${size}`]`
- Unit-testable (no side effects)

#### Phase 2: Seed Logic in Database Layer

- **File:** `src/electron/database.ts` — new function `seedSrdCreatures()`
- Read `monsters.json` from app assets path (use `app.getAppPath()` or bundled resource)
- Convert all 322 entries using Phase 1 function
- Bulk `INSERT OR IGNORE` using deterministic IDs (idempotent)
- Guard: check if `srd-aboleth` exists before seeding (skip if already done)

#### Phase 3: IPC Integration

- **Channel:** `bestiary:seed-srd` in `main.ts`
- **Auto-seed on first launch:** In the database init flow, after table creation, check if bestiary is empty → seed automatically
- **Manual re-seed:** Expose button in bestiary UI ("Load SRD Monsters") for cases where user deleted them

#### Phase 4: Asset Bundling

- Ensure `assets/monsters.json` is included in Electron build (`extraResources` or imported at build time)
- Alternatively: import as static JSON in the main process (Vite handles JSON imports)

### File Changes

| File | Change |
|---|---|
| `src/ui/tools/bestiary/srdConversion.ts` | NEW — conversion function + types for raw SRD format |
| `src/electron/database.ts` | ADD `seedSrdCreatures()` function |
| `src/electron/main.ts` | ADD IPC handler `bestiary:seed-srd`, call seed on init |
| `src/ui/electron.d.ts` | ADD `bestiary.seedSrd()` type |
| `src/electron/preload.ts` | ADD `bestiary.seedSrd` bridge |

### fieldValues Integration

Since the bestiary now uses a dynamic `fieldValues` format (see `templateConversion.ts`), the seed should also populate `fieldValues` directly using `templateToFieldValues()` after building the `CreatureTemplate` object. This ensures seeded creatures work with the new form system without requiring migration.

## Acceptance Criteria

- [ ] On first app launch with empty bestiary, 322 SRD creatures appear in the library
- [ ] All creatures have correct stats (spot-check: Aboleth AC=17, HP=135, CR=10)
- [ ] SRD creatures are tagged `source:srd` and filterable by that tag
- [ ] Re-launching the app does NOT create duplicates
- [ ] User can still create custom homebrew creatures alongside SRD ones
- [ ] Speed field correctly parsed (e.g. "10 ft., swim 40 ft." → `{walk:10, swim:40}`)
- [ ] Legendary actions mapped with `isLegendary: true`
- [ ] Special abilities mapped to traits
- [ ] `npm run build` and `npm run lint` pass

## Dependencies & Risks

- **Risk:** `monsters.json` schema has some inconsistencies (empty strings vs null, `speed_json` field exists on some). Conversion must handle edge cases gracefully.
- **Dependency:** `templateToFieldValues()` already exists and handles the mapping — reuse it.
- **Bundling:** Must verify `assets/monsters.json` is accessible at runtime in packaged builds.

## Sources & References

- **Origin document:** [docs/brainstorms/2026-05-15-bestiary-requirements.md](docs/brainstorms/2026-05-15-bestiary-requirements.md) — key decisions: template/instance model, D&D 5e stat structure, tag-based filtering
- **Asset file:** `assets/monsters.json` — 322 SRD 5e monsters, 20034 lines
- **Existing conversion:** `src/ui/tools/bestiary/templateConversion.ts` — `templateToFieldValues()` for dynamic form compatibility
- **Database schema:** `src/electron/database.ts:152` — `bestiary_templates` table
