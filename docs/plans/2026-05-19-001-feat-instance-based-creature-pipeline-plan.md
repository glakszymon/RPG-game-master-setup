---
title: "feat: Instance-Based Creature Pipeline"
type: feat
status: active
date: 2026-05-19
deepened: 2026-05-19
origin: docs/brainstorms/2026-05-19-module-dependency-graph-requirements.md
---

# Instance-Based Creature Pipeline

## Enhancement Summary

**Deepened on:** 2026-05-19
**Key improvements:**
1. Instance creation moved to IPC layer (works even when Encounter Sets window is closed)
2. DB transactions for batch operations (prevents partial state on failure)
3. Type-safe drag payload system with compile-time drop zone validation
4. Mount-time validation pattern (tools re-validate against DB on open, don't rely solely on events)
5. Duplicate drop prevention (same instance can't appear twice on map)
6. State migration strategy using `PRAGMA user_version`

## Overview

Refactor the creature data flow so that Encounter Sets is the single source of creature instances. All modules (Map Display, Combat Tracker) reference instances by ID rather than creating independent copies. This eliminates data duplication, ensures portrait/stats consistency, and enforces the pipeline: Bestiary → Encounter Sets → Map/Combat.

## Problem Statement

Currently, dragging a creature from Bestiary to Map creates a token with `sourceId = templateId`. This token is disconnected from any instance — it has no live link to stats, no shared HP with Combat Tracker, and loses portrait data. Multiple drags create multiple disconnected copies with no single source of truth.

## Proposed Solution

1. **Encounter Sets becomes the instance registry** — every creature on the map or in combat must have a corresponding `CreatureInstance` in ES
2. **MapToken references instanceId** — tokens link to instances, not templates
3. **Block direct Bestiary → Map** — force the pipeline
4. **Notepad "Create Encounter Group"** — one button to create ES folder with instances from @mentions
5. **Load preset spawns instances** — macro creates/reuses instances then places tokens
6. **Cascade deletion** — removing instance from ES removes token + combatant with confirmation

## Technical Approach

### Phase 1: Data Model Changes

#### 1.1 Extend MapToken type

**File:** `src/ui/tools/map-display/types.ts`

```typescript
export interface MapToken {
  id: string;
  sourceType: 'party' | 'instance' | 'manual'; // 'bestiary' removed
  sourceId: string;        // instanceId for creatures, characterId for party
  instanceId?: string;     // explicit link to CreatureInstance.id
  name: string;
  avatarPath: string | null;
  x: number;
  y: number;
  scale: number;
}
```

#### 1.2 Add shared instance state table

**File:** `src/electron/database.ts`

```sql
CREATE TABLE IF NOT EXISTS creature_instance_state (
  instance_id TEXT PRIMARY KEY,
  current_hp INTEGER,
  max_hp INTEGER,
  conditions TEXT,  -- JSON array
  is_on_map INTEGER NOT NULL DEFAULT 0,
  map_token_id TEXT,
  is_in_combat INTEGER NOT NULL DEFAULT 0
);
```

**Research insight:** Don't use SQL `FOREIGN KEY ... ON DELETE CASCADE` with sql.js. FK enforcement requires `PRAGMA foreign_keys = ON` per connection and is unreliable in WASM. Handle cascade in application code where you can show confirmation UI.

This separates combat/runtime state from the instance definition. Template stats (AC, attacks) are always read from the template via `templateId`.

#### 1.3 New IPC channels

**File:** `src/electron/preload.ts` + `main.ts`

```typescript
bestiary: {
  // existing...
  getInstanceState: (instanceId: string) => invoke('bestiary:get-instance-state', instanceId),
  updateInstanceState: (instanceId: string, stateJson: string) => invoke('bestiary:update-instance-state', instanceId, stateJson),
  batchCreateInstances: (templateIds: string[], folderId: string) => invoke('bestiary:batch-create-instances', templateIds, folderId),
  createFolderWithInstances: (folderName: string, templateIds: string[]) => invoke('bestiary:create-folder-with-instances', folderName, templateIds),
  getInstanceDependents: (instanceId: string) => invoke('bestiary:get-instance-dependents', instanceId),
  deleteInstanceCascade: (instanceId: string) => invoke('bestiary:delete-instance-cascade', instanceId),
}
```

**Critical:** Instance creation lives in IPC/main process, NOT in the Encounter Sets component. This ensures instances can be created even when the ES window is closed (e.g., during preset load).

#### 1.4 Batch operations with transactions

**File:** `src/electron/database.ts`

```typescript
export function batchCreateInstances(templateIds: string[], folderId: string): string[] {
  if (!db) throw new Error('DB not initialized');
  db.run('BEGIN TRANSACTION');
  try {
    const instanceIds: string[] = [];
    for (const templateId of templateIds) {
      const id = crypto.randomUUID();
      db.run(
        `INSERT INTO bestiary_instances (id, folder_id, template_id, sort_order, created_at)
         VALUES (?, ?, ?, ?, datetime('now'))`,
        [id, folderId, templateId, instanceIds.length]
      );
      instanceIds.push(id);
    }
    db.run('COMMIT');
    persist(); // ONE persist for entire batch
    return instanceIds;
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  }
}
```

**Why:** Loading a preset with 20 creatures without transactions = 20 individual `persist()` calls = 20 full DB file writes. With transactions, it's 1 write.

### Phase 2: Block Bestiary → Map Direct Drag

#### 2.1 Update Map drop handler

**File:** `src/ui/tools/map-display/MapDisplay.tsx`

```typescript
const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
  e.preventDefault();
  const raw = e.dataTransfer.getData('application/json');
  if (!raw) return;
  const data = JSON.parse(raw) as Record<string, unknown>;

  let sourceType: MapToken['sourceType'];
  switch (data.type) {
    case 'encounter-instance': sourceType = 'instance'; break;
    case 'party-character': sourceType = 'party'; break;
    case 'bestiary-creature': return; // BLOCKED — must go through ES
    default: return;
  }

  // Duplicate prevention: same instance can't be on map twice
  if (data.type === 'encounter-instance') {
    const alreadyPlaced = currentState.tokens.some(
      t => t.instanceId === (data.instanceId as string)
    );
    if (alreadyPlaced) return; // silently reject
  }

  // ... rest of token creation
}, [currentState.tokens, tokenActions, renderer]);
```

#### 2.2 Visual feedback for blocked drops

**File:** `src/ui/tools/map-display/MapDisplay.tsx`

During `dragOver`, check the drag type hint. If it's `bestiary-creature`, don't call `e.preventDefault()` — this shows the native 🚫 cursor.

```typescript
const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
  // Only allow drop for valid types
  const types = e.dataTransfer.types;
  if (types.includes('x-payload-type/bestiary-creature')) {
    // Don't preventDefault → shows 🚫 cursor
    return;
  }
  e.preventDefault();
  e.dataTransfer.dropEffect = 'copy';
}, []);
```

#### 2.3 Update Encounter Sets drag payload

**File:** `src/ui/tools/bestiary/components/TreeNode.tsx`

Change drag from `'bestiary-creature'` to `'encounter-instance'` for instances (not templates):

```typescript
// For instances (in Encounter Sets folders)
const handleDragStart = (e: React.DragEvent) => {
  const payload = {
    type: 'encounter-instance',
    id: instance.id,
    instanceId: instance.id,
    name: resolved?.instanceName ?? resolved?.name ?? 'Unknown',
    portraitPath: resolved?.avatarPath ?? null,
    meta: { cr, creatureType, hp, ac },
  };
  e.dataTransfer.setData('application/json', JSON.stringify(payload));
  e.dataTransfer.setData('x-payload-type/encounter-instance', ''); // type hint for dragOver
  e.dataTransfer.effectAllowed = 'copy';
};

// For templates (in Bestiary library) — keep 'bestiary-creature' so map can identify and block
const handleTemplateDragStart = (e: React.DragEvent) => {
  const payload = { type: 'bestiary-creature', id: template.id, ... };
  e.dataTransfer.setData('application/json', JSON.stringify(payload));
  e.dataTransfer.setData('x-payload-type/bestiary-creature', '');
  e.dataTransfer.effectAllowed = 'copy';
};
```

### Phase 3: Notepad → Encounter Sets Button

#### 3.1 Add "Create Encounter Group" button

**File:** `src/ui/tools/notepad/components/ReferencePanel.tsx`

- Extract all `entityMention` nodes from current note's TipTap JSON
- Filter to `entityType === 'creature'`
- Call IPC: `bestiary.createFolderWithInstances(noteName, templateIds)`
- Show toast confirmation

#### 3.2 Reuse logic (idempotent creation)

**File:** `src/electron/database.ts`

```typescript
export function createFolderWithInstances(
  folderName: string,
  templateIds: string[],
  parentId?: string
): { folderId: string; instanceIds: string[]; reused: number } {
  if (!db) throw new Error('DB not initialized');

  // Check for existing folder with same name under same parent
  const existing = db.exec(
    `SELECT id FROM bestiary_folders WHERE name = ? AND parent_id IS ?`,
    [folderName, parentId ?? null]
  );

  const folderId = existing.length > 0
    ? existing[0].values[0][0] as string
    : (() => { const id = crypto.randomUUID(); /* INSERT folder */; return id; })();

  // For each templateId, check if instance already exists in this folder
  db.run('BEGIN TRANSACTION');
  try {
    const instanceIds: string[] = [];
    let reused = 0;
    for (const templateId of templateIds) {
      const existingInst = db.exec(
        `SELECT id FROM bestiary_instances WHERE folder_id = ? AND template_id = ?`,
        [folderId, templateId]
      );
      if (existingInst.length > 0) {
        instanceIds.push(existingInst[0].values[0][0] as string);
        reused++;
      } else {
        const id = crypto.randomUUID();
        // INSERT new instance
        instanceIds.push(id);
      }
    }
    db.run('COMMIT');
    persist();
    return { folderId, instanceIds, reused };
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  }
}
```

### Phase 4: Load Preset Spawns Instances

#### 4.1 Extend macro executor

**File:** `src/ui/tools/notepad/hooks/useMacroExecutor.ts`

When `load-map-preset` executes:
1. Load preset from DB (`notePresets.load`)
2. Parse `map_state_json` → extract tokens with `sourceType === 'preset-template'`
3. Call IPC: `bestiary.batchCreateInstances(templateIds, folderId)` — creates/reuses instances
4. Map returned instanceIds back to tokens, replacing `sourceType: 'preset-template'` → `'instance'`
5. Apply modified map state via `onLoadMapPreset`

```typescript
case 'load-map-preset': {
  const preset = await api.notePresets.load(step.payload);
  if (!preset || preset.map_state_json === '{}') break;

  const mapState = JSON.parse(preset.map_state_json) as MapDisplayState;
  const presetTokens = mapState.tokens.filter(t => t.sourceType === 'preset-template');

  if (presetTokens.length > 0) {
    const templateIds = presetTokens.map(t => t.sourceId);
    // IPC call — works regardless of whether ES window is open
    const { instanceIds } = await api.bestiary.createFolderWithInstances(
      preset.name ?? 'Preset',
      templateIds,
    );
    // Replace template refs with instance refs
    presetTokens.forEach((token, i) => {
      token.sourceType = 'instance';
      token.sourceId = instanceIds[i];
      token.instanceId = instanceIds[i];
    });
  }

  onLoadMapPreset(JSON.stringify(mapState));
  // Emit event so Encounter Sets can refresh if open
  window.dispatchEvent(new CustomEvent('bestiary:data-changed'));
  break;
}
```

#### 4.2 Preset Editor stores template refs

**File:** `src/ui/tools/notepad/components/PresetEditorDialog.tsx`

Tokens placed in the preset editor use `sourceType: 'preset-template'` (design-time marker) with `sourceId = templateId`. These are NOT live instances — they become instances only at load-time.

### Phase 5: Cascade Deletion

#### 5.1 Impact analysis via IPC

**File:** `src/electron/database.ts`

```typescript
export function getInstanceDependents(instanceId: string): {
  isOnMap: boolean;
  isInCombat: boolean;
} {
  if (!db) throw new Error('DB not initialized');
  const state = db.exec(
    `SELECT is_on_map, is_in_combat FROM creature_instance_state WHERE instance_id = ?`,
    [instanceId]
  );
  if (state.length === 0) return { isOnMap: false, isInCombat: false };
  return {
    isOnMap: !!(state[0].values[0][0]),
    isInCombat: !!(state[0].values[0][1]),
  };
}
```

#### 5.2 UI confirmation + cross-tool event

**File:** `src/ui/tools/bestiary/EncounterSets.tsx`

Before deletion:
1. Call IPC `getInstanceDependents(instanceId)`
2. If active anywhere → show confirmation dialog with consequences listed
3. On confirm → call IPC `deleteInstanceCascade(instanceId)`
4. Emit event: `window.dispatchEvent(new CustomEvent('instance:removed', { detail: { instanceId } }))`

**Critical:** The confirmation dialog should be rendered at the **canvas root level** (not inside the ES tool window) so it works even if ES is in an odd state. Use a global modal system or portal.

#### 5.3 Listeners in Map Display and Combat Tracker

Each tool listens on mount:

```typescript
useEffect(() => {
  const handler = (e: Event) => {
    const { instanceId } = (e as CustomEvent).detail;
    // Remove token with matching instanceId
    patchState({
      tokens: currentState.tokens.filter(t => t.instanceId !== instanceId)
    });
  };
  window.addEventListener('instance:removed', handler);
  return () => window.removeEventListener('instance:removed', handler);
}, [currentState.tokens, patchState]);
```

### Phase 6: Migration of Existing Data

#### 6.1 Schema versioning

**File:** `src/electron/database.ts`

Use `PRAGMA user_version` to track schema version:

```typescript
function runMigrations() {
  const result = db.exec('PRAGMA user_version');
  const currentVersion = result[0]?.values[0]?.[0] as number ?? 0;

  if (currentVersion < 1) {
    migrateTokensToInstances();
  }

  db.run(`PRAGMA user_version = 1`);
  persist();
}
```

#### 6.2 Token migration

```typescript
function migrateTokensToInstances() {
  // Create instance_state table
  db.run(`CREATE TABLE IF NOT EXISTS creature_instance_state (...)`);

  // Scan all canvas_state JSON blobs for tokens with sourceType: 'bestiary'
  const canvasStates = db.exec(`SELECT id, data FROM canvas_state`);

  // Create a "Migrated" folder
  const migratedFolderId = crypto.randomUUID();
  db.run(`INSERT INTO bestiary_folders (id, name, sort_order) VALUES (?, 'Migrated', 0)`,
    [migratedFolderId]);

  for (const [id, dataStr] of canvasStates[0]?.values ?? []) {
    const data = JSON.parse(dataStr as string);
    // Find all windows with map-display toolState containing tokens
    // For each token with sourceType === 'bestiary':
    //   - Create instance in "Migrated" folder
    //   - Update token: sourceType = 'instance', sourceId = newInstanceId
    // Write back updated JSON
  }
}
```

**Safety:** Back up DB file before migration with `fs.copyFileSync`.

### Phase 7: Mount-Time Validation

**Research insight:** Don't rely solely on CustomEvents for consistency. Events are optimizations for live updates — if a tool was closed when an event fired, it misses the update.

Every tool that references instances must validate on mount:

```typescript
// In Map Display's useEffect on mount:
useEffect(() => {
  // Validate all instance tokens still exist
  const validate = async () => {
    const instanceIds = currentState.tokens
      .filter(t => t.sourceType === 'instance')
      .map(t => t.instanceId!);
    // Batch check via IPC or individual checks
    // Remove tokens whose instances no longer exist
  };
  validate();
}, []); // only on mount
```

## System-Wide Impact

### Interaction Graph

- Drop on Map → checks if `encounter-instance` type → validates not duplicate → creates token
- Delete instance in ES → IPC checks dependents → confirmation → cascade delete → fires `instance:removed` event → Map removes token, CT removes combatant
- Template edit in Bestiary → all instances inherit updated stats (no event needed — instances read template on render)
- Load preset macro → IPC creates/reuses instances → modifies map state → applies to Map Display
- Tool mount → validates instance references against DB → removes orphans

### Error Propagation

- Failed batch creation (preset load) → ROLLBACK → no partial state → toast "Failed to load preset"
- Instance referenced by token deleted outside cascade → mount-time validation catches it → token removed on next open
- Template deleted → instances become orphaned (`templateId = null`), `overrides` preserves last-known stats

### State Lifecycle

- Instance created: via IPC (Encounter Sets drag, "Create Encounter Group", or preset load)
- Instance active: when placed on map and/or in combat (tracked in `creature_instance_state`)
- Instance cleanup: manual deletion only (with cascade warning)
- Orphan detection: mount-time validation in consuming tools

## Acceptance Criteria

- [ ] Dragging from Bestiary to Map shows 🚫 cursor (no drop effect)
- [ ] Dragging from Encounter Sets to Map works, creating token linked to instance
- [ ] Same instance cannot appear twice on map (duplicate drop rejected)
- [ ] Token on map shows correct portrait from instance's template
- [ ] "Create Encounter Group" button in Notepad creates ES folder with instances
- [ ] Loading map preset creates/reuses instances and places tokens (single transaction)
- [ ] Deleting instance from ES shows warning listing consequences, and removes token + combatant on confirm
- [ ] No duplicate instances when same operation is repeated (idempotent creation)
- [ ] Existing map tokens are migrated to instance model on first load (with DB backup)
- [ ] Party Tracker → Map and Party Tracker → Combat Tracker unchanged
- [ ] Tools validate instance references on mount (remove orphaned tokens)

## Dependencies & Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| Migration loses data (template deleted) | Tokens disappear | Create orphaned instances preserving name/avatar from token |
| Event missed (tool closed) | Stale token/combatant shown | Mount-time validation against DB |
| Batch creation fails mid-way | Partial instances in DB | DB transactions with ROLLBACK |
| User expects Bestiary→Map drag | Confusion | 🚫 cursor + consider tooltip "Drag to Encounter Sets first" |
| Two map windows show same token | Double-edit race | Instance state in DB is source of truth; last writer wins |

## Sources & References

### Origin

- **Origin document:** [docs/brainstorms/2026-05-19-module-dependency-graph-requirements.md](docs/brainstorms/2026-05-19-module-dependency-graph-requirements.md) — Key decisions: instance model, block Bestiary→Map, reuse over duplication, cascade deletion
- **Related requirements:** [docs/brainstorms/2026-05-19-shared-creature-model-requirements.md](docs/brainstorms/2026-05-19-shared-creature-model-requirements.md) — detailed instance/template model, shared HP between Map and Combat

### Internal References

- Encounter Sets types: `src/ui/tools/bestiary/types.ts:CreatureInstance`
- Map token type: `src/ui/tools/map-display/types.ts:MapToken`
- Drop handler: `src/ui/tools/map-display/MapDisplay.tsx:236`
- Macro executor: `src/ui/tools/notepad/hooks/useMacroExecutor.ts`
- DB schema: `src/electron/database.ts:189`
- Entity mention: `src/ui/tools/notepad/extensions/EntityMention.ts`
- TreeNode drag: `src/ui/tools/bestiary/components/TreeNode.tsx:67`
