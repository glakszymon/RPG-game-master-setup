import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import { isDev } from './utils.js';
import {
  initDatabase,
  saveCanvasState, loadCanvasState,
  savePreset, loadPresets, deletePreset, renamePreset,
  createCampaign, listCampaigns, updateCampaign, updateCampaignStatus, deleteCampaign, touchCampaignSession,
} from './database.js';

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

  // ── Campaign IPC handlers ──

  ipcMain.handle('campaigns:list', () => {
    return listCampaigns();
  });

  ipcMain.handle('campaigns:create', (_event, id: string, name: string, system: string, iconType: string, iconValue: string) => {
    createCampaign(id, name, system, iconType, iconValue);
    return { ok: true };
  });

  ipcMain.handle('campaigns:update', (_event, id: string, name: string, system: string, iconType: string, iconValue: string) => {
    updateCampaign(id, name, system, iconType, iconValue);
    return { ok: true };
  });

  ipcMain.handle('campaigns:update-status', (_event, id: string, status: string) => {
    updateCampaignStatus(id, status);
    return { ok: true };
  });

  ipcMain.handle('campaigns:delete', (_event, id: string) => {
    deleteCampaign(id);
    return { ok: true };
  });

  ipcMain.handle('campaigns:touch', (_event, id: string) => {
    touchCampaignSession(id);
    return { ok: true };
  });

  ipcMain.handle('dialog:open-image', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'webp'] },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });
});
