---
title: "feat: NPC Tools (Library + Generator)"
type: feat
status: active
date: 2026-05-21
origin: docs/brainstorms/2026-05-21-npc-tools-requirements.md
---

# feat: NPC Tools (Library + Generator)

## Overview

Single tool window with two tabs — NPC Library (searchable database of campaign NPCs) and NPC Generator (randomized NPC creation from predefined lists). Supports custom fields per campaign, portrait images (upload + built-in gallery), and cross-tool drag-and-drop integration with Map Display and Combat Tracker.

## Problem Statement

GMs need to quickly create, store, and retrieve NPCs during sessions. No NPC management exists in Game Master Panel today. (see origin: docs/brainstorms/2026-05-21-npc-tools-requirements.md)

## Proposed Solution

Campaign-wide NPC library stored in dedicated SQLite tables (like bestiary pattern), exposed through a tabbed tool window. Generator tab randomizes from bundled + user-imported name/role/description lists. Drag-and-drop uses existing HTML5 DnD protocol (`application/json`) to integrate with map and combat tools.

## Technical Considerations

### Architecture

- NPCs are **campaign-wide data** (not per-window toolState) — requires dedicated DB tables + IPC handlers (same pattern as bestiary)
- Tool window state (active tab, search query, scroll position) lives in `toolState`
- Custom field definitions stored separately from NPC values (normalization)

### Key Patterns to Follow

- `ToolType` registration: add to union, `TOOL_MIN_SIZES`, `TOOL_DEFAULT_SIZES`, `TOOL_INFO`, `TOOL_CATEGORIES` (`src/ui/canvas/types.ts:5-151`)
- Component rendering: add case to switch in `InfiniteCanvas.tsx:83-119`
- Standard props: `{ toolState, onToolStateChange, campaignId }`
- DnD protocol: `e.dataTransfer.setData('application/json', JSON.stringify({ type: 'npc-character', ... }))` — combat-tracker already handles multiple source types (`src/ui/tools/combat-tracker/CombatTracker.tsx:108-177`)
- Image loading: `window.electronAPI.dialog.openImageFile()` + `readImage(path)` → base64 data URL
- DB pattern: guard clause, SQL with `INSERT ... ON CONFLICT`, call `persist()` after mutations (`src/electron/database.ts`)

### Database Schema

```sql
CREATE TABLE IF NOT EXISTS npc (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  name TEXT NOT NULL,
  type_role TEXT,
  tags TEXT NOT NULL DEFAULT '[]',       -- JSON array of strings
  description TEXT,
  notes TEXT,
  portrait_path TEXT,                     -- file path (rendered via readImage)
  portrait_builtin TEXT,                  -- key for built-in gallery image
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS npc_custom_field_def (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL DEFAULT 'text', -- 'text' | 'number'
  sort_order INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS npc_custom_field_value (
  npc_id TEXT NOT NULL,
  field_id TEXT NOT NULL,
  value TEXT,
  PRIMARY KEY (npc_id, field_id)
);
```

### MapDropPayload Extension

Add `'npc-character'` to existing `MapDropPayload.type` union. Map's drop handler creates a `MapToken` with `sourceType: 'npc'`.

### Combat Tracker Integration

Extend `DragData` type check in CombatTracker to accept `type: 'npc-character'`. Auto-map custom fields by name convention: field named "HP" → `hp`/`maxHp`, "AC"/"Armor" → `armor`, "Initiative" → `initiativeModifier`.

## Implementation Phases

### Phase 1: Foundation (DB + Types + Window Shell)

- [ ] Define `NpcToolState`, `Npc`, `NpcCustomFieldDef` interfaces in `src/ui/tools/npc-tool/types.ts`
- [ ] Add `'npc-tool'` to `ToolType` union and register sizes/info/category in `src/ui/canvas/types.ts`
- [ ] Add rendering case in `InfiniteCanvas.tsx`
- [ ] Create DB tables in `src/electron/database.ts` (schema above)
- [ ] Add IPC handlers: `npc:list`, `npc:get`, `npc:create`, `npc:update`, `npc:delete`, `npc:custom-fields-list`, `npc:custom-field-create`, `npc:custom-field-delete`
- [ ] Add preload API: `window.electronAPI.npc.*`
- [ ] Update `src/ui/electron.d.ts` with NPC API types

### Phase 2: NPC Library Tab

- [ ] Create `NpcTool.tsx` with tab switcher (Library / Generator)
- [ ] `NpcTool.module.css` — glassmorphism styling matching existing tools
- [ ] Library list view with search input + tag filter chips
- [ ] NPC detail/edit view (inline, same panel or slide-over)
- [ ] Create/delete NPC functionality
- [ ] Portrait upload (reuse `dialog.openImageFile` + `readImage`)
- [ ] Custom field management UI (add/remove field definitions per campaign)
- [ ] Custom field values displayed and editable on NPC detail

### Phase 3: NPC Generator Tab

- [ ] Bundle default name lists: `src/ui/tools/npc-tool/data/names.json` (fantasy, slavic categories)
- [ ] Bundle role list + description trait templates + age ranges
- [ ] Generator UI: select Name Type, Gender → click Generate → display result
- [ ] "Save to Library" button on generated NPC
- [ ] JSON import for custom name lists via file dialog
- [ ] Store imported lists in DB or app data (persist across sessions)

### Phase 4: Built-in Avatar Gallery

- [ ] Bundle license-compatible avatar set (generic fantasy portraits) as assets
- [ ] Gallery picker modal/panel in NPC detail view
- [ ] Render built-in avatars from bundled assets (no file path needed)

### Phase 5: Cross-Tool Integration

- [ ] Add drag handle / draggable behavior on NPC list items
- [ ] Set DnD payload: `{ type: 'npc-character', id, name, portraitPath, hp?, maxHp?, armor?, initiativeModifier? }`
- [ ] **Map integration:** Extend `MapDropPayload` type to include `'npc-character'`; add handler in map's drop logic to create token with NPC portrait + name
- [ ] **Combat integration:** Extend combat tracker's `handleDrop` to accept `'npc-character'` type; map custom field values by name convention (HP→hp/maxHp, AC/Armor→armor, Initiative→initiativeModifier)
- [ ] Add `'npc'` to `MapToken.sourceType` union

## Acceptance Criteria

- [ ] NPC tool window opens from context menu under appropriate category
- [ ] Can create, edit, search (by name), filter (by tag), and delete NPCs
- [ ] Custom fields configurable per campaign; values persist
- [ ] Generator produces randomized NPC from lists; saveable to library
- [ ] Custom name list JSON import works and persists
- [ ] Portrait upload from disk displays correctly
- [ ] Built-in avatar gallery available for portrait selection
- [ ] Drag NPC to map → token appears with portrait + name label
- [ ] Drag NPC to combat tracker → combatant created with auto-mapped stats
- [ ] All data persists across app restarts (SQLite)

## Success Metrics

- Generate + save NPC in under 5 seconds
- Find existing NPC by name/tag search immediately
- Drag-to-map and drag-to-combat work in single gesture

## Dependencies & Risks

- **Built-in avatar gallery** needs license-compatible assets (research needed)
- Combat tracker and map drop handlers need extension — low risk, pattern is well-established
- Custom field name-convention mapping may need documentation for users (what field names map to what stats)

## Sources & References

### Origin

- **Origin document:** [docs/brainstorms/2026-05-21-npc-tools-requirements.md](docs/brainstorms/2026-05-21-npc-tools-requirements.md) — Key decisions: single tabbed window, tags-only org, randomization from lists, drag-and-drop for both integrations, name-convention field mapping

### Internal References

- Tool registration pattern: `src/ui/canvas/types.ts:5-151`
- DnD protocol: `src/ui/tools/combat-tracker/CombatTracker.tsx:108-177`
- DB CRUD pattern: `src/electron/database.ts:40-46`
- Image IPC: `src/electron/main.ts:120-130`
- MapToken/MapDropPayload: `src/ui/tools/map-display/types.ts:16-36`
- Combatant interface: `src/ui/tools/combat-tracker/types.ts:17-29`
- Bestiary (similar campaign-wide tool): `src/ui/tools/bestiary/`
