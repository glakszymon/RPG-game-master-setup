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

  persist();
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
