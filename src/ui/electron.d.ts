export interface ElectronCanvasAPI {
  save: (campaignId: string, state: string) => Promise<{ ok: boolean }>;
  load: (campaignId: string) => Promise<string | null>;
}

export interface ElectronAPI {
  canvas: ElectronCanvasAPI;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
