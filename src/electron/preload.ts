import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  canvas: {
    save: (campaignId: string, state: string) =>
      ipcRenderer.invoke('canvas:save', campaignId, state),
    load: (campaignId: string) =>
      ipcRenderer.invoke('canvas:load', campaignId),
  },
});
