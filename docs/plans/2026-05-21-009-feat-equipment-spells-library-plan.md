---
title: "feat: Equipment & Spells Library with SRD 5e Seed"
type: feat
status: active
date: 2026-05-21
origin: docs/brainstorms/2026-05-21-equipment-spells-library-requirements.md
---

# feat: Equipment & Spells Library with SRD 5e Seed

## Overview

Single tool window providing a searchable, filterable reference library for weapons, armor, equipment, magic items, and spells. Pre-seeded with SRD 5e data. Follows the proven bestiary pattern (left list panel + right detail panel). Users can add custom entries and drag items to the party tracker.

## Problem Statement

GMs currently have no in-app reference for items or spells, forcing them to alt-tab to external sources during sessions. The bestiary solved this for creatures — this tool does the same for equipment and magic.

## Proposed Solution

Replicate the bestiary architecture with domain-specific adaptations:
- One SQLite table `library_entries` with a `category` column discriminating the five types
- SRD seed on first launch (idempotent, like bestiary)
- Drag & drop to party tracker (new: party tracker gains an inventory/spells section)
- Custom entries marked with a `source: 'custom'` flag vs `source: 'srd'`

## Technical Approach

### Architecture

```
src/ui/tools/equipment-library/
├── EquipmentLibrary.tsx          # Main tool component
├── EquipmentLibrary.module.css
├── types.ts                      # LibraryEntry, ItemData, SpellData, filters
├── index.ts
├── components/
│   ├── LibraryList.tsx           # Left panel: search + category tabs + list
│   ├── EntryCard.tsx             # List item (draggable)
│   ├── EntryDetail.tsx           # Right panel: full details
│   ├── EntryForm.tsx             # Create/edit custom entry
│   └── FilterBar.tsx             # Category, rarity, level, school filters
└── hooks/
    ├── useLibraryState.ts        # CRUD + search/filter logic
    └── useLibraryDrag.ts         # Drag & drop setup
```

### Database Schema

```sql
CREATE TABLE IF NOT EXISTS library_entries (
  id TEXT PRIMARY KEY,
  source TEXT NOT NULL DEFAULT 'custom',  -- 'srd' | 'custom'
  category TEXT NOT NULL,                  -- 'weapon' | 'armor' | 'equipment' | 'magic_item' | 'spell'
  name TEXT NOT NULL,
  -- Shared fields
  description TEXT,
  -- Item fields (nullable for spells)
  rarity TEXT,            -- 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary'
  weight REAL,
  cost TEXT,              -- "50 gp"
  properties TEXT,        -- JSON: string[] (e.g. ["finesse", "light"])
  -- Spell fields (nullable for items)
  spell_level INTEGER,    -- 0 = cantrip
  school TEXT,            -- 'evocation', 'abjuration', etc.
  casting_time TEXT,
  range TEXT,
  components TEXT,        -- "V, S, M (a pinch of dust)"
  duration TEXT,
  -- Metadata
  tags TEXT,              -- JSON: string[]
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX idx_library_category ON library_entries(category);
CREATE INDEX idx_library_name ON library_entries(name);
```

### IPC Channels

Following `domain:verb-kebab` convention:

| Channel | Purpose |
|---------|---------|
| `library:list-entries` | List all (or by category) |
| `library:get-entry` | Get single entry by ID |
| `library:save-entry` | Create/update custom entry |
| `library:delete-entry` | Delete custom entry |
| `library:seed-srd` | Idempotent SRD seed |

### Implementation Phases

#### Phase 1: Core Library (standalone)

1. Define types in `types.ts`
2. Create SQLite table + CRUD functions in `database.ts`
3. Add IPC handlers in `main.ts`
4. Declare API shape in `electron.d.ts`
5. Build `useLibraryState` hook
6. Build UI components (LibraryList, EntryDetail, FilterBar, EntryCard)
7. Register tool in canvas tool registry

**Deliverable:** Browsable, searchable library with filter by category/rarity/level.

#### Phase 2: SRD Seed

1. Source SRD 5e JSON data for items and spells (open5e API or static JSON)
2. Create `assets/srd-items.json` and `assets/srd-spells.json`
3. Implement `seedSrdLibrary()` in database.ts (check existence of `srd-longsword`, if present skip)
4. Call seed on DB init

**Deliverable:** Hundreds of pre-loaded entries on first launch.

#### Phase 3: Custom Entries

1. Build `EntryForm.tsx` with fields adapting to selected category
2. Add create/edit/delete flows
3. Visual badge distinguishing SRD (locked) vs custom (editable)

**Deliverable:** Users can add homebrew items/spells.

#### Phase 4: Drag & Drop to Party Tracker

1. `EntryCard` sets `application/json` with `{ type: 'library-entry', entryId, category, name }`
2. Extend party tracker to accept drops:
   - Add inventory section to character cards (collapsible list of item names)
   - Add known-spells section similarly
3. Persist assignments (new table or JSON field on character)

**Deliverable:** Drag item/spell onto a character card to assign it.

## Acceptance Criteria

- [ ] Tool window opens from canvas toolbar, displays 5 category tabs
- [ ] SRD seed populates library on first launch (idempotent)
- [ ] Search by name filters across all categories in < 100ms
- [ ] Filter by: category, rarity (items), level (spells), school (spells)
- [ ] Custom entry CRUD works; custom entries persist across restart
- [ ] SRD entries are read-only; custom entries are editable/deletable
- [ ] Drag entry from library to party tracker assigns it to character
- [ ] Party tracker shows assigned items/spells on character card

## Scope Boundaries (see origin: docs/brainstorms/2026-05-21-equipment-spells-library-requirements.md)

- No combat tracker integration in v1
- No map integration in v1
- No import/export from external files
- No favorites/prepared-spells system
- No editing SRD entries

## Dependencies

- Party tracker must be extended to receive drops and display inventory
- SRD 5e data must be sourced (open5e.com API or static export under OGL)

## Sources & References

### Origin

- **Origin document:** [docs/brainstorms/2026-05-21-equipment-spells-library-requirements.md](docs/brainstorms/2026-05-21-equipment-spells-library-requirements.md)
- Key decisions: single tool with 5 categories, SRD seed, bestiary pattern reuse

### Internal References

- Bestiary pattern: `src/ui/tools/bestiary/` (canonical library implementation)
- Database layer: `src/electron/database.ts`
- IPC type declarations: `src/ui/electron.d.ts`
- Party tracker: `src/ui/tools/party-tracker/`

### External References

- SRD 5e data: https://open5e.com/ (OGL-licensed)
