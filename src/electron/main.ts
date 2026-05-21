import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'path';
import fs from 'fs';
import { isDev } from './utils.js';
import { startServer, stopServer, getStatus, broadcast, registerAsset } from './lanServer.js';
import {
  initDatabase,
  saveCanvasState, loadCanvasState,
  savePreset, loadPresets, deletePreset, renamePreset,
  createCampaign, listCampaigns, updateCampaign, updateCampaignStatus, deleteCampaign, touchCampaignSession,
  listBestiaryTemplates, saveBestiaryTemplate, deleteBestiaryTemplate, getBestiaryAvatar,
  listBestiaryFolders, saveBestiaryFolder, deleteBestiaryFolder,
  listBestiaryInstances, saveBestiaryInstance, deleteBestiaryInstance,
  getInstanceState, updateInstanceState, getInstanceDependents, validateInstanceIds, deleteInstanceCascade,
  batchCreateInstances, createFolderWithInstances,
  seedSrdCreatures,
  loadCampaignSetting, saveCampaignSetting,
  listNoteFolders, saveNoteFolder, deleteNoteFolder,
  listNotes, getNote, saveNote, deleteNote,
  listNoteLinks, syncNoteLinks,
  listNoteGraphPositions, saveNoteGraphPosition,
  listNoteMapPresets, saveNoteMapPreset, deleteNoteMapPreset, getNoteMapPreset,
} from './database.js';

app.on('ready', async () => {
  // Initialize SQLite database
  await initDatabase();

  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: path.join(app.getAppPath(), 'assets/icon.png'),
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

  ipcMain.handle('bestiary:get-avatar', (_event, templateId: string) => {
    try { return getBestiaryAvatar(templateId); } catch { return null; }
  });

  ipcMain.handle('bestiary:save-template', (_event, dataJson: string) => {
    try { saveBestiaryTemplate(dataJson); return { ok: true }; } catch { return null; }
  });

  ipcMain.handle('bestiary:delete-template', (_event, id: string) => {
    try { deleteBestiaryTemplate(id); return { ok: true }; } catch { return null; }
  });

  ipcMain.handle('bestiary:list-folders', (_event, campaignId?: string) => {
    try { return listBestiaryFolders(campaignId); } catch { return []; }
  });

  ipcMain.handle('bestiary:save-folder', (_event, id: string, parentId: string | null, name: string, sortOrder: number, campaignId?: string) => {
    try { saveBestiaryFolder(id, parentId, name, sortOrder, campaignId); return { ok: true }; } catch { return null; }
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

  ipcMain.handle('bestiary:get-instance-state', (_event, instanceId: string) => {
    try { return getInstanceState(instanceId); } catch { return null; }
  });

  ipcMain.handle('bestiary:update-instance-state', (_event, instanceId: string, stateJson: string) => {
    try { updateInstanceState(instanceId, stateJson); return { ok: true }; } catch { return null; }
  });

  ipcMain.handle('bestiary:get-instance-dependents', (_event, instanceId: string) => {
    try { return getInstanceDependents(instanceId); } catch { return null; }
  });

  ipcMain.handle('bestiary:validate-instance-ids', (_event, ids: string[]) => {
    try { return validateInstanceIds(ids); } catch { return []; }
  });

  ipcMain.handle('bestiary:delete-instance-cascade', (_event, instanceId: string) => {
    try { return deleteInstanceCascade(instanceId); } catch { return null; }
  });

  ipcMain.handle('bestiary:batch-create-instances', (_event, templateIds: string[], folderId: string) => {
    try { return batchCreateInstances(templateIds, folderId); } catch { return null; }
  });

  ipcMain.handle('bestiary:create-folder-with-instances', (_event, folderName: string, templateIds: string[], parentId?: string, campaignId?: string) => {
    try { return createFolderWithInstances(folderName, templateIds, parentId, campaignId); } catch (e) { console.error('[IPC] createFolderWithInstances error:', e); return { error: String(e) }; }
  });

  ipcMain.handle('bestiary:seed-srd', () => {
    try { return seedSrdCreatures(); } catch (e) { console.error('[IPC] seedSrdCreatures error:', e); return null; }
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

  // ── Note Links ──

  ipcMain.handle('note-links:list', (_event, campaignId: string) => {
    try { return listNoteLinks(campaignId); } catch { return []; }
  });

  ipcMain.handle('note-links:sync', (_event, sourceNoteId: string, campaignId: string, targetNoteIds: string[]) => {
    try { syncNoteLinks(sourceNoteId, campaignId, targetNoteIds); } catch { /* silent */ }
  });

  // ── Note Graph Positions ──

  ipcMain.handle('note-graph:list-positions', (_event, campaignId: string) => {
    try { return listNoteGraphPositions(campaignId); } catch { return []; }
  });

  ipcMain.handle('note-graph:save-position', (_event, noteId: string, campaignId: string, x: number, y: number) => {
    try { saveNoteGraphPosition(noteId, campaignId, x, y); } catch { /* silent */ }
  });

  // ── Note Map Presets ──

  ipcMain.handle('note-presets:list', (_event, noteId: string) => {
    try { return listNoteMapPresets(noteId); } catch { return []; }
  });

  ipcMain.handle('note-presets:save', (_event, id: string, campaignId: string, noteId: string, name: string, mapStateJson: string, sortOrder: number) => {
    try { saveNoteMapPreset(id, campaignId, noteId, name, mapStateJson, sortOrder); } catch { /* silent */ }
  });

  ipcMain.handle('note-presets:delete', (_event, id: string) => {
    try { deleteNoteMapPreset(id); } catch { /* silent */ }
  });

  ipcMain.handle('note-presets:load', (_event, id: string) => {
    try { return getNoteMapPreset(id); } catch { return null; }
  });

  // ── LAN Server IPC handlers ──

  ipcMain.handle('lan:start', async (_event, port?: number) => {
    try { return await startServer(port); } catch { return { success: false, port: null, addresses: [], error: 'Unknown error' }; }
  });

  ipcMain.handle('lan:stop', async () => {
    try { await stopServer(); return { ok: true }; } catch { return null; }
  });

  ipcMain.handle('lan:status', () => {
    return getStatus();
  });

  ipcMain.handle('lan:broadcast', (_event, channel: string, data: unknown) => {
    broadcast(channel, data);
    return { ok: true };
  });

  ipcMain.handle('lan:register-asset', (_event, filename: string, base64Data: string) => {
    try {
      const buffer = Buffer.from(base64Data, 'base64');
      const urlPath = registerAsset(filename, buffer);
      return urlPath;
    } catch { return null; }
  });

  // ── Floating Utilities IPC handlers ──

  ipcMain.handle('floating:save-audio-segment', (_event, campaignId: string, buffer: ArrayBuffer, filename: string) => {
    try {
      const audioDir = path.join(app.getPath('userData'), 'campaigns', campaignId, 'recordings');
      fs.mkdirSync(audioDir, { recursive: true });
      const destPath = path.join(audioDir, filename);
      fs.writeFileSync(destPath, Buffer.from(buffer));
      return { ok: true };
    } catch {
      return null;
    }
  });

  // Graceful shutdown on app quit
  app.on('before-quit', async () => {
    await stopServer();
  });
});
