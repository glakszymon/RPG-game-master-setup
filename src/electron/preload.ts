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
});
