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

export interface BestiaryTemplateRow {
  id: string;
  name: string;
  creature_type: string | null;
  cr: string | null;
  hp_formula: string | null;
  hp_default: number | null;
  ac: number | null;
  speed: string | null;
  ability_scores: string | null;
  saving_throws: string | null;
  actions: string | null;
  actions_mode: string;
  actions_text: string;
  traits: string | null;
  custom_fields: string | null;
  tags: string | null;
  avatar_path: string | null;
  field_values: string | null;
  created_at: string;
  updated_at: string;
}

export interface BestiaryFolderRow {
  id: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface BestiaryInstanceRow {
  id: string;
  folder_id: string;
  template_id: string | null;
  instance_name: string | null;
  overrides: string | null;
  sort_order: number;
  created_at: string;
}

export interface ElectronBestiaryAPI {
  listTemplates: () => Promise<BestiaryTemplateRow[]>;
  saveTemplate: (dataJson: string) => Promise<{ ok: boolean } | null>;
  deleteTemplate: (id: string) => Promise<{ ok: boolean } | null>;
  listFolders: () => Promise<BestiaryFolderRow[]>;
  saveFolder: (id: string, parentId: string | null, name: string, sortOrder: number) => Promise<{ ok: boolean } | null>;
  deleteFolder: (id: string) => Promise<{ ok: boolean } | null>;
  listInstances: () => Promise<BestiaryInstanceRow[]>;
  saveInstance: (id: string, folderId: string, templateId: string | null, instanceName: string | null, overrides: string, sortOrder: number) => Promise<{ ok: boolean } | null>;
  deleteInstance: (id: string) => Promise<{ ok: boolean } | null>;
}

export interface ElectronSettingsAPI {
  load: (campaignId: string, key: string) => Promise<string | null>;
  save: (campaignId: string, key: string, valueJson: string) => Promise<{ ok: boolean } | null>;
}

export interface ElectronSoundboardAPI {
  importAudio: (campaignId: string) => Promise<string | null>;
  readAudio: (filePath: string) => Promise<ArrayBuffer | null>;
  listBundled: () => Promise<string[]>;
  readBundled: (key: string) => Promise<ArrayBuffer | null>;
}

export interface NoteRow {
  id: string;
  campaign_id: string;
  folder_id: string | null;
  title: string;
  content_json: string;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface NoteFolderRow {
  id: string;
  campaign_id: string;
  parent_id: string | null;
  name: string;
  sort_order: number;
  created_at: string;
}

export interface ElectronNotesAPI {
  list: (campaignId: string) => Promise<NoteRow[]>;
  get: (id: string) => Promise<NoteRow | null>;
  save: (id: string, campaignId: string, folderId: string | null, title: string, contentJson: string, sortOrder: number) => Promise<void>;
  delete: (id: string) => Promise<void>;
}

export interface ElectronNoteFoldersAPI {
  list: (campaignId: string) => Promise<NoteFolderRow[]>;
  save: (id: string, campaignId: string, parentId: string | null, name: string, sortOrder: number) => Promise<void>;
  delete: (id: string) => Promise<void>;
}

export interface ElectronAPI {
  canvas: ElectronCanvasAPI;
  presets: ElectronPresetsAPI;
  campaigns: ElectronCampaignsAPI;
  dialog: ElectronDialogAPI;
  bestiary: ElectronBestiaryAPI;
  settings: ElectronSettingsAPI;
  soundboard: ElectronSoundboardAPI;
  notes: ElectronNotesAPI;
  noteFolders: ElectronNoteFoldersAPI;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
