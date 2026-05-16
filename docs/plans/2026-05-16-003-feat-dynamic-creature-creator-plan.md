---
title: "feat: Dynamic Creature Creator (Party Tracker Model)"
type: feat
status: active
date: 2026-05-16
origin: docs/brainstorms/2026-05-16-bestiary-dynamic-creator-requirements.md
---

# feat: Dynamic Creature Creator (Party Tracker Model)

## Overview

Przebudowa kreatora potworów z hardcoded schematu D&D 5e na w pełni dynamiczny system pól wzorowany na party trackerze (`CardStructure` + `FieldDefinition` + `fieldValues`). Trzy nowe typy pól (`action-list`, `tag-list`, `stat-block`), D&D 2024 preset jako edytowalny default, auto-migracja danych.

## Problem Statement

Obecny bestiary ma 19 sztywnych kolumn DB i hardcoded formularz. Użytkownik nie może dodawać/usuwać pól ani dostosować kreatora do innego systemu RPG. Party tracker ma już w pełni dynamiczny system — bestiary powinien działać identycznie. Dodatkowo brakuje wielu statystyk z Monster Manual 2024.

## Proposed Solution

Zastąpić `CreatureTemplate` interfejsem `fieldValues: Record<string, FieldValue>` + współdzieloną `CreatureStructure` (per kampania, w `campaign_settings`). Rozszerzyć system typów pól o `action-list`, `tag-list`, `stat-block`. Wyekstrahować wspólne komponenty z party trackera do shared abstraction.

## Technical Approach

### Architecture

**Shared field system** — wyodrębniony do `src/ui/components/dynamic-fields/`:

```
src/ui/components/dynamic-fields/
  types.ts              # FieldType, FieldDefinition, FieldValue, SectionDefinition
  FieldRenderer.tsx      # Switch on field.type → render widget
  FieldInput.tsx         # Editable version of each field type
  StructureEditor.tsx    # Add/remove/reorder/configure fields (from CardEditor)
  createDefaultValues.ts # Generate empty fieldValues from structure
  fields/
    NumberField.tsx
    BubblesField.tsx
    TextField.tsx
    TextBoxField.tsx
    RadioField.tsx
    CheckboxField.tsx
    ActionListField.tsx   # NEW
    TagListField.tsx      # NEW
    StatBlockField.tsx    # NEW
```

**Data model:**

```typescript
// Extended FieldType union
type FieldType = 'number' | 'bubbles' | 'text-field' | 'text-box' | 'radio' | 'checkbox'
  | 'action-list' | 'tag-list' | 'stat-block';

// Section grouping (structural, not just UI)
interface SectionDefinition {
  id: string;
  title: string;
  sortOrder: number;
  collapsed?: boolean; // default state
}

// FieldDefinition extends party tracker's with sectionId
interface FieldDefinition {
  id: string;           // deterministic slug, e.g. "ac", "cr", "actions"
  type: FieldType;
  title: string;
  sectionId: string;    // references SectionDefinition.id
  width: '1/3' | '1/2' | '2/3' | 'full';
  textAlign?: 'left' | 'center' | 'right';
  positionAlign?: 'left' | 'center' | 'right';
  settings?: FieldSettings; // type-specific (NumberFieldSettings, etc.)
  sortOrder: number;
}

// CreatureStructure = the full definition
interface CreatureStructure {
  sections: SectionDefinition[];
  fields: FieldDefinition[];
}

// New FieldValue variants
interface ActionListValue {
  type: 'action-list';
  actions: ActionEntry[];
}
interface ActionEntry {
  id: string;
  name: string;
  description: string;
  toHit?: number;
  damage?: string;        // e.g. "2d6 + 3"
  reach?: string;         // e.g. "5 ft." or "range 20/60 ft."
  saveDC?: number;
  saveAbility?: string;   // e.g. "DEX"
  usageLimit?: string;    // e.g. "3/Day", "Recharge 5-6"
}

interface TagListValue {
  type: 'tag-list';
  tags: string[];
}

interface StatBlockValue {
  type: 'stat-block';
  scores: { str: number; dex: number; con: number; int: number; wis: number; cha: number };
  saves: Partial<{ str: number; dex: number; con: number; int: number; wis: number; cha: number }>;
}
```

**CreatureStructure storage:** `campaign_settings` table, key `'creature_structure'`, JSON value. Same pattern as existing `creature_form_config`. Loaded via `useCreatureStructure()` hook with same debounced save pattern.

**Template DB schema change:**

```sql
-- Add field_values column (ALTER TABLE ADD is supported by sql.js)
ALTER TABLE bestiary_templates ADD COLUMN field_values TEXT;
-- Old columns remain (sql.js can't DROP COLUMN), but are ignored after migration
```

**Creature data shape (post-migration):**

```typescript
interface CreatureTemplate {
  id: string;
  name: string;           // still top-level (like Character.name)
  avatarPath: string;     // still top-level (like Character.portraitPath)
  fieldValues: Record<string, FieldValue>;
  createdAt: string;
  updatedAt: string;
}
```

`name` and `avatarPath` stay outside `fieldValues` (consistent with party tracker's `name` + `portraitPath`).

### Implementation Phases

#### Phase 1: Shared Field System Extraction

Extract field types, renderer, and input components from party tracker into `src/ui/components/dynamic-fields/`. Party tracker imports from new location. No behavioral change.

**Tasks:**
- [ ] Create `src/ui/components/dynamic-fields/types.ts` with extended type union (src/ui/tools/party-tracker/types.ts:L1-106 as base)
- [ ] Extract `FieldRenderer`/`FieldInput` from `CharacterCard.tsx:L160-323` to shared components
- [ ] Extract `createDefaultFieldValues` from `PartyTracker.tsx:L35-62`
- [ ] Update party tracker imports to use shared components
- [ ] Verify party tracker still works

**Success:** Party tracker behaves identically, imports from new shared location.

#### Phase 2: New Field Types

Implement `action-list`, `tag-list`, `stat-block` field types.

**Tasks:**
- [ ] `ActionListField.tsx` — list of action entries, each expandable/collapsible, with optional toHit/damage/reach/saveDC/usageLimit fields. Add/remove/reorder entries.
- [ ] `TagListField.tsx` — inline tag chips with text input for adding. Optional `predefinedOptions` in field settings for autocomplete.
- [ ] `StatBlockField.tsx` — 3x2 grid of ability scores (STR/DEX/CON row, INT/WIS/CHA row), each with score input + auto-calculated modifier display + optional save override.
- [ ] Add new types to `FieldValue` discriminated union
- [ ] Add new type options to `StructureEditor`

**Success:** New field types render and edit correctly in isolation.

#### Phase 3: CreatureStructure + D&D 2024 Preset

Define the default `CreatureStructure` with full MM 2024 stat block coverage.

**Tasks:**
- [ ] Create `src/ui/tools/bestiary/defaultCreatureStructure.ts` — D&D 2024 preset with deterministic field IDs
- [ ] Implement `useCreatureStructure()` hook — load from `campaign_settings`, fall back to default, debounced save
- [ ] Add IPC if needed (reuse existing `settings:load`/`settings:save` channels)
- [ ] XP/PB auto-calculation utility from CR (lookup tables from MM 2024, see origin doc)

**D&D 2024 preset field IDs** (deterministic, matching old schema where applicable):

| Section | Field ID | Type | Title |
|---------|----------|------|-------|
| basic | `size` | radio | Size |
| basic | `creature_type` | radio | Creature Type |
| basic | `descriptive_tags` | tag-list | Descriptive Tags |
| basic | `alignment` | radio | Alignment |
| combat | `ac` | number | Armor Class |
| combat | `initiative` | number | Initiative |
| combat | `hp_default` | number | Hit Points |
| combat | `hp_formula` | text-field | HP Formula |
| combat | `speed` | tag-list | Speed |
| abilities | `ability_scores` | stat-block | Ability Scores |
| skills | `skills` | tag-list | Skills |
| defenses | `resistances` | tag-list | Resistances |
| defenses | `vulnerabilities` | tag-list | Vulnerabilities |
| defenses | `immunities_damage` | tag-list | Damage Immunities |
| defenses | `immunities_condition` | tag-list | Condition Immunities |
| info | `senses` | tag-list | Senses |
| info | `languages` | tag-list | Languages |
| info | `cr` | text-field | Challenge Rating |
| info | `gear` | tag-list | Gear |
| traits | `traits` | action-list | Traits |
| actions | `actions` | action-list | Actions |
| actions | `bonus_actions` | action-list | Bonus Actions |
| actions | `reactions` | action-list | Reactions |
| actions | `legendary_actions` | action-list | Legendary Actions |

**Success:** New campaigns get full D&D 2024 structure. Structure editor can modify it.

#### Phase 4: Structure Editor in Campaign Settings

Replace `CreatureFormTab` with a `StructureEditor` for `CreatureStructure`.

**Tasks:**
- [ ] Adapt `StructureEditor.tsx` (generalized from `CardEditor.tsx:L1-443`) to work with sections + fields
- [ ] Section management: add/remove/rename/reorder sections
- [ ] Field management within sections: add/remove/reorder/configure fields
- [ ] Replace `CreatureFormTab.tsx:L1-269` with new editor
- [ ] Migrate existing `CreatureFormConfig` section ordering into `CreatureStructure` if user had customizations (see origin: bestiary-dynamic-creator-requirements.md)

**Design decisions:**
- Removing a field from structure **orphans** data in `fieldValues` (preserved, not rendered, recoverable if field re-added)
- Built-in preset fields have no special protection — user can delete any field

**Success:** User can fully customize creature fields from Campaign Settings.

#### Phase 5: CreatureForm Rewrite

Replace hardcoded `CreatureForm.tsx` with data-driven form rendering from `CreatureStructure`.

**Tasks:**
- [ ] New `CreatureForm.tsx` — iterate `structure.sections`, render collapsible section headers, iterate fields per section, render `FieldInput` for each
- [ ] Wire `fieldValues` read/write with `patch` pattern (existing pattern in CreatureForm.tsx:L41-43)
- [ ] Handle `name` and `avatarPath` as special top-of-form fields (outside structure, like party tracker)
- [ ] XP/PB display: computed read-only values shown next to CR field when CR field exists
- [ ] Instance form: merge template `fieldValues` with instance `overrides`, highlight overridden fields

**Success:** Creature editing works with dynamic fields. All MM 2024 fields editable.

#### Phase 6: Data Migration

Auto-migrate old format on campaign load.

**Tasks:**
- [ ] Detect migration needed: `field_values IS NULL` on any `bestiary_templates` row
- [ ] `ALTER TABLE bestiary_templates ADD COLUMN field_values TEXT` if column doesn't exist
- [ ] Migration mapper: old columns → `fieldValues` Record with deterministic IDs matching preset:
  - `creature_type` → `{ type: 'radio', selected: value }` at key `"creature_type"`
  - `cr` → `{ type: 'text-field', text: value }` at key `"cr"`
  - `hp_default` → `{ type: 'number', value: n }` at key `"hp_default"`
  - `hp_formula` → `{ type: 'text-field', text: value }` at key `"hp_formula"`
  - `ac` → `{ type: 'number', value: n }` at key `"ac"`
  - `speed` (JSON Record) → `{ type: 'tag-list', tags: ["30 ft.", "Fly 60 ft."] }` at key `"speed"`
  - `ability_scores` (JSON) → `{ type: 'stat-block', scores: {...}, saves: {...} }` at key `"ability_scores"` (merge `saving_throws` into `saves`)
  - `actions` (JSON array) → `{ type: 'action-list', actions: [...] }` at key `"actions"` — split by `isLegendary` flag into `"actions"` and `"legendary_actions"`
  - `traits` (JSON array) → `{ type: 'action-list', actions: [...] }` at key `"traits"`
  - `custom_fields` → individual fields added to structure (or orphaned)
  - `tags` → `{ type: 'tag-list', tags: [...] }` at key `"descriptive_tags"`
- [ ] Rewrite instance `overrides` keys to match new field IDs (critical: map old property names to new IDs)
- [ ] Generate `CreatureStructure` if none exists in `campaign_settings` (use D&D 2024 preset)
- [ ] Write migrated `field_values` JSON, call `persist()`
- [ ] Log migration count to console

**Migration safety:**
- Read old columns first, build new `field_values`, write to new column
- Old columns remain (can't drop in sql.js) — serve as implicit backup
- `overrides` key mapping: `{ ac: "ac", cr: "cr", hpDefault: "hp_default", hpFormula: "hp_formula", creatureType: "creature_type", ... }` — camelCase → snake_case deterministic mapping

**Success:** Old campaigns load without data loss. Instance overrides preserved.

#### Phase 7: Cleanup

- [ ] Remove old hardcoded section components from `CreatureForm.tsx`
- [ ] Remove `creatureFormConfig.ts` types (replaced by `CreatureStructure`)
- [ ] Update `CreatureFormTab` → use `StructureEditor`
- [ ] Remove `useCreatureFormConfig` hook (replaced by `useCreatureStructure`)
- [ ] Update `saveBestiaryTemplate` / `loadBestiaryTemplate` in `database.ts` to use `field_values` column
- [ ] Update `electron.d.ts` if IPC signatures changed

## System-Wide Impact

- **Party tracker:** Imports change (shared components), but no behavioral change
- **Combat tracker / Map:** Drag & drop from bestiary passes creature data — consumer code may need to read `fieldValues` instead of hardcoded properties. Verify token creation and initiative list integration.
- **Database:** `ALTER TABLE ADD COLUMN` on first load of old campaigns. Old columns persist as dead weight (harmless).
- **Campaign Settings:** `CreatureFormTab` replaced. `creature_form_config` key in `campaign_settings` becomes orphaned (harmless).

## Acceptance Criteria

- [ ] New campaigns get D&D 2024 preset with all MM 2024 stat block fields
- [ ] User can add/remove/reorder any field and section in Campaign Settings
- [ ] All 9 field types (6 base + 3 new) render and edit correctly
- [ ] Old campaigns auto-migrate without data loss
- [ ] Instance overrides survive migration and work with new field IDs
- [ ] XP and PB auto-display next to CR field
- [ ] Party tracker still works (shared component extraction didn't break it)
- [ ] Collapsible sections in creature form
- [ ] `npm run build` and `npm run lint` pass

## Dependencies & Risks

- **Risk:** Migration corrupts data → mitigated by keeping old columns as backup
- **Risk:** Shared component extraction breaks party tracker → mitigated by Phase 1 isolation + verification
- **Risk:** Complex action-list UI is hard to get right → start minimal (name + description), iterate
- **Dependency:** Campaign Settings panel and `campaign_settings` table must exist (plan 2026-05-16-001/002)

## Sources & References

### Origin

- **Origin document:** [docs/brainstorms/2026-05-16-bestiary-dynamic-creator-requirements.md](docs/brainstorms/2026-05-16-bestiary-dynamic-creator-requirements.md) — Key decisions: full dynamic fields (abandon rigid schema), 3 new field types, D&D 2024 preset as editable default, auto-migration, shared structure per campaign.

### Internal References

- Party tracker types: `src/ui/tools/party-tracker/types.ts:L1-106`
- Party tracker CardEditor: `src/ui/tools/party-tracker/CardEditor.tsx:L1-443`
- Party tracker field rendering: `src/ui/tools/party-tracker/CharacterCard.tsx:L160-323`
- Bestiary current types: `src/ui/tools/bestiary/types.ts:L45-65`
- Bestiary current form: `src/ui/tools/bestiary/components/CreatureForm.tsx:L1-517`
- DB schema: `src/electron/database.ts:L88-134`
- DB CRUD: `src/electron/database.ts:L364-428`
- CreatureFormConfig: `src/ui/canvas/CampaignSettings/creatureFormConfig.ts:L1-102`
- CreatureFormTab: `src/ui/canvas/CampaignSettings/CreatureFormTab.tsx:L1-269`
