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

  db.run(`
    CREATE TABLE IF NOT EXISTS bestiary_folders (
      id TEXT PRIMARY KEY,
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

  persist();
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

export function listBestiaryFolders(): BestiaryFolderRow[] {
  if (!db) throw new Error('Database not initialized');

  const result = db.exec(
    'SELECT id, parent_id, name, sort_order, created_at FROM bestiary_folders ORDER BY sort_order ASC',
  );

  if (result.length === 0) return [];

  return result[0].values.map(([id, parent_id, name, sort_order, created_at]) => ({
    id: id as string,
    parent_id: parent_id as string | null,
    name: name as string,
    sort_order: sort_order as number,
    created_at: created_at as string,
  }));
}

export function saveBestiaryFolder(id: string, parentId: string | null, name: string, sortOrder: number): void {
  if (!db) throw new Error('Database not initialized');

  db.run(
    `INSERT INTO bestiary_folders (id, parent_id, name, sort_order)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET parent_id = excluded.parent_id, name = excluded.name, sort_order = excluded.sort_order`,
    [id, parentId, name, sortOrder],
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
  persist();
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
