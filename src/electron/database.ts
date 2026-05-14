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
