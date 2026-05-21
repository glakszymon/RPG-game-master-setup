/*
 * Database — SQLite persistence for canvas state and future campaign data.
 *
 * Uses sql.js (WASM-based SQLite) to avoid native module compilation issues
 * with Electron. Canvas state is stored as JSON blobs per campaign.
 */

import initSqlJs, { type Database } from 'sql.js';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { convertAllSrdMonsters } from './srdConversion.js';
import type { SrdMonsterRaw } from './srdConversion.js';

let db: Database | null = null;
let dbPath: string = '';

export async function initDatabase(): Promise<void> {
  const userDataPath = app.getPath('userData');
  const dbDir = path.join(userDataPath, 'data');

  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  dbPath = path.join(dbDir, 'game-master-panel.db');

  const SQL = await initSqlJs();

  // Load existing database file if it exists
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS canvas_state (
      campaign_id TEXT PRIMARY KEY,
      state_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      system TEXT NOT NULL DEFAULT '',
      icon_type TEXT NOT NULL DEFAULT 'preset',
      icon_value TEXT NOT NULL DEFAULT 'sword',
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_session_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Seed Demo Campaign on first launch
  seedDemoCampaign();

  db.run(`
    CREATE TABLE IF NOT EXISTS focus_presets (
      campaign_id TEXT NOT NULL,
      preset_id TEXT NOT NULL,
      name TEXT NOT NULL,
      data_json TEXT NOT NULL,
      is_auto_save INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (campaign_id, preset_id)
    );
  `);

  // ── Campaign Settings table ──

  db.run(`
    CREATE TABLE IF NOT EXISTS campaign_settings (
      campaign_id TEXT NOT NULL,
      key TEXT NOT NULL,
      value_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (campaign_id, key)
    );
  `);

  // ── Notepad tables ──

  db.run(`
    CREATE TABLE IF NOT EXISTS note_folders (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      parent_id TEXT,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (parent_id) REFERENCES note_folders(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      folder_id TEXT,
      title TEXT NOT NULL DEFAULT 'Untitled',
      content_json TEXT NOT NULL DEFAULT '{}',
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (folder_id) REFERENCES note_folders(id) ON DELETE SET NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS note_links (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      source_note_id TEXT NOT NULL,
      target_note_id TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (source_note_id) REFERENCES notes(id) ON DELETE CASCADE,
      FOREIGN KEY (target_note_id) REFERENCES notes(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS note_graph_positions (
      note_id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      x REAL NOT NULL DEFAULT 0,
      y REAL NOT NULL DEFAULT 0,
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS note_map_presets (
      id TEXT PRIMARY KEY,
      campaign_id TEXT NOT NULL,
      note_id TEXT NOT NULL,
      name TEXT NOT NULL,
      map_state_json TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
    );
  `);

  // ── Bestiary tables ──

  db.run(`
    CREATE TABLE IF NOT EXISTS bestiary_templates (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      creature_type TEXT,
      cr TEXT,
      hp_formula TEXT,
      hp_default INTEGER,
      ac INTEGER,
      speed TEXT,
      ability_scores TEXT,
      saving_throws TEXT,
      actions TEXT,
      actions_mode TEXT NOT NULL DEFAULT 'structured',
      actions_text TEXT NOT NULL DEFAULT '',
      traits TEXT,
      custom_fields TEXT,
      tags TEXT,
      avatar_path TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // ── Migration: add field_values column if missing ──
  migrateBestiaryFieldValues();

  // ── Seed SRD creatures on first launch ──
  seedSrdCreatures();

  db.run(`
    CREATE TABLE IF NOT EXISTS bestiary_folders (
      id TEXT PRIMARY KEY,
      campaign_id TEXT,
      parent_id TEXT,
      name TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (parent_id) REFERENCES bestiary_folders(id) ON DELETE CASCADE
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS bestiary_instances (
      id TEXT PRIMARY KEY,
      folder_id TEXT NOT NULL,
      template_id TEXT,
      instance_name TEXT,
      overrides TEXT,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (folder_id) REFERENCES bestiary_folders(id) ON DELETE CASCADE,
      FOREIGN KEY (template_id) REFERENCES bestiary_templates(id) ON DELETE SET NULL
    );
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS creature_instance_state (
      instance_id TEXT PRIMARY KEY,
      current_hp INTEGER,
      max_hp INTEGER,
      conditions TEXT DEFAULT '[]',
      is_on_map INTEGER NOT NULL DEFAULT 0,
      map_token_id TEXT,
      is_in_combat INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Run migrations based on schema version
  runMigrations();

  persist();
}

function runMigrations(): void {
  if (!db) return;
  const result = db.exec('PRAGMA user_version');
  const currentVersion = (result[0]?.values[0]?.[0] as number) ?? 0;

  if (currentVersion < 1) {
    migrateTokensToInstances();
    db.run('PRAGMA user_version = 1');
  }

  // Always ensure campaign_id column exists (idempotent)
  try {
    db.run('ALTER TABLE bestiary_folders ADD COLUMN campaign_id TEXT');
  } catch {
    // Column already exists
  }
  // Assign existing folders to the first campaign if unset
  const campaigns = db.exec('SELECT id FROM campaigns LIMIT 1');
  if (campaigns.length > 0 && campaigns[0].values.length > 0) {
    const firstCampaignId = campaigns[0].values[0][0] as string;
    db.run('UPDATE bestiary_folders SET campaign_id = ? WHERE campaign_id IS NULL', [firstCampaignId]);
  }
}

function migrateTokensToInstances(): void {
  if (!db) return;

  // Scan all canvas_state JSON for tokens with sourceType: 'bestiary'
  const canvasStates = db.exec('SELECT campaign_id, state_json FROM canvas_state');
  if (canvasStates.length === 0) return;

  const rows = canvasStates[0].values;
  let anyMigrated = false;

  // Create a "Migrated" folder for auto-created instances
  const migratedFolderId = crypto.randomUUID();
  let folderCreated = false;

  for (const [campaignId, dataStr] of rows) {
    if (!dataStr || typeof dataStr !== 'string') continue;
    const data = JSON.parse(dataStr);
    const windows = data?.windows;
    if (!Array.isArray(windows)) continue;

    let modified = false;
    for (const win of windows) {
      if (win.toolId !== 'map-display' || !win.toolState?.tokens) continue;
      const tokens = win.toolState.tokens as Array<{ sourceType: string; sourceId: string; instanceId?: string }>;
      for (const token of tokens) {
        if (token.sourceType === 'bestiary' && token.sourceId) {
          // Create instance in "Migrated" folder
          if (!folderCreated) {
            db.run(
              `INSERT OR IGNORE INTO bestiary_folders (id, name, parent_id, sort_order, created_at)
               VALUES (?, 'Migrated', NULL, 9999, datetime('now'))`,
              [migratedFolderId]
            );
            folderCreated = true;
          }
          // Check if instance already exists for this template in migrated folder
          const existing = db.exec(
            `SELECT id FROM bestiary_instances WHERE folder_id = ? AND template_id = ?`,
            [migratedFolderId, token.sourceId]
          );
          let instanceId: string;
          if (existing.length > 0 && existing[0].values.length > 0) {
            instanceId = existing[0].values[0][0] as string;
          } else {
            instanceId = crypto.randomUUID();
            db.run(
              `INSERT INTO bestiary_instances (id, folder_id, template_id, instance_name, overrides, sort_order, created_at)
               VALUES (?, ?, ?, NULL, '{}', 0, datetime('now'))`,
              [instanceId, migratedFolderId, token.sourceId]
            );
          }
          token.sourceType = 'instance';
          token.instanceId = instanceId;
          token.sourceId = instanceId;
          modified = true;
          anyMigrated = true;
        }
      }
    }

    if (modified) {
      db.run('UPDATE canvas_state SET state_json = ? WHERE campaign_id = ?', [JSON.stringify(data), campaignId]);
    }
  }

  if (anyMigrated) {
    console.log('[Migration] Migrated bestiary tokens to instance-based tokens');
  }
}

function seedDemoCampaign(): void {
  if (!db) return;

  // Only seed if no campaigns exist
  const result = db.exec('SELECT COUNT(*) FROM campaigns');
  const count = result.length > 0 ? (result[0].values[0][0] as number) : 0;
  if (count > 0) return;

  db.run(
    `INSERT INTO campaigns (id, name, system, icon_type, icon_value, status, created_at, last_session_at)
     VALUES ('demo-campaign', 'The Lost Mine of Phandelver', 'D&D 5e', 'preset', 'dragon', 'active', datetime('now'), datetime('now'))`,
  );
}

function persist(): void {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

export function saveCanvasState(campaignId: string, stateJson: string): void {
  if (!db) throw new Error('Database not initialized');

  db.run(
    `INSERT INTO canvas_state (campaign_id, state_json, updated_at)
     VALUES (?, ?, datetime('now'))
     ON CONFLICT(campaign_id)
     DO UPDATE SET state_json = excluded.state_json, updated_at = datetime('now')`,
    [campaignId, stateJson],
  );

  persist();
}

export function loadCanvasState(campaignId: string): string | null {
  if (!db) throw new Error('Database not initialized');

  const result = db.exec(
    'SELECT state_json FROM canvas_state WHERE campaign_id = ?',
    [campaignId],
  );

  if (result.length === 0 || result[0].values.length === 0) {
    return null;
  }

  return result[0].values[0][0] as string;
}

// ── Focus Presets ──

export function savePreset(
  campaignId: string,
  presetId: string,
  name: string,
  dataJson: string,
  isAutoSave: boolean,
): void {
  if (!db) throw new Error('Database not initialized');

  db.run(
    `INSERT INTO focus_presets (campaign_id, preset_id, name, data_json, is_auto_save, updated_at)
     VALUES (?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(campaign_id, preset_id)
     DO UPDATE SET name = excluded.name, data_json = excluded.data_json, updated_at = datetime('now')`,
    [campaignId, presetId, name, dataJson, isAutoSave ? 1 : 0],
  );

  persist();
}

export function loadPresets(campaignId: string): string {
  if (!db) throw new Error('Database not initialized');

  const result = db.exec(
    'SELECT preset_id, name, data_json, is_auto_save, updated_at FROM focus_presets WHERE campaign_id = ? ORDER BY is_auto_save DESC, name ASC',
    [campaignId],
  );

  if (result.length === 0) return '[]';

  const presets = result[0].values.map(([presetId, name, dataJson, isAutoSave, updatedAt]) => ({
    id: presetId,
    name,
    ...JSON.parse(dataJson as string),
    isAutoSave: isAutoSave === 1,
    updatedAt,
  }));

  return JSON.stringify(presets);
}

export function deletePreset(campaignId: string, presetId: string): void {
  if (!db) throw new Error('Database not initialized');

  db.run(
    'DELETE FROM focus_presets WHERE campaign_id = ? AND preset_id = ? AND is_auto_save = 0',
    [campaignId, presetId],
  );

  persist();
}

export function renamePreset(campaignId: string, presetId: string, newName: string): void {
  if (!db) throw new Error('Database not initialized');

  db.run(
    'UPDATE focus_presets SET name = ?, updated_at = datetime(\'now\') WHERE campaign_id = ? AND preset_id = ? AND is_auto_save = 0',
    [newName, campaignId, presetId],
  );

  persist();
}

// ── Campaigns ──

export interface CampaignRow {
  id: string;
  name: string;
  system: string;
  icon_type: string;
  icon_value: string;
  status: string;
  created_at: string;
  last_session_at: string;
}

export function createCampaign(
  id: string,
  name: string,
  system: string,
  iconType: string,
  iconValue: string,
): void {
  if (!db) throw new Error('Database not initialized');

  db.run(
    `INSERT INTO campaigns (id, name, system, icon_type, icon_value, status, created_at, last_session_at)
     VALUES (?, ?, ?, ?, ?, 'active', datetime('now'), datetime('now'))`,
    [id, name, system, iconType, iconValue],
  );

  persist();
}

export function listCampaigns(): CampaignRow[] {
  if (!db) throw new Error('Database not initialized');

  const result = db.exec(
    'SELECT id, name, system, icon_type, icon_value, status, created_at, last_session_at FROM campaigns ORDER BY last_session_at DESC',
  );

  if (result.length === 0) return [];

  return result[0].values.map(([id, name, system, icon_type, icon_value, status, created_at, last_session_at]) => ({
    id: id as string,
    name: name as string,
    system: system as string,
    icon_type: icon_type as string,
    icon_value: icon_value as string,
    status: status as string,
    created_at: created_at as string,
    last_session_at: last_session_at as string,
  }));
}

export function updateCampaign(id: string, name: string, system: string, iconType: string, iconValue: string): void {
  if (!db) throw new Error('Database not initialized');

  db.run(
    'UPDATE campaigns SET name = ?, system = ?, icon_type = ?, icon_value = ? WHERE id = ?',
    [name, system, iconType, iconValue, id],
  );

  persist();
}

export function updateCampaignStatus(id: string, status: string): void {
  if (!db) throw new Error('Database not initialized');

  db.run('UPDATE campaigns SET status = ? WHERE id = ?', [status, id]);
  persist();
}

export function deleteCampaign(id: string): void {
  if (!db) throw new Error('Database not initialized');

  db.run('DELETE FROM campaigns WHERE id = ?', [id]);
  db.run('DELETE FROM canvas_state WHERE campaign_id = ?', [id]);
  db.run('DELETE FROM focus_presets WHERE campaign_id = ?', [id]);
  persist();
}

export function touchCampaignSession(id: string): void {
  if (!db) throw new Error('Database not initialized');

  db.run('UPDATE campaigns SET last_session_at = datetime(\'now\') WHERE id = ?', [id]);
  persist();
}

// ── Bestiary Templates ──

/** Migrate bestiary_templates to include field_values column */
function migrateBestiaryFieldValues(): void {
  if (!db) return;

  // Check if field_values column exists
  const pragma = db.exec("PRAGMA table_info(bestiary_templates)");
  if (pragma.length === 0) return;
  const columns = pragma[0].values.map(row => row[1] as string);
  if (columns.includes('field_values')) {
    // Column exists — migrate any rows that haven't been converted yet
    migrateExistingRows();
    return;
  }

  // Add column
  db.run('ALTER TABLE bestiary_templates ADD COLUMN field_values TEXT');

  // Migrate existing rows
  migrateExistingRows();
  persist();
}

function migrateExistingRows(): void {
  if (!db) return;

  const result = db.exec(
    "SELECT id, creature_type, cr, hp_formula, hp_default, ac, speed, ability_scores, saving_throws, actions, traits, custom_fields, tags FROM bestiary_templates WHERE field_values IS NULL"
  );
  if (result.length === 0) return;

  let count = 0;
  for (const row of result[0].values) {
    const [id, creature_type, cr, hp_formula, hp_default, ac, speed, ability_scores, saving_throws, actions, traits, _custom_fields, tags] = row;

    const vals: Record<string, unknown> = {};

    if (creature_type) vals['creature_type'] = { type: 'radio', selected: creature_type };
    if (cr) vals['cr'] = { type: 'text-field', value: cr };
    if (hp_default != null) vals['hp_default'] = { type: 'number', value: hp_default };
    if (hp_formula) vals['hp_formula'] = { type: 'text-field', value: hp_formula };
    if (ac != null) vals['ac'] = { type: 'number', value: ac };

    if (speed) {
      try {
        const speedObj = JSON.parse(speed as string) as Record<string, number>;
        const speedTags = Object.entries(speedObj).map(([mode, val]) =>
          mode === 'walk' ? `${val} ft.` : `${mode} ${val} ft.`
        );
        if (speedTags.length > 0) vals['speed'] = { type: 'tag-list', tags: speedTags };
      } catch { /* skip */ }
    }

    if (ability_scores) {
      try {
        const scores = JSON.parse(ability_scores as string);
        const saves = saving_throws ? JSON.parse(saving_throws as string) : {};
        vals['ability_scores'] = { type: 'stat-block', scores, modifiers: {}, saves: saves ?? {} };
      } catch { /* skip */ }
    }

    if (actions) {
      try {
        const actionArr = JSON.parse(actions as string) as Array<{ id: string; name: string; description: string; toHit?: number; damage?: string; isLegendary?: boolean }>;
        const regular = actionArr.filter(a => !a.isLegendary);
        const legendary = actionArr.filter(a => a.isLegendary);
        if (regular.length > 0) {
          vals['actions'] = { type: 'action-list', actions: regular.map(a => ({ id: a.id, name: a.name, description: a.description, toHit: a.toHit, damage: a.damage })) };
        }
        if (legendary.length > 0) {
          vals['legendary_actions'] = { type: 'action-list', actions: legendary.map(a => ({ id: a.id, name: a.name, description: a.description, toHit: a.toHit, damage: a.damage })) };
        }
      } catch { /* skip */ }
    }

    if (traits) {
      try {
        const traitArr = JSON.parse(traits as string) as Array<{ id: string; name: string; description: string }>;
        if (traitArr.length > 0) {
          vals['traits'] = { type: 'action-list', actions: traitArr.map(t => ({ id: t.id, name: t.name, description: t.description })) };
        }
      } catch { /* skip */ }
    }

    if (tags) {
      try {
        const tagArr = JSON.parse(tags as string) as string[];
        if (tagArr.length > 0) vals['descriptive_tags'] = { type: 'tag-list', tags: tagArr };
      } catch { /* skip */ }
    }

    db!.run('UPDATE bestiary_templates SET field_values = ? WHERE id = ?', [JSON.stringify(vals), id]);
    count++;
  }

  if (count > 0) {
    console.log(`[bestiary] Migrated ${count} template(s) to field_values format`);
  }
}

// ── SRD Seed ──

/** Seed the bestiary library with SRD monsters from assets/monsters.json (idempotent) */
export function seedSrdCreatures(): { seeded: number; skipped: boolean } {
  if (!db) throw new Error('Database not initialized');

  // Check if already seeded (look for well-known entry)
  const existing = db.exec("SELECT id FROM bestiary_templates WHERE id = 'srd-aboleth'");
  if (existing.length > 0 && existing[0].values.length > 0) {
    return { seeded: 0, skipped: true };
  }

  // Locate monsters.json — try app resources first, fallback to project assets
  let monstersPath = path.join(app.getAppPath(), 'assets', 'monsters.json');
  if (!fs.existsSync(monstersPath)) {
    // Dev mode: relative to electron source
    monstersPath = path.join(__dirname, '..', '..', 'assets', 'monsters.json');
  }
  if (!fs.existsSync(monstersPath)) {
    console.warn('[bestiary] Could not find assets/monsters.json for SRD seeding');
    return { seeded: 0, skipped: false };
  }

  const raw: SrdMonsterRaw[] = JSON.parse(fs.readFileSync(monstersPath, 'utf-8'));
  const rows = convertAllSrdMonsters(raw);

  let count = 0;
  for (const r of rows) {
    db.run(
      `INSERT OR IGNORE INTO bestiary_templates (id, name, creature_type, cr, hp_formula, hp_default, ac, speed, ability_scores, saving_throws, actions, actions_mode, actions_text, traits, custom_fields, tags, avatar_path, field_values, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        r.id, r.name, r.creature_type, r.cr, r.hp_formula, r.hp_default, r.ac,
        r.speed, r.ability_scores, r.saving_throws, r.actions, r.actions_mode,
        r.actions_text, r.traits, r.custom_fields, r.tags, r.avatar_path,
        r.field_values, r.created_at, r.updated_at,
      ],
    );
    count++;
  }

  persist();
  console.log(`[bestiary] Seeded ${count} SRD creatures`);
  return { seeded: count, skipped: false };
}

export interface BestiaryTemplateRow {
  id: string;
  name: string;
  creature_type: string | null;
  cr: string | null;
  hp_formula: string | null;
  hp_default: number | null;
  ac: number | null;
  speed: string | null;
  ability_scores: string | null;
  saving_throws: string | null;
  actions: string | null;
  actions_mode: string;
  actions_text: string;
  traits: string | null;
  custom_fields: string | null;
  tags: string | null;
  avatar_path: string | null;
  field_values: string | null;
  created_at: string;
  updated_at: string;
}

export function listBestiaryTemplates(): BestiaryTemplateRow[] {
  if (!db) throw new Error('Database not initialized');

  const result = db.exec(
    'SELECT id, name, creature_type, cr, hp_formula, hp_default, ac, speed, ability_scores, saving_throws, actions, actions_mode, actions_text, traits, custom_fields, tags, avatar_path, field_values, created_at, updated_at FROM bestiary_templates ORDER BY name ASC',
  );

  if (result.length === 0) return [];

  return result[0].values.map(([id, name, creature_type, cr, hp_formula, hp_default, ac, speed, ability_scores, saving_throws, actions, actions_mode, actions_text, traits, custom_fields, tags, avatar_path, field_values, created_at, updated_at]) => ({
    id: id as string,
    name: name as string,
    creature_type: creature_type as string | null,
    cr: cr as string | null,
    hp_formula: hp_formula as string | null,
    hp_default: hp_default as number | null,
    ac: ac as number | null,
    speed: speed as string | null,
    ability_scores: ability_scores as string | null,
    saving_throws: saving_throws as string | null,
    actions: actions as string | null,
    actions_mode: (actions_mode ?? 'structured') as string,
    actions_text: (actions_text ?? '') as string,
    traits: traits as string | null,
    custom_fields: custom_fields as string | null,
    tags: tags as string | null,
    avatar_path: avatar_path as string | null,
    field_values: field_values as string | null,
    created_at: created_at as string,
    updated_at: updated_at as string,
  }));
}

export function saveBestiaryTemplate(dataJson: string): void {
  if (!db) throw new Error('Database not initialized');

  const t = JSON.parse(dataJson);
  db.run(
    `INSERT INTO bestiary_templates (id, name, creature_type, cr, hp_formula, hp_default, ac, speed, ability_scores, saving_throws, actions, actions_mode, actions_text, traits, custom_fields, tags, avatar_path, field_values, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET
       name = excluded.name, creature_type = excluded.creature_type, cr = excluded.cr,
       hp_formula = excluded.hp_formula, hp_default = excluded.hp_default, ac = excluded.ac,
       speed = excluded.speed, ability_scores = excluded.ability_scores, saving_throws = excluded.saving_throws,
       actions = excluded.actions, actions_mode = excluded.actions_mode, actions_text = excluded.actions_text,
       traits = excluded.traits, custom_fields = excluded.custom_fields, tags = excluded.tags,
       avatar_path = excluded.avatar_path, field_values = excluded.field_values, updated_at = datetime('now')`,
    [
      t.id, t.name, t.creatureType ?? null, t.cr ?? null,
      t.hpFormula ?? null, t.hpDefault ?? null, t.ac ?? null,
      JSON.stringify(t.speed ?? {}), JSON.stringify(t.abilityScores),
      JSON.stringify(t.savingThrows), JSON.stringify(t.actions ?? []),
      t.actionsMode ?? 'structured', t.actionsText ?? '',
      JSON.stringify(t.traits ?? []), JSON.stringify(t.customFields ?? []),
      JSON.stringify(t.tags ?? []), t.avatarPath ?? null,
      t.fieldValues ? JSON.stringify(t.fieldValues) : null,
      t.createdAt ?? new Date().toISOString(),
    ],
  );

  persist();
}

export function deleteBestiaryTemplate(id: string): void {
  if (!db) throw new Error('Database not initialized');

  db.run('DELETE FROM bestiary_templates WHERE id = ?', [id]);
  persist();
}

// ── Bestiary Folders ──

export interface BestiaryFolderRow {
  id: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
  created_at: string;
}

export function listBestiaryFolders(campaignId?: string): BestiaryFolderRow[] {
  if (!db) throw new Error('Database not initialized');

  const query = campaignId
    ? 'SELECT id, parent_id, name, sort_order, created_at FROM bestiary_folders WHERE campaign_id = ? ORDER BY sort_order ASC'
    : 'SELECT id, parent_id, name, sort_order, created_at FROM bestiary_folders ORDER BY sort_order ASC';
  const params = campaignId ? [campaignId] : [];
  const result = db.exec(query, params);

  if (result.length === 0) return [];

  return result[0].values.map(([id, parent_id, name, sort_order, created_at]) => ({
    id: id as string,
    parent_id: parent_id as string | null,
    name: name as string,
    sort_order: sort_order as number,
    created_at: created_at as string,
  }));
}

export function saveBestiaryFolder(id: string, parentId: string | null, name: string, sortOrder: number, campaignId?: string): void {
  if (!db) throw new Error('Database not initialized');

  db.run(
    `INSERT INTO bestiary_folders (id, campaign_id, parent_id, name, sort_order)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET parent_id = excluded.parent_id, name = excluded.name, sort_order = excluded.sort_order`,
    [id, campaignId ?? null, parentId, name, sortOrder],
  );

  persist();
}

export function deleteBestiaryFolder(id: string): void {
  if (!db) throw new Error('Database not initialized');

  db.run('DELETE FROM bestiary_folders WHERE id = ?', [id]);
  persist();
}

// ── Bestiary Instances ──

export interface BestiaryInstanceRow {
  id: string;
  folder_id: string;
  template_id: string | null;
  instance_name: string | null;
  overrides: string | null;
  sort_order: number;
  created_at: string;
}

export function listBestiaryInstances(): BestiaryInstanceRow[] {
  if (!db) throw new Error('Database not initialized');

  const result = db.exec(
    'SELECT id, folder_id, template_id, instance_name, overrides, sort_order, created_at FROM bestiary_instances ORDER BY sort_order ASC',
  );

  if (result.length === 0) return [];

  return result[0].values.map(([id, folder_id, template_id, instance_name, overrides, sort_order, created_at]) => ({
    id: id as string,
    folder_id: folder_id as string,
    template_id: template_id as string | null,
    instance_name: instance_name as string | null,
    overrides: overrides as string | null,
    sort_order: sort_order as number,
    created_at: created_at as string,
  }));
}

export function saveBestiaryInstance(id: string, folderId: string, templateId: string | null, instanceName: string | null, overrides: string, sortOrder: number): void {
  if (!db) throw new Error('Database not initialized');

  db.run(
    `INSERT INTO bestiary_instances (id, folder_id, template_id, instance_name, overrides, sort_order)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET folder_id = excluded.folder_id, template_id = excluded.template_id, instance_name = excluded.instance_name, overrides = excluded.overrides, sort_order = excluded.sort_order`,
    [id, folderId, templateId, instanceName, overrides, sortOrder],
  );

  persist();
}

export function deleteBestiaryInstance(id: string): void {
  if (!db) throw new Error('Database not initialized');

  db.run('DELETE FROM bestiary_instances WHERE id = ?', [id]);
  db.run('DELETE FROM creature_instance_state WHERE instance_id = ?', [id]);
  persist();
}

// ── Creature Instance State ──

export interface InstanceStateRow {
  instance_id: string;
  current_hp: number | null;
  max_hp: number | null;
  conditions: string;
  is_on_map: number;
  map_token_id: string | null;
  is_in_combat: number;
}

export function getInstanceState(instanceId: string): InstanceStateRow | null {
  if (!db) throw new Error('Database not initialized');

  const results = db.exec(
    'SELECT instance_id, current_hp, max_hp, conditions, is_on_map, map_token_id, is_in_combat FROM creature_instance_state WHERE instance_id = ?',
    [instanceId],
  );
  if (results.length === 0 || results[0].values.length === 0) return null;

  const row = results[0].values[0];
  return {
    instance_id: row[0] as string,
    current_hp: row[1] as number | null,
    max_hp: row[2] as number | null,
    conditions: (row[3] as string) ?? '[]',
    is_on_map: row[4] as number,
    map_token_id: (row[5] as string) ?? null,
    is_in_combat: row[6] as number,
  };
}

export function updateInstanceState(instanceId: string, stateJson: string): void {
  if (!db) throw new Error('Database not initialized');

  const state = JSON.parse(stateJson) as Partial<InstanceStateRow>;
  db.run(
    `INSERT INTO creature_instance_state (instance_id, current_hp, max_hp, conditions, is_on_map, map_token_id, is_in_combat)
     VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(instance_id) DO UPDATE SET
       current_hp = COALESCE(excluded.current_hp, creature_instance_state.current_hp),
       max_hp = COALESCE(excluded.max_hp, creature_instance_state.max_hp),
       conditions = COALESCE(excluded.conditions, creature_instance_state.conditions),
       is_on_map = COALESCE(excluded.is_on_map, creature_instance_state.is_on_map),
       map_token_id = COALESCE(excluded.map_token_id, creature_instance_state.map_token_id),
       is_in_combat = COALESCE(excluded.is_in_combat, creature_instance_state.is_in_combat)`,
    [
      instanceId,
      state.current_hp ?? null,
      state.max_hp ?? null,
      state.conditions ?? '[]',
      state.is_on_map ?? 0,
      state.map_token_id ?? null,
      state.is_in_combat ?? 0,
    ],
  );
  persist();
}

export function validateInstanceIds(ids: string[]): string[] {
  if (!db) throw new Error('Database not initialized');
  if (ids.length === 0) return [];
  const placeholders = ids.map(() => '?').join(',');
  const result = db.exec(
    `SELECT id FROM bestiary_instances WHERE id IN (${placeholders})`,
    ids
  );
  if (result.length === 0) return [];
  return result[0].values.map(row => row[0] as string);
}

export function getInstanceDependents(instanceId: string): { isOnMap: boolean; isInCombat: boolean } {
  if (!db) throw new Error('Database not initialized');

  const results = db.exec(
    'SELECT is_on_map, is_in_combat FROM creature_instance_state WHERE instance_id = ?',
    [instanceId],
  );
  if (results.length === 0 || results[0].values.length === 0) {
    return { isOnMap: false, isInCombat: false };
  }
  const row = results[0].values[0];
  return { isOnMap: !!(row[0] as number), isInCombat: !!(row[1] as number) };
}

export function deleteInstanceCascade(instanceId: string): { hadMapToken: boolean; hadCombatant: boolean } {
  if (!db) throw new Error('Database not initialized');

  const deps = getInstanceDependents(instanceId);
  db.run('DELETE FROM creature_instance_state WHERE instance_id = ?', [instanceId]);
  db.run('DELETE FROM bestiary_instances WHERE id = ?', [instanceId]);
  persist();
  return { hadMapToken: deps.isOnMap, hadCombatant: deps.isInCombat };
}

export function batchCreateInstances(templateIds: string[], folderId: string): string[] {
  if (!db) throw new Error('Database not initialized');

  db.run('BEGIN TRANSACTION');
  try {
    const instanceIds: string[] = [];
    for (let i = 0; i < templateIds.length; i++) {
      const id = crypto.randomUUID();
      db.run(
        `INSERT INTO bestiary_instances (id, folder_id, template_id, sort_order, created_at)
         VALUES (?, ?, ?, ?, datetime('now'))`,
        [id, folderId, templateIds[i], i],
      );
      instanceIds.push(id);
    }
    db.run('COMMIT');
    persist();
    return instanceIds;
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  }
}

export function createFolderWithInstances(
  folderName: string,
  templateIds: string[],
  parentId?: string,
  campaignId?: string,
): { folderId: string; instanceIds: string[]; reused: number } {
  if (!db) throw new Error('Database not initialized');

  db.run('BEGIN TRANSACTION');
  try {
    // Find or create folder (scoped by campaign)
    const existingFolder = campaignId
      ? db.exec(
          `SELECT id FROM bestiary_folders WHERE name = ? AND campaign_id = ? AND parent_id IS ?`,
          [folderName, campaignId, parentId ?? null],
        )
      : db.exec(
          `SELECT id FROM bestiary_folders WHERE name = ? AND parent_id IS ?`,
          [folderName, parentId ?? null],
        );

    let folderId: string;
    if (existingFolder.length > 0 && existingFolder[0].values.length > 0) {
      folderId = existingFolder[0].values[0][0] as string;
    } else {
      folderId = crypto.randomUUID();
      db.run(
        `INSERT INTO bestiary_folders (id, campaign_id, parent_id, name, sort_order, created_at)
         VALUES (?, ?, ?, ?, 0, datetime('now'))`,
        [folderId, campaignId ?? null, parentId ?? null, folderName],
      );
    }

    // Create instances, reusing existing ones in the same folder with same template
    const instanceIds: string[] = [];
    let reused = 0;
    const reusedIds = new Set<string>(); // track already-reused instance IDs
    for (let i = 0; i < templateIds.length; i++) {
      // Find existing instances for this template in folder, excluding already-reused
      const existingInst = db.exec(
        `SELECT id FROM bestiary_instances WHERE folder_id = ? AND template_id = ?`,
        [folderId, templateIds[i]],
      );

      let reusedId: string | null = null;
      if (existingInst.length > 0) {
        for (const row of existingInst[0].values) {
          const id = row[0] as string;
          if (!reusedIds.has(id)) {
            reusedId = id;
            reusedIds.add(id);
            break;
          }
        }
      }

      if (reusedId) {
        instanceIds.push(reusedId);
        reused++;
      } else {
        const id = crypto.randomUUID();
        db.run(
          `INSERT INTO bestiary_instances (id, folder_id, template_id, sort_order, created_at)
           VALUES (?, ?, ?, ?, datetime('now'))`,
          [id, folderId, templateIds[i], i],
        );
        instanceIds.push(id);
        reusedIds.add(id);
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

// ── Campaign Settings ──

export function loadCampaignSetting(campaignId: string, key: string): string | null {
  if (!db) throw new Error('Database not initialized');

  const results = db.exec(
    'SELECT value_json FROM campaign_settings WHERE campaign_id = ? AND key = ?',
    [campaignId, key],
  );

  if (results.length === 0 || results[0].values.length === 0) return null;
  return results[0].values[0][0] as string;
}

export function saveCampaignSetting(campaignId: string, key: string, valueJson: string): void {
  if (!db) throw new Error('Database not initialized');

  db.run(
    `INSERT INTO campaign_settings (campaign_id, key, value_json, updated_at)
     VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(campaign_id, key) DO UPDATE SET value_json = excluded.value_json, updated_at = excluded.updated_at`,
    [campaignId, key, valueJson],
  );

  persist();
}

// ── Notepad Folders ──

export interface NoteFolderRow {
  id: string;
  campaign_id: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
  created_at: string;
}

export function listNoteFolders(campaignId: string): NoteFolderRow[] {
  if (!db) throw new Error('Database not initialized');

  const result = db.exec(
    'SELECT id, campaign_id, parent_id, name, sort_order, created_at FROM note_folders WHERE campaign_id = ? ORDER BY sort_order ASC',
    [campaignId],
  );

  if (result.length === 0) return [];

  return result[0].values.map(([id, campaign_id, parent_id, name, sort_order, created_at]) => ({
    id: id as string,
    campaign_id: campaign_id as string,
    parent_id: parent_id as string | null,
    name: name as string,
    sort_order: sort_order as number,
    created_at: created_at as string,
  }));
}

export function saveNoteFolder(id: string, campaignId: string, parentId: string | null, name: string, sortOrder: number): void {
  if (!db) throw new Error('Database not initialized');

  db.run(
    `INSERT INTO note_folders (id, campaign_id, parent_id, name, sort_order)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET parent_id = excluded.parent_id, name = excluded.name, sort_order = excluded.sort_order`,
    [id, campaignId, parentId, name, sortOrder],
  );

  persist();
}

export function deleteNoteFolder(id: string): void {
  if (!db) throw new Error('Database not initialized');

  db.run('DELETE FROM note_folders WHERE id = ?', [id]);
  persist();
}

// ── Notepad Notes ──

export interface NoteRow {
  id: string;
  campaign_id: string;
  folder_id: string | null;
  title: string;
  content_json: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export function listNotes(campaignId: string): NoteRow[] {
  if (!db) throw new Error('Database not initialized');

  const result = db.exec(
    'SELECT id, campaign_id, folder_id, title, content_json, sort_order, created_at, updated_at FROM notes WHERE campaign_id = ? ORDER BY sort_order ASC',
    [campaignId],
  );

  if (result.length === 0) return [];

  return result[0].values.map(([id, campaign_id, folder_id, title, content_json, sort_order, created_at, updated_at]) => ({
    id: id as string,
    campaign_id: campaign_id as string,
    folder_id: folder_id as string | null,
    title: title as string,
    content_json: content_json as string,
    sort_order: sort_order as number,
    created_at: created_at as string,
    updated_at: updated_at as string,
  }));
}

export function getNote(id: string): NoteRow | null {
  if (!db) throw new Error('Database not initialized');

  const result = db.exec(
    'SELECT id, campaign_id, folder_id, title, content_json, sort_order, created_at, updated_at FROM notes WHERE id = ?',
    [id],
  );

  if (result.length === 0 || result[0].values.length === 0) return null;

  const [noteId, campaign_id, folder_id, title, content_json, sort_order, created_at, updated_at] = result[0].values[0];
  return {
    id: noteId as string,
    campaign_id: campaign_id as string,
    folder_id: folder_id as string | null,
    title: title as string,
    content_json: content_json as string,
    sort_order: sort_order as number,
    created_at: created_at as string,
    updated_at: updated_at as string,
  };
}

export function saveNote(id: string, campaignId: string, folderId: string | null, title: string, contentJson: string, sortOrder: number): void {
  if (!db) throw new Error('Database not initialized');

  db.run(
    `INSERT INTO notes (id, campaign_id, folder_id, title, content_json, sort_order, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
     ON CONFLICT(id) DO UPDATE SET folder_id = excluded.folder_id, title = excluded.title, content_json = excluded.content_json, sort_order = excluded.sort_order, updated_at = excluded.updated_at`,
    [id, campaignId, folderId, title, contentJson, sortOrder],
  );

  persist();
}

export function deleteNote(id: string): void {
  if (!db) throw new Error('Database not initialized');

  db.run('DELETE FROM notes WHERE id = ?', [id]);
  persist();
}

// ── Note Links ──

export interface NoteLinkRow {
  id: string;
  campaign_id: string;
  source_note_id: string;
  target_note_id: string;
  created_at: string;
}

export function listNoteLinks(campaignId: string): NoteLinkRow[] {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(
    'SELECT id, campaign_id, source_note_id, target_note_id, created_at FROM note_links WHERE campaign_id = ?'
  );
  stmt.bind([campaignId]);
  const rows: NoteLinkRow[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as NoteLinkRow);
  }
  stmt.free();
  return rows;
}

export function syncNoteLinks(sourceNoteId: string, campaignId: string, targetNoteIds: string[]): void {
  if (!db) throw new Error('Database not initialized');

  // Remove existing links from this source
  db.run('DELETE FROM note_links WHERE source_note_id = ?', [sourceNoteId]);

  // Insert new links
  for (const targetId of targetNoteIds) {
    const id = crypto.randomUUID();
    db.run(
      `INSERT INTO note_links (id, campaign_id, source_note_id, target_note_id) VALUES (?, ?, ?, ?)`,
      [id, campaignId, sourceNoteId, targetId]
    );
  }

  persist();
}

// ── Note Graph Positions ──

export interface NoteGraphPositionRow {
  note_id: string;
  campaign_id: string;
  x: number;
  y: number;
}

export function listNoteGraphPositions(campaignId: string): NoteGraphPositionRow[] {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(
    'SELECT note_id, campaign_id, x, y FROM note_graph_positions WHERE campaign_id = ?'
  );
  stmt.bind([campaignId]);
  const rows: NoteGraphPositionRow[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as NoteGraphPositionRow);
  }
  stmt.free();
  return rows;
}

export function saveNoteGraphPosition(noteId: string, campaignId: string, x: number, y: number): void {
  if (!db) throw new Error('Database not initialized');

  db.run(
    `INSERT OR REPLACE INTO note_graph_positions (note_id, campaign_id, x, y) VALUES (?, ?, ?, ?)`,
    [noteId, campaignId, x, y]
  );
  persist();
}

// ── Note Map Presets ──

export interface NoteMapPresetRow {
  id: string;
  campaign_id: string;
  note_id: string;
  name: string;
  map_state_json: string;
  sort_order: number;
  created_at: string;
}

export function listNoteMapPresets(noteId: string): NoteMapPresetRow[] {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(
    'SELECT id, campaign_id, note_id, name, map_state_json, sort_order, created_at FROM note_map_presets WHERE note_id = ? ORDER BY sort_order'
  );
  stmt.bind([noteId]);
  const rows: NoteMapPresetRow[] = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject() as unknown as NoteMapPresetRow);
  }
  stmt.free();
  return rows;
}

export function saveNoteMapPreset(id: string, campaignId: string, noteId: string, name: string, mapStateJson: string, sortOrder: number): void {
  if (!db) throw new Error('Database not initialized');

  db.run(
    `INSERT OR REPLACE INTO note_map_presets (id, campaign_id, note_id, name, map_state_json, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
    [id, campaignId, noteId, name, mapStateJson, sortOrder]
  );
  persist();
}

export function deleteNoteMapPreset(id: string): void {
  if (!db) throw new Error('Database not initialized');

  db.run('DELETE FROM note_map_presets WHERE id = ?', [id]);
  persist();
}

export function getNoteMapPreset(id: string): NoteMapPresetRow | null {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(
    'SELECT id, campaign_id, note_id, name, map_state_json, sort_order, created_at FROM note_map_presets WHERE id = ?'
  );
  stmt.bind([id]);
  if (stmt.step()) {
    const row = stmt.getAsObject() as unknown as NoteMapPresetRow;
    stmt.free();
    return row;
  }
  stmt.free();
  return null;
}
