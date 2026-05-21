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
    getAvatar: (templateId: string) => ipcRenderer.invoke('bestiary:get-avatar', templateId),
    saveTemplate: (dataJson: string) => ipcRenderer.invoke('bestiary:save-template', dataJson),
    deleteTemplate: (id: string) => ipcRenderer.invoke('bestiary:delete-template', id),
    listFolders: (campaignId?: string) => ipcRenderer.invoke('bestiary:list-folders', campaignId),
    saveFolder: (id: string, parentId: string | null, name: string, sortOrder: number, campaignId?: string) =>
      ipcRenderer.invoke('bestiary:save-folder', id, parentId, name, sortOrder, campaignId),
    deleteFolder: (id: string) => ipcRenderer.invoke('bestiary:delete-folder', id),
    listInstances: () => ipcRenderer.invoke('bestiary:list-instances'),
    saveInstance: (id: string, folderId: string, templateId: string | null, instanceName: string | null, overrides: string, sortOrder: number) =>
      ipcRenderer.invoke('bestiary:save-instance', id, folderId, templateId, instanceName, overrides, sortOrder),
    deleteInstance: (id: string) => ipcRenderer.invoke('bestiary:delete-instance', id),
    getInstanceState: (instanceId: string) => ipcRenderer.invoke('bestiary:get-instance-state', instanceId),
    updateInstanceState: (instanceId: string, stateJson: string) => ipcRenderer.invoke('bestiary:update-instance-state', instanceId, stateJson),
    getInstanceDependents: (instanceId: string) => ipcRenderer.invoke('bestiary:get-instance-dependents', instanceId),
    validateInstanceIds: (ids: string[]) => ipcRenderer.invoke('bestiary:validate-instance-ids', ids),
    deleteInstanceCascade: (instanceId: string) => ipcRenderer.invoke('bestiary:delete-instance-cascade', instanceId),
    batchCreateInstances: (templateIds: string[], folderId: string) => ipcRenderer.invoke('bestiary:batch-create-instances', templateIds, folderId),
    createFolderWithInstances: (folderName: string, templateIds: string[], parentId?: string, campaignId?: string) =>
      ipcRenderer.invoke('bestiary:create-folder-with-instances', folderName, templateIds, parentId, campaignId),
    seedSrd: () => ipcRenderer.invoke('bestiary:seed-srd'),
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
  noteLinks: {
    list: (campaignId: string) =>
      ipcRenderer.invoke('note-links:list', campaignId),
    sync: (sourceNoteId: string, campaignId: string, targetNoteIds: string[]) =>
      ipcRenderer.invoke('note-links:sync', sourceNoteId, campaignId, targetNoteIds),
  },
  noteGraph: {
    listPositions: (campaignId: string) =>
      ipcRenderer.invoke('note-graph:list-positions', campaignId),
    savePosition: (noteId: string, campaignId: string, x: number, y: number) =>
      ipcRenderer.invoke('note-graph:save-position', noteId, campaignId, x, y),
  },
  notePresets: {
    list: (noteId: string) =>
      ipcRenderer.invoke('note-presets:list', noteId),
    save: (id: string, campaignId: string, noteId: string, name: string, mapStateJson: string, sortOrder: number) =>
      ipcRenderer.invoke('note-presets:save', id, campaignId, noteId, name, mapStateJson, sortOrder),
    delete: (id: string) =>
      ipcRenderer.invoke('note-presets:delete', id),
    load: (id: string) =>
      ipcRenderer.invoke('note-presets:load', id),
  },
  lan: {
    start: (port?: number) =>
      ipcRenderer.invoke('lan:start', port),
    stop: () =>
      ipcRenderer.invoke('lan:stop'),
    status: () =>
      ipcRenderer.invoke('lan:status'),
    broadcast: (channel: string, data: unknown) =>
      ipcRenderer.invoke('lan:broadcast', channel, data),
    registerAsset: (filename: string, base64Data: string) =>
      ipcRenderer.invoke('lan:register-asset', filename, base64Data),
  },
  floating: {
    saveAudioSegment: (campaignId: string, buffer: ArrayBuffer, filename: string) =>
      ipcRenderer.invoke('floating:save-audio-segment', campaignId, buffer, filename),
  },
  npc: {
    list: (campaignId: string) =>
      ipcRenderer.invoke('npc:list', campaignId),
    get: (id: string) =>
      ipcRenderer.invoke('npc:get', id),
    save: (dataJson: string) =>
      ipcRenderer.invoke('npc:save', dataJson),
    delete: (id: string) =>
      ipcRenderer.invoke('npc:delete', id),
    listCustomFields: (campaignId: string) =>
      ipcRenderer.invoke('npc:list-custom-fields', campaignId),
    saveCustomField: (id: string, campaignId: string, fieldName: string, fieldType: string, sortOrder: number) =>
      ipcRenderer.invoke('npc:save-custom-field', id, campaignId, fieldName, fieldType, sortOrder),
    deleteCustomField: (id: string) =>
      ipcRenderer.invoke('npc:delete-custom-field', id),
    listNameLists: (campaignId: string) =>
      ipcRenderer.invoke('npc:list-name-lists', campaignId),
    saveNameList: (id: string, campaignId: string, label: string, dataJson: string) =>
      ipcRenderer.invoke('npc:save-name-list', id, campaignId, label, dataJson),
    deleteNameList: (id: string) =>
      ipcRenderer.invoke('npc:delete-name-list', id),
  },
});
