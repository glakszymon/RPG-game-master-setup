import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  canvas: {
    save: (campaignId: string, state: string) =>
      ipcRenderer.invoke('canvas:save', campaignId, state),
    load: (campaignId: string) =>
      ipcRenderer.invoke('canvas:load', campaignId),
  },
  presets: {
    save: (campaignId: string, presetId: string, name: string, dataJson: string, isAutoSave: boolean) =>
      ipcRenderer.invoke('presets:save', campaignId, presetId, name, dataJson, isAutoSave),
    loadAll: (campaignId: string) =>
      ipcRenderer.invoke('presets:load-all', campaignId),
    delete: (campaignId: string, presetId: string) =>
      ipcRenderer.invoke('presets:delete', campaignId, presetId),
    rename: (campaignId: string, presetId: string, newName: string) =>
      ipcRenderer.invoke('presets:rename', campaignId, presetId, newName),
  },
  campaigns: {
    list: () => ipcRenderer.invoke('campaigns:list'),
    create: (id: string, name: string, system: string, iconType: string, iconValue: string) =>
      ipcRenderer.invoke('campaigns:create', id, name, system, iconType, iconValue),
    update: (id: string, name: string, system: string, iconType: string, iconValue: string) =>
      ipcRenderer.invoke('campaigns:update', id, name, system, iconType, iconValue),
    updateStatus: (id: string, status: string) =>
      ipcRenderer.invoke('campaigns:update-status', id, status),
    delete: (id: string) => ipcRenderer.invoke('campaigns:delete', id),
    touch: (id: string) => ipcRenderer.invoke('campaigns:touch', id),
  },
  dialog: {
    openImageFile: () => ipcRenderer.invoke('dialog:open-image'),
    readImage: (filePath: string) => ipcRenderer.invoke('dialog:read-image', filePath),
  },
  bestiary: {
    listTemplates: () => ipcRenderer.invoke('bestiary:list-templates'),
    saveTemplate: (dataJson: string) => ipcRenderer.invoke('bestiary:save-template', dataJson),
    deleteTemplate: (id: string) => ipcRenderer.invoke('bestiary:delete-template', id),
    listFolders: () => ipcRenderer.invoke('bestiary:list-folders'),
    saveFolder: (id: string, parentId: string | null, name: string, sortOrder: number) =>
      ipcRenderer.invoke('bestiary:save-folder', id, parentId, name, sortOrder),
    deleteFolder: (id: string) => ipcRenderer.invoke('bestiary:delete-folder', id),
    listInstances: () => ipcRenderer.invoke('bestiary:list-instances'),
    saveInstance: (id: string, folderId: string, templateId: string | null, instanceName: string | null, overrides: string, sortOrder: number) =>
      ipcRenderer.invoke('bestiary:save-instance', id, folderId, templateId, instanceName, overrides, sortOrder),
    deleteInstance: (id: string) => ipcRenderer.invoke('bestiary:delete-instance', id),
  },
  settings: {
    load: (campaignId: string, key: string) =>
      ipcRenderer.invoke('settings:load', campaignId, key),
    save: (campaignId: string, key: string, valueJson: string) =>
      ipcRenderer.invoke('settings:save', campaignId, key, valueJson),
  },
  soundboard: {
    importAudio: (campaignId: string) =>
      ipcRenderer.invoke('soundboard:import-audio', campaignId),
    readAudio: (filePath: string) =>
      ipcRenderer.invoke('soundboard:read-audio', filePath),
    listBundled: () =>
      ipcRenderer.invoke('soundboard:list-bundled'),
    readBundled: (key: string) =>
      ipcRenderer.invoke('soundboard:read-bundled', key),
  },
  notes: {
    list: (campaignId: string) =>
      ipcRenderer.invoke('notes:list', campaignId),
    get: (id: string) =>
      ipcRenderer.invoke('notes:get', id),
    save: (id: string, campaignId: string, folderId: string | null, title: string, contentJson: string, sortOrder: number) =>
      ipcRenderer.invoke('notes:save', id, campaignId, folderId, title, contentJson, sortOrder),
    delete: (id: string) =>
      ipcRenderer.invoke('notes:delete', id),
  },
  noteFolders: {
    list: (campaignId: string) =>
      ipcRenderer.invoke('note-folders:list', campaignId),
    save: (id: string, campaignId: string, parentId: string | null, name: string, sortOrder: number) =>
      ipcRenderer.invoke('note-folders:save', id, campaignId, parentId, name, sortOrder),
    delete: (id: string) =>
      ipcRenderer.invoke('note-folders:delete', id),
  },
});
