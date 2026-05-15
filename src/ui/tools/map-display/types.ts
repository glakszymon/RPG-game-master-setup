export type MapTool = 'navigate' | 'fow-reveal' | 'fow-conceal' | 'tokens' | 'vfx';

export type VfxPreset = 'fire' | 'explosion' | 'smoke' | 'lightning' | 'glow' | 'fog' | 'ice';

export interface VfxInstance {
  id: string;
  preset: VfxPreset;
  x: number;
  y: number;
  size: number;
  mode: 'one-shot' | 'persistent';
  duration: number; // seconds, 0 = infinite for persistent
  startTime: number; // performance.now() timestamp when placed
}

export interface MapToken {
  id: string;
  sourceType: 'party' | 'bestiary' | 'manual';
  sourceId: string;
  name: string;
  avatarPath: string | null;
  x: number;
  y: number;
  scale: number;
}

/** Standardized drag-drop payload protocol for adding tokens to the map */
export interface MapDropPayload {
  type: 'party-character' | 'bestiary-creature';
  id: string;
  name: string;
  portraitPath: string | null;
  meta?: Record<string, unknown>;
}

export interface GridConfig {
  type: 'square' | 'hex' | 'none';
  cellSize: number;
  opacity: number;
}

export interface ViewportState {
  x: number;
  y: number;
  zoom: number;
}

export interface VfxSettings {
  selectedPreset: VfxPreset;
  size: number;
  mode: 'one-shot' | 'persistent';
  duration: number;
}

export interface MapDisplayState {
    imagePath: string | null;
    grid: GridConfig;
    viewport: ViewportState;
    tokens: MapToken[];
    fowDataUrl: string | null;
    activeTool: MapTool;
    brushSettings: BrushSettings;
    vfxInstances: VfxInstance[];
    vfxSettings: VfxSettings;
}

export interface BrushSettings {
    size: number;
    opacity: number;
}

export const DEFAULT_MAP_STATE: MapDisplayState = {
  imagePath: null,
  grid: { type: 'square', cellSize: 64, opacity: 0.3 },
  viewport: { x: 0, y: 0, zoom: 1 },
  tokens: [],
  fowDataUrl: null,
  activeTool: 'navigate',
  brushSettings: { size: 40, opacity: 1 },
  vfxInstances: [],
  vfxSettings: { selectedPreset: 'fire', size: 60, mode: 'persistent', duration: 2 },
};