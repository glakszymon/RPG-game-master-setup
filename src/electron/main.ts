import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { isDev } from './utils.js';
import { initDatabase, saveCanvasState, loadCanvasState } from './database.js';

app.on('ready', () => {
  // Initialize SQLite database
  initDatabase();

  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: path.join(app.getAppPath(), 'dist-electron/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev()) {
    mainWindow.loadURL('http://localhost:5123');
  } else {
    mainWindow.loadFile(path.join(app.getAppPath(), '/dist-react/index.html'));
  }

  // ── Canvas IPC handlers ──

  ipcMain.handle('canvas:save', (_event, campaignId: string, state: string) => {
    saveCanvasState(campaignId, state);
    return { ok: true };
  });

  ipcMain.handle('canvas:load', (_event, campaignId: string) => {
    return loadCanvasState(campaignId);
  });
});
