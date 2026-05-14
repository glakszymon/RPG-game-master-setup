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

export interface CampaignData {
  id: string;
  name: string;
  system: string;
  icon_type: string;
  icon_value: string;
  status: string;
  created_at: string;
  last_session_at: string;
}

export interface ElectronCampaignsAPI {
  list: () => Promise<CampaignData[]>;
  create: (id: string, name: string, system: string, iconType: string, iconValue: string) => Promise<{ ok: boolean }>;
  update: (id: string, name: string, system: string, iconType: string, iconValue: string) => Promise<{ ok: boolean }>;
  updateStatus: (id: string, status: string) => Promise<{ ok: boolean }>;
  delete: (id: string) => Promise<{ ok: boolean }>;
  touch: (id: string) => Promise<{ ok: boolean }>;
}

export interface ElectronDialogAPI {
  openImageFile: () => Promise<string | null>;
  readImage: (filePath: string) => Promise<string | null>;
}

export interface ElectronAPI {
  canvas: ElectronCanvasAPI;
  presets: ElectronPresetsAPI;
  campaigns: ElectronCampaignsAPI;
  dialog: ElectronDialogAPI;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
