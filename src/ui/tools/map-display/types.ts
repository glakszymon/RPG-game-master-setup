export type MapTool = 'navigate' | 'fow-reveal' | 'fow-conceal' | 'tokens' | 'vfx';

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

export interface MapDisplayState {
    imagePath: string | null;
    grid: GridConfig;
    viewport: ViewportState;
    tokens: MapToken[];
    fowDataUrl: string | null;
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
};