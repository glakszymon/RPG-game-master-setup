---
title: "feat: Implement new field types for bestiary form"
type: feat
status: active
date: 2026-05-17
origin: docs/brainstorms/2026-05-17-bestiary-field-types-config-requirements.md
---

# feat: Implement new field types for bestiary form

## Overview

The bestiary form currently uses inappropriate field types for many creature stats — radio buttons with 11+ options instead of dropdowns, free-text tags instead of structured numeric inputs, etc. This plan implements 4 new field types (`select`, `speed-list`, `skill-list`, `item-list`), enhances the existing `stat-block`, and reconfigures `tag-list` usage — then updates `defaultCreatureStructure` to use them all correctly.

(see origin: `docs/brainstorms/2026-05-17-bestiary-field-types-config-requirements.md`)

## Problem Statement

Current field type mismatches (from origin R1–R19):
- **Alignment/Size/CreatureType** use `radio` with 6–14 options → needs `select` dropdown
- **Speed** uses `tag-list` → needs structured type+value pairs (R7)
- **Ability Scores** `stat-block` only has Score+Save → needs Score+MOD+SAVE (R8)
- **Skills** uses `tag-list` → needs dropdown pick + numeric bonus (R9)
- **Senses** uses `tag-list` → needs type (from list) + numeric range (R14)
- **Gear** uses `tag-list` → needs name (text) + quantity (number) (R19)
- **Descriptive Tags** field must be removed (R18)

## Proposed Solution

Add 4 new field types to the dynamic-fields system and enhance `stat-block`:

| New Type | Used For | Structure |
|----------|----------|-----------|
| `select` | Alignment, Size, Creature Type | Dropdown with `options: string[]` |
| `speed-list` | Speed | Fixed Walk + optional Fly/Swim/Burrow/Climb, each with numeric value |
| `skill-list` | Skills | Pick from predefined list + numeric bonus per entry |
| `item-list` | Gear | Text name + numeric quantity per entry |

Enhanced existing types:
- `stat-block` → add explicit MOD + SAVE fields (all manual, no auto-calc)
- `tag-list` with `predefinedOptions` → used for Senses (type from list + numeric range as composite tag) — **actually Senses also needs a numeric sub-field**, so use `speed-list` pattern (renamed to generic `keyed-number-list` or keep domain-specific `senses-list`... see decision below)

## Key Decisions

1. **Senses reuse `speed-list` pattern** — both Speed and Senses are "pick a type from predefined list + enter a number". Create a generic component (`KeyedNumberList`) that both `speed-list` and Senses fields use internally, with different settings (see origin: R7, R14).
2. **Single `select` type** covers all dropdowns — settings carry `options: string[]` (see origin: R1, R16, R17).
3. **`stat-block` enhanced in-place** — add `modifiers` and `saves` as separate editable number fields. Remove auto-calc of modifier. All 3 values per ability are manual (see origin: R8).
4. **`skill-list` is purpose-built** — not a generic "tag with number" because it needs dropdown selection from predefined skills (see origin: R9).
5. **`item-list` is generic** — name (text) + quantity (number). Reusable beyond Gear if needed (see origin: R19).
6. **Descriptive Tags removed** from `defaultCreatureStructure` (see origin: R18).
7. **Languages remain `tag-list`** with `predefinedOptions` + custom — no numeric component needed (see origin: R15).
8. **Defenses (Resistances/Vulnerabilities/Immunities) remain `tag-list`** with `predefinedOptions` + custom (see origin: R10–R13).

## Technical Approach

### Architecture

The dynamic-fields system uses a discriminated union pattern. Adding a new field type requires changes in exactly these locations:

1. `src/ui/components/dynamic-fields/types.ts` — add to `FieldType` union, add `FieldValue` variant, add settings interface
2. `src/ui/components/dynamic-fields/FieldInput.tsx` — add case to switch, import new component
3. `src/ui/components/dynamic-fields/fields/` — new component file
4. `src/ui/components/dynamic-fields/index.ts` — add default value factory case
5. `src/ui/tools/bestiary/defaultCreatureStructure.ts` — update field definitions to use new types

### Implementation Phases

#### Phase 1: `select` field type

**Files to create/modify:**
- `src/ui/components/dynamic-fields/types.ts` — add `'select'` to `FieldType`, add `SelectFieldSettings { options: string[] }`, add `{ type: 'select', selected: string }` to `FieldValue`
- `src/ui/components/dynamic-fields/fields/SelectField.tsx` — new component: native `<select>` with options from settings
- `src/ui/components/dynamic-fields/fields/SelectField.module.css` — glassmorphism-styled select
- `src/ui/components/dynamic-fields/FieldInput.tsx` — add `case 'select'`
- `src/ui/components/dynamic-fields/index.ts` — add default value for `select`
- `src/ui/tools/bestiary/defaultCreatureStructure.ts` — change Alignment, Size, Creature Type from `radio` to `select`

**Acceptance criteria:**
- [ ] Dropdown renders with all options from settings
- [ ] Selected value persists correctly
- [ ] Glassmorphism styling consistent with other fields

#### Phase 2: Enhanced `stat-block`

**Files to modify:**
- `src/ui/components/dynamic-fields/types.ts` — add `modifiers: Partial<AbilityScores>` to stat-block FieldValue (saves already exists)
- `src/ui/components/dynamic-fields/fields/StatBlockField.tsx` — add editable MOD and SAVE number inputs per ability (3 rows: Score, MOD, SAVE)
- `src/ui/components/dynamic-fields/fields/StatBlockField.module.css` — adjust grid for 3 rows

**Acceptance criteria:**
- [ ] Each ability shows 3 editable fields: Score, MOD, SAVE
- [ ] No auto-calculation — all values are manual
- [ ] Existing stat-block data (scores + saves) migrates cleanly (modifiers default to 0)
- [ ] Grid layout remains compact and readable

#### Phase 3: `speed-list` field type (reused for Senses)

**Files to create/modify:**
- `src/ui/components/dynamic-fields/types.ts` — add `'speed-list'` to `FieldType`, add `SpeedListFieldSettings { entries: Array<{ key: string, label: string, alwaysVisible?: boolean }> }`, add `{ type: 'speed-list', values: Record<string, number | null> }` to FieldValue
- `src/ui/components/dynamic-fields/fields/SpeedListField.tsx` — component: always-visible entries + "+" button to add optional ones, each with numeric input
- `src/ui/components/dynamic-fields/fields/SpeedListField.module.css`
- `src/ui/components/dynamic-fields/FieldInput.tsx` — add case
- `src/ui/components/dynamic-fields/index.ts` — add default value
- `src/ui/tools/bestiary/defaultCreatureStructure.ts` — change Speed field to `speed-list` with entries: `[{key:'walk', label:'Walk', alwaysVisible:true}, {key:'fly', label:'Fly'}, {key:'swim', label:'Swim'}, {key:'burrow', label:'Burrow'}, {key:'climb', label:'Climb'}]`; change Senses to `speed-list` with entries: `[{key:'darkvision', label:'Darkvision'}, {key:'blindsight', label:'Blindsight'}, {key:'tremorsense', label:'Tremorsense'}, {key:'truesight', label:'Truesight'}]` + custom option

**Acceptance criteria:**
- [ ] `alwaysVisible` entries shown by default with numeric input
- [ ] Optional entries added via "+" button (dropdown of remaining options)
- [ ] Each entry shows label + number input (ft/meters)
- [ ] Entries can be removed (except alwaysVisible ones)
- [ ] Works for both Speed and Senses configurations

#### Phase 4: `skill-list` field type

**Files to create/modify:**
- `src/ui/components/dynamic-fields/types.ts` — add `'skill-list'` to FieldType, add `SkillListFieldSettings { options: string[] }`, add `{ type: 'skill-list', skills: Array<{ name: string, bonus: number }> }` to FieldValue
- `src/ui/components/dynamic-fields/fields/SkillListField.tsx` — component: list of added skills (each: name label + bonus number input + remove button) + "Add" button with dropdown of remaining skills
- `src/ui/components/dynamic-fields/fields/SkillListField.module.css`
- `src/ui/components/dynamic-fields/FieldInput.tsx` — add case
- `src/ui/components/dynamic-fields/index.ts` — add default value
- `src/ui/tools/bestiary/defaultCreatureStructure.ts` — change Skills from `tag-list` to `skill-list` with 18 D&D skills as options

**Acceptance criteria:**
- [ ] "Add" button opens dropdown with available (not yet added) skills
- [ ] Each skill shows name + editable numeric bonus
- [ ] Skills can be removed
- [ ] Dropdown filters out already-added skills

#### Phase 5: `item-list` field type

**Files to create/modify:**
- `src/ui/components/dynamic-fields/types.ts` — add `'item-list'` to FieldType, add `{ type: 'item-list', items: Array<{ name: string, quantity: number }> }` to FieldValue
- `src/ui/components/dynamic-fields/fields/ItemListField.tsx` — component: list of items (text input + number input + remove) + "Add" button
- `src/ui/components/dynamic-fields/fields/ItemListField.module.css`
- `src/ui/components/dynamic-fields/FieldInput.tsx` — add case
- `src/ui/components/dynamic-fields/index.ts` — add default value
- `src/ui/tools/bestiary/defaultCreatureStructure.ts` — change Gear from `tag-list` to `item-list`

**Acceptance criteria:**
- [ ] "Add" button creates new empty row (name + quantity)
- [ ] Each item has text field for name, number field for quantity, remove button
- [ ] Empty items can be removed

#### Phase 6: Update `defaultCreatureStructure` + cleanup

**Files to modify:**
- `src/ui/tools/bestiary/defaultCreatureStructure.ts` — apply all type changes, remove Descriptive Tags field
- `src/ui/tools/bestiary/hooks/useCreatureStructure.ts` — update migration logic to handle transition from old field types (radio→select, tag-list→speed-list/skill-list/item-list)

**Acceptance criteria:**
- [ ] Descriptive Tags field removed
- [ ] All fields use correct new types per requirements
- [ ] Existing creature data doesn't crash (graceful fallback for type mismatches)
- [ ] `npm run build` passes
- [ ] `npm run lint` passes (no new errors)

## System-Wide Impact

- **FieldInput switch** — grows from 9 to 13 cases. No performance concern (simple switch dispatch).
- **Saved creature data** — existing `fieldValues` in SQLite may have old types (e.g. `radio` value for Alignment). The migration in `useCreatureStructure` resets the structure, but field *values* in saved creatures retain their old shape. Components should handle `undefined`/mismatched values gracefully with defaults.
- **Party Tracker** — unaffected. It uses the same dynamic-fields system but different field configurations. New types are available but not used there unless opted in.
- **Instance overrides** — Bestiary instances store overrides as `Partial<Record<string, FieldValue>>`. New field value shapes will only appear in newly-created/edited creatures.

## Acceptance Criteria

- [ ] `select` dropdown works for Alignment (11 options), Size (6), Creature Type (14)
- [ ] `stat-block` shows Score + MOD + SAVE per ability (all editable, no auto-calc)
- [ ] `speed-list` works for Speed (Walk always visible + 4 optional) and Senses (4 types + custom)
- [ ] `skill-list` shows dropdown of 18 skills + numeric bonus per added skill
- [ ] `item-list` works for Gear (name + quantity per item)
- [ ] Descriptive Tags field removed from default structure
- [ ] Defenses and Languages remain `tag-list` with `predefinedOptions`
- [ ] `npm run build` passes
- [ ] `npm run lint` passes (no new errors from bestiary changes)
- [ ] Existing creatures with old field types don't crash the app

## Sources & References

- **Origin document:** [docs/brainstorms/2026-05-17-bestiary-field-types-config-requirements.md](docs/brainstorms/2026-05-17-bestiary-field-types-config-requirements.md) — defines exact field types, options, and locations for all 24 requirements (R1–R24)
- Dynamic fields types: `src/ui/components/dynamic-fields/types.ts`
- FieldInput dispatcher: `src/ui/components/dynamic-fields/FieldInput.tsx`
- Existing field components: `src/ui/components/dynamic-fields/fields/`
- Default structure: `src/ui/tools/bestiary/defaultCreatureStructure.ts`
- Structure migration: `src/ui/tools/bestiary/hooks/useCreatureStructure.ts`
