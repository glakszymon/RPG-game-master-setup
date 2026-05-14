import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'path';
import { isDev } from './utils.js';
import { initDatabase, saveCanvasState, loadCanvasState, savePreset, loadPresets, deletePreset, renamePreset } from './database.js';

app.on('ready', async () => {
  // Initialize SQLite database
  await initDatabase();

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

  // ── Focus Presets IPC handlers ──

  ipcMain.handle('presets:save', (_event, campaignId: string, presetId: string, name: string, dataJson: string, isAutoSave: boolean) => {
    savePreset(campaignId, presetId, name, dataJson, isAutoSave);
    return { ok: true };
  });

  ipcMain.handle('presets:load-all', (_event, campaignId: string) => {
    return loadPresets(campaignId);
  });

  ipcMain.handle('presets:delete', (_event, campaignId: string, presetId: string) => {
    deletePreset(campaignId, presetId);
    return { ok: true };
  });

  ipcMain.handle('presets:rename', (_event, campaignId: string, presetId: string, newName: string) => {
    renamePreset(campaignId, presetId, newName);
    return { ok: true };
  });
});
