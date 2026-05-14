/*
 * Canvas types — state shape for the infinite canvas windowing system.
 */

export type ToolType =
  | 'combat-tracker'
  | 'party-tracker'
  | 'bestiary'
  | 'notepad'
  | 'map-display'
  | 'soundboard'
  | 'weather-generator'
  | 'time-tracker'
  | 'shop-generator'
  | 'dice-roller';

export interface WindowState {
  id: string;
  toolType: ToolType;
  x: number;
  y: number;
  width: number;
  height: number;
  pinned: boolean;
  minimized: boolean;
  toolState: unknown;
}

export type BackgroundType = 'solid' | 'dot-grid' | 'line-grid';

export interface CanvasState {
  windows: WindowState[];
  background: BackgroundType;
  /** Monotonic counter for z-order — index in windows array determines render order */
  nextWindowId: number;
}

export interface ViewportTransform {
  x: number;
  y: number;
  scale: number;
}

/** Per-tool minimum dimensions */
export const TOOL_MIN_SIZES: Record<ToolType, { minWidth: number; minHeight: number }> = {
  'combat-tracker': { minWidth: 400, minHeight: 300 },
  'party-tracker': { minWidth: 450, minHeight: 350 },
  'bestiary': { minWidth: 350, minHeight: 300 },
  'notepad': { minWidth: 300, minHeight: 250 },
  'map-display': { minWidth: 400, minHeight: 400 },
  'soundboard': { minWidth: 350, minHeight: 250 },
  'weather-generator': { minWidth: 300, minHeight: 200 },
  'time-tracker': { minWidth: 280, minHeight: 200 },
  'shop-generator': { minWidth: 350, minHeight: 300 },
  'dice-roller': { minWidth: 250, minHeight: 200 },
};

/** Default sizes for new windows */
export const TOOL_DEFAULT_SIZES: Record<ToolType, { width: number; height: number }> = {
  'combat-tracker': { width: 500, height: 400 },
  'party-tracker': { width: 550, height: 400 },
  'bestiary': { width: 450, height: 400 },
  'notepad': { width: 400, height: 350 },
  'map-display': { width: 600, height: 500 },
  'soundboard': { width: 400, height: 300 },
  'weather-generator': { width: 350, height: 280 },
  'time-tracker': { width: 320, height: 250 },
  'shop-generator': { width: 450, height: 380 },
  'dice-roller': { width: 300, height: 250 },
};

/** Tool display names and icons */
export const TOOL_INFO: Record<ToolType, { name: string; icon: string }> = {
  'combat-tracker': { name: 'Combat Tracker', icon: '⚔️' },
  'party-tracker': { name: 'Party Tracker', icon: '👥' },
  'bestiary': { name: 'Bestiary', icon: '🐉' },
  'notepad': { name: 'Notepad', icon: '📝' },
  'map-display': { name: 'Map Display', icon: '🗺️' },
  'soundboard': { name: 'Soundboard', icon: '🔊' },
  'weather-generator': { name: 'Weather Generator', icon: '🌤️' },
  'time-tracker': { name: 'Time Tracker', icon: '⏰' },
  'shop-generator': { name: 'Shop Generator', icon: '🏪' },
  'dice-roller': { name: 'Dice Roller', icon: '🎲' },
};

/** Context menu categories */
export const TOOL_CATEGORIES = [
  {
    label: 'Combat Tools',
    tools: ['combat-tracker', 'dice-roller'] as ToolType[],
  },
  {
    label: 'Party & NPCs',
    tools: ['party-tracker', 'bestiary'] as ToolType[],
  },
  {
    label: 'World & Time',
    tools: ['weather-generator', 'time-tracker', 'shop-generator'] as ToolType[],
  },
  {
    label: 'Notes & Content',
    tools: ['notepad', 'map-display'] as ToolType[],
  },
  {
    label: 'Audio/Visual',
    tools: ['soundboard'] as ToolType[],
  },
] as const;
