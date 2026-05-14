export interface ElectronCanvasAPI {
  save: (campaignId: string, state: string) => Promise<{ ok: boolean }>;
  load: (campaignId: string) => Promise<string | null>;
}

export interface ElectronPresetsAPI {
  save: (campaignId: string, presetId: string, name: string, dataJson: string, isAutoSave: boolean) => Promise<{ ok: boolean }>;
  loadAll: (campaignId: string) => Promise<string>;
  delete: (campaignId: string, presetId: string) => Promise<{ ok: boolean }>;
  rename: (campaignId: string, presetId: string, newName: string) => Promise<{ ok: boolean }>;
}

export interface ElectronAPI {
  canvas: ElectronCanvasAPI;
  presets: ElectronPresetsAPI;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
