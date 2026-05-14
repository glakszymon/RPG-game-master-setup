/*
 * Database — SQLite persistence for canvas state and future campaign data.
 *
 * Uses better-sqlite3 for synchronous, fast SQLite access from the main process.
 * Canvas state is stored as JSON blobs per campaign for simplicity.
 */

import Database from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';
import fs from 'fs';

let db: Database.Database | null = null;

export function initDatabase(): void {
  const userDataPath = app.getPath('userData');
  const dbDir = path.join(userDataPath, 'data');

  // Ensure data directory exists
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }

  const dbPath = path.join(dbDir, 'game-master-panel.db');
  db = new Database(dbPath);

  // Enable WAL mode for better concurrent read/write performance
  db.pragma('journal_mode = WAL');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS canvas_state (
      campaign_id TEXT PRIMARY KEY,
      state_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

export function saveCanvasState(campaignId: string, stateJson: string): void {
  if (!db) throw new Error('Database not initialized');

  const stmt = db.prepare(`
    INSERT INTO canvas_state (campaign_id, state_json, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(campaign_id)
    DO UPDATE SET state_json = excluded.state_json, updated_at = datetime('now')
  `);

  stmt.run(campaignId, stateJson);
}

export function loadCanvasState(campaignId: string): string | null {
  if (!db) throw new Error('Database not initialized');

  const row = db.prepare(
    'SELECT state_json FROM canvas_state WHERE campaign_id = ?',
  ).get(campaignId) as { state_json: string } | undefined;

  return row?.state_json ?? null;
}
