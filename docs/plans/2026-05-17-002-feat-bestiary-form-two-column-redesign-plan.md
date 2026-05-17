---
title: "feat: Bestiary form two-column layout redesign"
type: feat
status: active
date: 2026-05-17
origin: docs/brainstorms/2026-05-17-bestiary-form-redesign-requirements.md
---

# feat: Bestiary form two-column layout redesign

## Overview

Przebudowa `CreatureForm` z jednokolumnowego layoutu z sekcjami zwijalnymi na dwukolumnowy layout (40/60) ze sticky nagłówkiem. Lewa kolumna = pola liczbowe/krótkie, prawa = cechy i akcje. Sekcje z nagłówkami, bez collapse.

## Problem Statement / Motivation

Formularz bestii jest nieczytelny — jednokolumnowy, ciągłe scrollowanie, sekcje zwijalne zabierają miejsce. Nie wykorzystuje dostępnej przestrzeni. (see origin: docs/brainstorms/2026-05-17-bestiary-form-redesign-requirements.md)

## Proposed Solution

### Approach: Column attribute on SectionDefinition

Dodać `column?: 'left' | 'right' | 'header'` do `SectionDefinition`. Sekcje z `column: 'header'` renderowane w sticky nagłówku, reszta rozdzielana na dwie kolumny. To podejście:
- Nie łamie istniejącej konfiguracji (pole opcjonalne, fallback = 'left')
- Działa z dynamicznym systemem pól — Campaign Settings editor może zmieniać przypisanie
- Sekcje (nie pola) decydują o kolumnie — prostsze niż per-field

### Reorganizacja sekcji w defaultCreatureStructure

Obecne 8 sekcji → nowy podział:

| Nowa sekcja | Column | Pola (z obecnych sekcji) |
|---|---|---|
| **Header** (sticky) | `header` | `alignment`, `cr` (wyciągnięte z basic/info) |
| **Combat** | `left` | `ac`, `initiative`, `hp_default`, `hp_formula`, `speed` |
| **Ability Scores** | `left` | `ability_scores` |
| **Skills** | `left` | `skills` |
| **Defenses** | `left` | `resistances`, `vulnerabilities`, `immunities_damage`, `immunities_condition` |
| **Senses & Languages** | `left` | `senses`, `languages` |
| **Info** | `left` | `size`, `creature_type`, `descriptive_tags`, `gear` |
| **Traits** | `right` | `traits` |
| **Actions** | `right` | `actions` |
| **Bonus Actions** | `right` | `bonus_actions` |
| **Reactions** | `right` | `reactions` |
| **Legendary Actions** | `right` | `legendary_actions` |

## Technical Approach

### Phase 1: Extend types + update default structure

**Files:**
- `src/ui/components/dynamic-fields/types.ts` — add `column?: 'left' | 'right' | 'header'` to `SectionDefinition`
- `src/ui/tools/bestiary/defaultCreatureStructure.ts` — restructure SECTIONS and reassign fields to new sections

```typescript
// types.ts addition
export interface SectionDefinition {
  id: string;
  title: string;
  sortOrder: number;
  collapsed?: boolean;
  column?: 'left' | 'right' | 'header'; // NEW
}
```

New sections in defaultCreatureStructure:
```typescript
const SECTIONS: SectionDefinition[] = [
  { id: 'header', title: 'Header', sortOrder: -1, column: 'header' },
  { id: 'combat', title: 'Combat', sortOrder: 0, column: 'left' },
  { id: 'abilities', title: 'Ability Scores', sortOrder: 1, column: 'left' },
  { id: 'skills', title: 'Skills', sortOrder: 2, column: 'left' },
  { id: 'defenses', title: 'Defenses', sortOrder: 3, column: 'left' },
  { id: 'senses', title: 'Senses & Languages', sortOrder: 4, column: 'left' },
  { id: 'info', title: 'Info', sortOrder: 5, column: 'left' },
  { id: 'traits', title: 'Traits', sortOrder: 0, column: 'right' },
  { id: 'actions', title: 'Actions', sortOrder: 1, column: 'right' },
  { id: 'bonus_actions', title: 'Bonus Actions', sortOrder: 2, column: 'right' },
  { id: 'reactions', title: 'Reactions', sortOrder: 3, column: 'right' },
  { id: 'legendary', title: 'Legendary Actions', sortOrder: 4, column: 'right' },
];
```

Move `alignment` and `cr` fields to `sectionId: 'header'`. Move `size`, `creature_type`, `descriptive_tags` to `sectionId: 'info'`. Split old `actions` section fields into separate sections (`bonus_actions`, `reactions`, `legendary`).

### Phase 2: Rewrite CreatureForm layout

**File:** `src/ui/tools/bestiary/components/CreatureForm.tsx`

Replace current single-column render with:

```tsx
<div className={styles.creatureFormRoot}>
  {/* Sticky header */}
  <div className={styles.formStickyHeader}>
    <AvatarPreview ... />
    <NameInput ... />
    {/* Render header-column fields (alignment, CR) inline */}
    {headerFields.map(f => <DynamicField ... />)}
    {/* CR-derived XP + PB */}
  </div>

  {/* Two-column body */}
  <div className={styles.formColumns}>
    <div className={styles.formColumnLeft}>
      {leftSections.map(s => <FormSection ... />)}
    </div>
    <div className={styles.formColumnRight}>
      {rightSections.map(s => <FormSection ... />)}
    </div>
  </div>

  {/* Delete button */}
</div>
```

Key changes:
- Remove `collapsed` state and toggle logic entirely
- Group sections by `column` using `useMemo`
- `FormSection` replaces `DynamicSection` — no collapse, just title + separator + fields grid
- `sortOrder` scoped per-column (left sections sort among themselves, right among themselves)

### Phase 3: CSS Module updates

**File:** `src/ui/tools/bestiary/Bestiary.module.css`

New/modified classes:
```css
.creatureFormRoot {
  display: flex;
  flex-direction: column;
}

.formStickyHeader {
  position: sticky;
  top: 0;
  z-index: 10;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  background: var(--color-bg-surface);
  backdrop-filter: blur(var(--glass-blur));
  border-bottom: 1px solid var(--color-border);
}

.formColumns {
  display: flex;
  gap: var(--space-4);
  padding: var(--space-3);
}

.formColumnLeft {
  width: 40%;
  min-width: 0;
}

.formColumnRight {
  width: 60%;
  min-width: 0;
}
```

Remove: `.formSectionChevron`, `.formSectionChevronOpen`, collapse-related styles.
Update: `.formSection` — remove click handler styling, keep as simple container with bottom border.

### Phase 4: Validation

- `npm run build` — TypeScript check
- `npm run lint` — ESLint pass
- Manual: verify sticky header stays visible, columns render correctly, all fields accessible

## Acceptance Criteria

- [ ] Sticky header shows name, avatar, alignment, CR (R2)
- [ ] Two columns render with 40/60 split (R1)
- [ ] Left column has 6 sections: Combat, Ability Scores, Skills, Defenses, Senses & Languages, Info (R5)
- [ ] Right column has 5 sections: Traits, Actions, Bonus Actions, Reactions, Legendary Actions (R6)
- [ ] No collapse/expand mechanism present (R4)
- [ ] Both columns scroll together (R3)
- [ ] All existing fields remain functional and save correctly (R8)
- [ ] `npm run build` passes
- [ ] `npm run lint` passes

## Scope Boundaries

- NOT unifying CreatureForm + InstanceForm (separate future task)
- NOT changing left library panel
- NOT adding new field types or fields
- NOT changing persistence/IPC layer

## Dependencies & Risks

- **Backward compatibility:** Adding optional `column` to `SectionDefinition` is safe — existing saved structures without it will render all sections in left column (safe default)
- **Campaign Settings editor:** The structure editor (CreatureFormTab in CampaignSettings) may need minor updates to expose the new `column` property — but this is out of scope for now (users can edit JSON or it defaults)
- **Sticky header with scrollable parent:** The `.rightPanel` in Bestiary layout uses `overflow-y: auto` — sticky will work within this scroll container

## Sources & References

- **Origin document:** [docs/brainstorms/2026-05-17-bestiary-form-redesign-requirements.md](docs/brainstorms/2026-05-17-bestiary-form-redesign-requirements.md) — key decisions: 40/60 columns, sticky header with alignment+CR, no collapse, shared scroll
- Current form: `src/ui/tools/bestiary/components/CreatureForm.tsx`
- Types: `src/ui/components/dynamic-fields/types.ts:61-80`
- Default structure: `src/ui/tools/bestiary/defaultCreatureStructure.ts`
- CSS: `src/ui/tools/bestiary/Bestiary.module.css`
