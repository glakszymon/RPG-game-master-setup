---
title: "feat: Combat Tracker"
type: feat
status: active
date: 2026-05-18
origin: docs/brainstorms/2026-05-18-combat-tracker-requirements.md
---

# feat: Combat Tracker

## Overview

Narzedzie do prowadzenia walki w czasie rzeczywistym sesji RPG. Sluzy do sledzenia kolejnosci inicjatywy, HP, warunkow/statusow uczestnikow. Integruje sie z Party Trackerem i Bestiariuszem przez drag&drop.

## Problem Statement

GM podczas walki musi zarzadzac wieloma uczestnikami, sledzic tury, HP i statusy. Bez dedykowanego narzedzia jest to powolne i przerywajace flow gry. (see origin: docs/brainstorms/2026-05-18-combat-tracker-requirements.md)

## Proposed Solution

Nowe narzedzie tool-window w istniejacym systemie infinite canvas. Karta kazdego uczestnika wyswietla portret, nazwe, HP, inicjatywe i warunki. System tur z auto-reset i licznikiem rund.

## Technical Approach

### Architecture

Nowy modul w `src/ui/tools/combat-tracker/` nastepujacy wzorzec istniejacych narzedzi (party-tracker pattern):

```
src/ui/tools/combat-tracker/
  types.ts              # CombatTrackerState, Combatant, CombatCondition
  CombatTracker.tsx     # Main component
  CombatTracker.module.css
  components/
    CombatantCard.tsx   # Single combatant row/card
    CombatantCard.module.css
    DamageHealPopup.tsx # HP modification popup
    DamageHealPopup.module.css
    ConditionPicker.tsx # Condition toggle list
    ConditionPicker.module.css
    AddCombatantForm.tsx # Manual add form
    AddCombatantForm.module.css
  hooks/
    useCombatState.ts   # Combat logic (next turn, roll initiative, damage/heal)
  index.ts
```

### State Design

```typescript
// types.ts
interface Combatant {
  id: string;
  name: string;
  portraitPath: string | null;
  hp: number;
  maxHp: number;
  initiativeModifier: number;
  initiativeRoll: number | null;  // null = not yet rolled
  conditions: string[];           // active condition IDs
  sourceType: 'party' | 'bestiary' | 'manual';
  sourceId: string | null;        // reference back to party character or bestiary template
}

interface CombatCondition {
  id: string;
  name: string;
  isCustom: boolean;
}

interface CombatTrackerState {
  combatants: Combatant[];
  activeCombatantIndex: number;   // -1 = combat not started
  currentRound: number;
  conditions: CombatCondition[];  // preset + custom, stored per campaign
  isStarted: boolean;
}
```

### Implementation Phases

#### Phase 1: Core Structure & Display (R1-R5, R8)

- Create tool folder structure and types
- Wire `CombatTracker` component into `InfiniteCanvas.tsx` switch (replace `ToolPlaceholder`)
- Implement `CombatantCard` with portrait, name, HP/MaxHP, initiative, conditions display
- Visual states: active highlight, HP=0 red, overheal green
- Round counter display

**Files to create/modify:**
- `src/ui/tools/combat-tracker/types.ts`
- `src/ui/tools/combat-tracker/CombatTracker.tsx`
- `src/ui/tools/combat-tracker/CombatTracker.module.css`
- `src/ui/tools/combat-tracker/components/CombatantCard.tsx`
- `src/ui/tools/combat-tracker/components/CombatantCard.module.css`
- `src/ui/tools/combat-tracker/index.ts`
- Modify: `src/ui/canvas/InfiniteCanvas.tsx` (add case)

#### Phase 2: Turn System (R6-R7)

- "Next Turn" button advances `activeCombatantIndex`
- Auto-reset to 0 when reaching end, increment `currentRound`
- `useCombatState` hook encapsulating combat logic

**Files to create/modify:**
- `src/ui/tools/combat-tracker/hooks/useCombatState.ts`

#### Phase 3: Adding Combatants (R9-R12)

- Drag from Party Tracker adds combatant with correct stats
- Drag from Bestiary adds single combatant
- Drag encounter set from Encounter Sets tool adds all creatures in set
- Manual add form: name, HP, MaxHP, initiative modifier, portrait
- "+" button opening `AddCombatantForm`

**Files to create/modify:**
- `src/ui/tools/combat-tracker/components/AddCombatantForm.tsx`
- `src/ui/tools/combat-tracker/components/AddCombatantForm.module.css`

#### Phase 4: Initiative System (R13-R16)

- "Roll All" button: `Math.floor(Math.random() * 20) + 1 + modifier` for each combatant
- Sort descending by roll result
- Editable initiative field per combatant (click to edit)
- "Sort" button to re-sort by current values
- Drag&drop reorder (manual override) using existing DnD patterns

#### Phase 5: Damage/Heal (R17-R19)

- Click HP opens `DamageHealPopup`
- Numeric input + Damage/Heal buttons
- HP clamped to minimum 0 on display, overheal allowed above MaxHP

**Files to create/modify:**
- `src/ui/tools/combat-tracker/components/DamageHealPopup.tsx`
- `src/ui/tools/combat-tracker/components/DamageHealPopup.module.css`

#### Phase 6: Conditions (R20-R23)

- Default preset conditions: Stunned, Poisoned, Blinded, Frightened, Prone, Paralyzed, Charmed, Restrained, Invisible, Incapacitated
- `ConditionPicker` popup with checkboxes
- Active conditions as small badges on card
- Custom condition management (add/remove) stored in `CombatTrackerState.conditions`

**Files to create/modify:**
- `src/ui/tools/combat-tracker/components/ConditionPicker.tsx`
- `src/ui/tools/combat-tracker/components/ConditionPicker.module.css`

#### Phase 7: Map Integration & Removal (R24-R27)

- Drag combatant from combat tracker to map creates token (emit `combat-combatant` DnD type)
- Remove button with confirmation dialog
- Reset combat button (clear all, reset round)

### Cross-Tool Drag & Drop Protocol

```typescript
// Accept FROM party-tracker:
{ type: 'party-character', id, name, portraitPath }

// Accept FROM bestiary:
{ type: 'bestiary-creature', id, name, portraitPath }

// Accept FROM encounter-sets (batch):
{ type: 'encounter-set', creatures: Array<{ id, name, portraitPath, hp, maxHp, initiativeModifier }> }

// Emit TO map:
{ type: 'combat-combatant', id, name, portraitPath }
```

When accepting drops, extract HP/MaxHP/initiative from source's `fieldValues` using field names matching the source tool's card structure.

## Acceptance Criteria

- [ ] Combat tracker renders in canvas window with correct min/default size
- [ ] Combatants display portrait, name, HP/MaxHP, initiative, active conditions
- [ ] Active combatant visually highlighted
- [ ] HP=0 shows red card, overheal shows green card
- [ ] "Next Turn" advances active combatant, auto-resets with round increment
- [ ] Round number displayed and increments correctly
- [ ] Drag from Party Tracker adds combatant with correct stats
- [ ] Drag from Bestiary adds combatant with correct stats
- [ ] Drag encounter set adds all creatures from set at once
- [ ] Manual add form creates combatant
- [ ] "Roll All" rolls d20+modifier, sorts descending
- [ ] Initiative editable per combatant manually
- [ ] Drag&drop reorder works
- [ ] Click HP opens Damage/Heal popup
- [ ] Damage reduces HP (min display 0), Heal increases (can exceed max)
- [ ] Condition picker toggles conditions, shown as badges
- [ ] Custom conditions addable per campaign
- [ ] Drag combatant to map creates token
- [ ] Remove with confirmation
- [ ] Reset combat clears all
- [ ] State persists across window close/reopen (via canvas state JSON)
- [ ] `npm run build` passes
- [ ] `npm run lint` passes

## Scope Boundaries

- No player-facing view (see origin)
- No batch add from bestiary (single creature at a time), but encounter sets can drop multiple at once
- Fixed d20 (not configurable)
- No damage history
- No automatic condition effects
- Custom conditions stored in tool state (not separate DB table)

## Dependencies

- Party Tracker already emits `party-character` DnD events ✓
- Bestiary already emits `bestiary-creature` DnD events ✓
- Map tool already accepts token drops (existing `map-token` pattern)
- `combat-tracker` ToolType already registered in canvas types ✓

## Sources & References

- **Origin document:** [docs/brainstorms/2026-05-18-combat-tracker-requirements.md](docs/brainstorms/2026-05-18-combat-tracker-requirements.md) — Key decisions: popup for damage/heal, auto-reset rounds, preset+custom conditions, d20 fixed, GM-only view
- **Inspiration:** [inspiracja/combat tracker.md](inspiracja/combat%20tracker.md) (Mithos app reference)
- **Pattern reference:** `src/ui/tools/party-tracker/` — component structure, state pattern, DnD
- **Canvas integration:** `src/ui/canvas/InfiniteCanvas.tsx:67-142` — tool switch statement
- **DnD protocol:** `application/json` with `type` discriminator
