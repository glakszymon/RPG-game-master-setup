import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { isDev } from './utils.js';
import {
  initDatabase,
  saveCanvasState, loadCanvasState,
  savePreset, loadPresets, deletePreset, renamePreset,
  createCampaign, listCampaigns, updateCampaign, updateCampaignStatus, deleteCampaign, touchCampaignSession,
  listBestiaryTemplates, saveBestiaryTemplate, deleteBestiaryTemplate,
  listBestiaryFolders, saveBestiaryFolder, deleteBestiaryFolder,
  listBestiaryInstances, saveBestiaryInstance, deleteBestiaryInstance,
  loadCampaignSetting, saveCampaignSetting,
  listNoteFolders, saveNoteFolder, deleteNoteFolder,
  listNotes, getNote, saveNote, deleteNote,
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

  ipcMain.handle('dialog:read-image', (_event, filePath: string) => {
    try {
      const buffer = fs.readFileSync(filePath);
      const ext = path.extname(filePath).slice(1).toLowerCase();
      const mime = ext === 'jpg' ? 'image/jpeg' : `image/${ext}`;
      const base64 = buffer.toString('base64');
      return `data:${mime};base64,${base64}`;
    } catch {
      return null;
    }
  });

  // ── Bestiary IPC handlers ──

  ipcMain.handle('bestiary:list-templates', () => {
    try { return listBestiaryTemplates(); } catch { return []; }
  });

  ipcMain.handle('bestiary:save-template', (_event, dataJson: string) => {
    try { saveBestiaryTemplate(dataJson); return { ok: true }; } catch { return null; }
  });

  ipcMain.handle('bestiary:delete-template', (_event, id: string) => {
    try { deleteBestiaryTemplate(id); return { ok: true }; } catch { return null; }
  });

  ipcMain.handle('bestiary:list-folders', () => {
    try { return listBestiaryFolders(); } catch { return []; }
  });

  ipcMain.handle('bestiary:save-folder', (_event, id: string, parentId: string | null, name: string, sortOrder: number) => {
    try { saveBestiaryFolder(id, parentId, name, sortOrder); return { ok: true }; } catch { return null; }
  });

  ipcMain.handle('bestiary:delete-folder', (_event, id: string) => {
    try { deleteBestiaryFolder(id); return { ok: true }; } catch { return null; }
  });

  ipcMain.handle('bestiary:list-instances', () => {
    try { return listBestiaryInstances(); } catch { return []; }
  });

  ipcMain.handle('bestiary:save-instance', (_event, id: string, folderId: string, templateId: string | null, instanceName: string | null, overrides: string, sortOrder: number) => {
    try { saveBestiaryInstance(id, folderId, templateId, instanceName, overrides, sortOrder); return { ok: true }; } catch { return null; }
  });

  ipcMain.handle('bestiary:delete-instance', (_event, id: string) => {
    try { deleteBestiaryInstance(id); return { ok: true }; } catch { return null; }
  });

  // ── Campaign Settings IPC handlers ──

  ipcMain.handle('settings:load', (_event, campaignId: string, key: string) => {
    try { return loadCampaignSetting(campaignId, key); } catch { return null; }
  });

  ipcMain.handle('settings:save', (_event, campaignId: string, key: string, valueJson: string) => {
    try { saveCampaignSetting(campaignId, key, valueJson); return { ok: true }; } catch { return null; }
  });

  // ── Soundboard IPC handlers ──

  ipcMain.handle('soundboard:import-audio', async (_event, campaignId: string) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      properties: ['openFile'],
      filters: [
        { name: 'Audio', extensions: ['mp3', 'wav', 'ogg'] },
      ],
    });
    if (result.canceled || result.filePaths.length === 0) return null;

    const srcPath = result.filePaths[0];
    const fileName = path.basename(srcPath);
    const audioDir = path.join(app.getPath('userData'), 'campaigns', campaignId, 'audio');
    fs.mkdirSync(audioDir, { recursive: true });

    const destPath = path.join(audioDir, fileName);
    fs.copyFileSync(srcPath, destPath);
    return destPath;
  });

  ipcMain.handle('soundboard:read-audio', (_event, filePath: string) => {
    try {
      const buffer = fs.readFileSync(filePath);
      return new Uint8Array(buffer).buffer;
    } catch {
      return null;
    }
  });

  ipcMain.handle('soundboard:list-bundled', () => {
    try {
      const bundledDir = path.join(app.getAppPath(), 'assets', 'audio');
      if (!fs.existsSync(bundledDir)) return [];
      return fs.readdirSync(bundledDir).filter(f => /\.(mp3|wav|ogg)$/i.test(f));
    } catch {
      return [];
    }
  });

  ipcMain.handle('soundboard:read-bundled', (_event, key: string) => {
    try {
      const bundledDir = path.join(app.getAppPath(), 'assets', 'audio');
      // Try common extensions
      for (const ext of ['mp3', 'wav', 'ogg']) {
        const filePath = path.join(bundledDir, `${key}.${ext}`);
        if (fs.existsSync(filePath)) {
          const buffer = fs.readFileSync(filePath);
          // Return as Uint8Array for proper IPC serialization
          return new Uint8Array(buffer).buffer;
        }
      }
      return null;
    } catch {
      return null;
    }
  });

  // ── Notepad Folders ──

  ipcMain.handle('note-folders:list', (_event, campaignId: string) => {
    try { return listNoteFolders(campaignId); } catch { return []; }
  });

  ipcMain.handle('note-folders:save', (_event, id: string, campaignId: string, parentId: string | null, name: string, sortOrder: number) => {
    try { saveNoteFolder(id, campaignId, parentId, name, sortOrder); } catch { /* silent */ }
  });

  ipcMain.handle('note-folders:delete', (_event, id: string) => {
    try { deleteNoteFolder(id); } catch { /* silent */ }
  });

  // ── Notepad Notes ──

  ipcMain.handle('notes:list', (_event, campaignId: string) => {
    try { return listNotes(campaignId); } catch { return []; }
  });

  ipcMain.handle('notes:get', (_event, id: string) => {
    try { return getNote(id); } catch { return null; }
  });

  ipcMain.handle('notes:save', (_event, id: string, campaignId: string, folderId: string | null, title: string, contentJson: string, sortOrder: number) => {
    try { saveNote(id, campaignId, folderId, title, contentJson, sortOrder); } catch { /* silent */ }
  });

  ipcMain.handle('notes:delete', (_event, id: string) => {
    try { deleteNote(id); } catch { /* silent */ }
  });
});
