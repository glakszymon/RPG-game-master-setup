---
title: "feat: Bestiary — Creature Library & Encounter Sets"
type: feat
status: active
date: 2026-05-15
origin: docs/brainstorms/2026-05-15-bestiary-requirements.md
---

# feat: Bestiary — Creature Library & Encounter Sets

## Overview

A dual-panel tool window for managing a persistent creature library (templates) and hierarchical encounter sets (instances). Creatures can be dragged to the map (tokens) and combat tracker (initiative) without manual data entry. The template/instance pattern ensures edits propagate while allowing per-instance overrides.

## Problem Statement

DMs need to prepare creatures before sessions and access them during play. Currently there's no persistent storage for statblocks or way to organize them by scenario. Monsters must reach the map and combat tracker without re-typing stats. (see origin: docs/brainstorms/2026-05-15-bestiary-requirements.md)

## Proposed Solution

A new tool module `src/ui/tools/bestiary/` with:
- SQLite tables for templates, encounter set folders, and instances
- Dual-panel UI: left panel switches between Library (flat list + search) and Sets (tree view); right panel shows detail/edit form
- Lazy propagation: instances store only overridden fields; render merges template + overrides
- Integration with existing `MapDropPayload` protocol and future combat tracker

## Technical Approach

### Architecture

```
src/ui/tools/bestiary/
  Bestiary.tsx              # Root component, dual-panel layout
  Bestiary.module.css
  types.ts                  # BestiaryState, CreatureTemplate, CreatureInstance, etc.
  hooks/
    useBestiaryState.ts     # Main state hook, CRUD operations via IPC
    useLibraryPanel.ts      # Search, filter, tag management
    useEncounterTree.ts     # Tree CRUD, drag reorder, expand/collapse
  components/
    LibraryPanel.tsx        # Left panel: library view
    EncounterTreePanel.tsx  # Left panel: sets/tree view
    CreatureForm.tsx        # Right panel: sectioned edit form
    TreeNode.tsx            # Recursive tree node with context menu
    CreatureCard.tsx        # Compact card in library list
  index.ts
```

### Database Schema (SQLite)

```sql
-- Creature templates (global library)
CREATE TABLE IF NOT EXISTS bestiary_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  creature_type TEXT,          -- beast, undead, humanoid, etc.
  cr TEXT,                     -- "1/4", "1", "5", etc. (text for fractions)
  hp_formula TEXT,             -- "4d8+4"
  hp_default INTEGER,
  ac INTEGER,
  speed TEXT,                  -- JSON: {"walk":30,"fly":60}
  ability_scores TEXT,         -- JSON: {"str":16,"dex":12,...}
  saving_throws TEXT,          -- JSON: {"str":5,"con":3}
  actions TEXT,                -- JSON array of Action objects
  traits TEXT,                 -- JSON array of Trait objects
  custom_fields TEXT,          -- JSON: {"key":"value",...}
  tags TEXT,                   -- JSON array: ["undead","SRD","homebrew"]
  avatar_path TEXT,            -- base64 data URL or null
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Encounter set folders (hierarchical via parent_id)
CREATE TABLE IF NOT EXISTS bestiary_folders (
  id TEXT PRIMARY KEY,
  parent_id TEXT,              -- NULL = root level
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (parent_id) REFERENCES bestiary_folders(id) ON DELETE CASCADE
);

-- Creature instances (in encounter sets)
CREATE TABLE IF NOT EXISTS bestiary_instances (
  id TEXT PRIMARY KEY,
  folder_id TEXT NOT NULL,
  template_id TEXT,            -- NULL if orphaned (template deleted)
  instance_name TEXT,          -- optional custom name override
  overrides TEXT,              -- JSON of overridden fields only
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (folder_id) REFERENCES bestiary_folders(id) ON DELETE CASCADE,
  FOREIGN KEY (template_id) REFERENCES bestiary_templates(id) ON DELETE SET NULL
);
```

**Design decisions:**
- **Adjacency list** for folder hierarchy (simple, works well with sql.js which lacks recursive CTEs in some builds; tree is loaded fully into memory anyway since sets are small)
- **`ON DELETE SET NULL`** for template reference — orphaned instances keep their overrides as full data (see origin R12)
- **Lazy propagation** — instance renders by merging template fields with its `overrides` JSON. No eager copying needed. When template is edited, all instances automatically reflect changes on next render for non-overridden fields (see origin R4)
- **CR stored as TEXT** — supports fractions like "1/4", "1/2"

### Implementation Phases

#### Phase 1: Foundation — Schema, Types, Basic CRUD

- Add SQLite table creation in `database.ts`
- Define all TypeScript types in `bestiary/types.ts`
- Implement IPC handlers: `bestiary:list-templates`, `bestiary:save-template`, `bestiary:delete-template`, `bestiary:list-folders`, `bestiary:save-folder`, `bestiary:delete-folder`, `bestiary:list-instances`, `bestiary:save-instance`, `bestiary:delete-instance`
- Add type declarations to `electron.d.ts`
- Wire up `useBestiaryState` hook with IPC calls

**Files:**
- `src/electron/database.ts` — new table creation + CRUD functions
- `src/electron/main.ts` — new IPC handlers
- `src/electron/preload.ts` — expose bestiary API
- `src/ui/electron.d.ts` — type declarations
- `src/ui/tools/bestiary/types.ts`
- `src/ui/tools/bestiary/hooks/useBestiaryState.ts`

#### Phase 2: UI Shell — Dual Panel Layout

- `Bestiary.tsx` with left/right panel split
- Left panel tab switching: Library vs Sets
- `LibraryPanel.tsx` — list of templates with search input and tag filter
- `CreatureForm.tsx` — sectioned scrollable form (Basic, Abilities, Actions, Traits, Custom Fields)
- Only name required for creation (see origin R14)
- Avatar upload via existing `dialog:read-image` IPC

**Files:**
- `src/ui/tools/bestiary/Bestiary.tsx`
- `src/ui/tools/bestiary/Bestiary.module.css`
- `src/ui/tools/bestiary/components/LibraryPanel.tsx`
- `src/ui/tools/bestiary/components/CreatureForm.tsx`
- `src/ui/tools/bestiary/components/CreatureCard.tsx`
- `src/ui/tools/bestiary/index.ts`

#### Phase 3: Encounter Tree

- `EncounterTreePanel.tsx` — recursive tree with expand/collapse
- `TreeNode.tsx` — renders folder or instance, context menu (right-click)
- Drag & drop within tree for reordering (same pattern as party-tracker live reorder)
- Drag from Library to tree to create instance
- CR color coding on instance nodes (green/yellow/red)

**Files:**
- `src/ui/tools/bestiary/components/EncounterTreePanel.tsx`
- `src/ui/tools/bestiary/components/TreeNode.tsx`
- `src/ui/tools/bestiary/hooks/useEncounterTree.ts`

#### Phase 4: Cross-Tool Integration (Drag & Drop)

- Drag instance from tree to map — uses existing `MapDropPayload` with `type: 'bestiary-creature'`
- Drag instance to combat tracker (when implemented) — same payload protocol
- Extend `CharacterCard.tsx` pattern: `draggable`, `onDragStart` sets `application/json` with `MapDropPayload`

**Files:**
- `src/ui/tools/bestiary/components/TreeNode.tsx` (add draggable + dataTransfer)
- `src/ui/tools/map-display/MapDisplay.tsx` (already handles `bestiary-creature` type in `MapDropPayload`)

### Drag & Drop Payload Format

Extends existing `MapDropPayload` (already defined in `map-display/types.ts:28`):

```typescript
// Already exists — no changes needed
interface MapDropPayload {
  type: 'party-character' | 'bestiary-creature';
  id: string;
  name: string;
  portraitPath: string | null;
  meta?: Record<string, unknown>;
}
```

For bestiary, `meta` will carry: `{ cr, creatureType, hp, ac }` for combat tracker use.

## System-Wide Impact

### Interaction Graph

- Bestiary instance drag → `MapDisplay.onDrop` handler (already parses `bestiary-creature`) → creates `MapToken` with `sourceType: 'bestiary'`
- Template edit → all instances re-render with updated data (lazy, in-memory merge)
- Template delete → `ON DELETE SET NULL` → instances become orphaned, retain overrides as full snapshot

### Error Propagation

- IPC failures return `null` — UI shows empty state, retries on next load
- Invalid JSON in `overrides` column — fall back to template-only data with console.error
- Missing avatar path — fallback to creature type emoji icon (see origin R10)

### State Lifecycle Risks

- **Orphaned instances:** Handled by design — `template_id` becomes NULL, overrides contain full data copy at time of last edit
- **Folder delete cascade:** SQLite `ON DELETE CASCADE` removes child folders and instances atomically
- **Partial save:** Each IPC call is a single transaction followed by `persist()` — same as existing pattern

### API Surface Parity

- IPC pattern matches existing `canvas:save`/`canvas:load`, `campaigns:*` conventions
- Tool state stored in `WindowState.toolState` as `BestiaryToolState` (which panel is active, selected item, etc.)
- Drag payload uses same `MapDropPayload` interface as party-tracker

## Acceptance Criteria

### Functional Requirements

- [ ] Create/edit/delete creature templates with D&D 5e stats + custom fields
- [ ] Search and filter library by name and tags
- [ ] Create hierarchical folder structure of unlimited depth
- [ ] Create instances from templates; instances show merged template+override data
- [ ] Edit instance overrides without affecting template
- [ ] Edit template propagates to non-overridden instance fields
- [ ] Delete template orphans instances (retain data, lose link)
- [ ] Drag instance to map creates token
- [ ] Context menu on tree nodes: new folder, rename, delete, duplicate
- [ ] Drag & drop reorder within tree
- [ ] Drag from library to encounter set folder creates instance
- [ ] Avatar upload with type-emoji fallback
- [ ] CR color indicator on tree instance nodes
- [ ] Only name required to create a creature
- [ ] Actions support structured + free-text hybrid mode

### Non-Functional Requirements

- [ ] Tree renders smoothly with 50+ nodes
- [ ] All data persists across app restarts
- [ ] Passes `npm run build` and `npm run lint`

## Dependencies & Prerequisites

- Map display already handles `bestiary-creature` in `MapDropPayload` (confirmed in `map-display/types.ts:29`)
- `ToolType 'bestiary'` already registered in `canvas/types.ts:8`
- `dialog:read-image` IPC channel exists for avatar upload
- Combat tracker integration deferred until combat tracker is built

## Risk Analysis & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| Tree performance with deep nesting | Low — small data set | Virtualize only if >200 nodes; start simple |
| Orphan data bloat | Low | Overrides JSON is compact; no action needed |
| sql.js missing recursive CTE | Medium | Load full folder list, build tree in JS (adjacency list is simple) |
| Form complexity (many sections) | Medium | Collapsible sections, only name required initially |

## Sources & References

### Origin

- **Origin document:** [docs/brainstorms/2026-05-15-bestiary-requirements.md](docs/brainstorms/2026-05-15-bestiary-requirements.md) — Key decisions: template/instance with lazy propagation, unlimited tree depth, D&D 5e + custom fields, drag & drop as primary integration mechanism

### Internal References

- Drag payload protocol: `src/ui/tools/map-display/types.ts:27-34`
- Party tracker DnD pattern: `src/ui/tools/party-tracker/CharacterCard.tsx:90-92`
- Database CRUD pattern: `src/electron/database.ts:97-124`
- Tool registration: `src/ui/canvas/types.ts:8`
- IPC architecture: `src/electron/main.ts`, `src/electron/preload.ts`
