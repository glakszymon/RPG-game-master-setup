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
});
