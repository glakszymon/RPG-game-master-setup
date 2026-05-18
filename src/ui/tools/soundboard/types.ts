/*
 * Soundboard — data types
 *
 * Defines all state interfaces for the soundboard tool.
 */

/** Soundboard UI mode */
export type SoundboardMode = 'simple' | 'mixer';

/** Audio source origin */
export type TrackSource = 'imported' | 'bundled';

/** A single audio track */
export interface SoundboardTrack {
  id: string;
  name: string;
  tags: string[];
  source: TrackSource;
  /** Relative path (imported) or bundled key (bundled) */
  filePath: string;
  volume: number; // 0-1
  loop: boolean;
  isPlaying: boolean;
  /** Mixer-only: enable stacking multiple instances */
  stackingEnabled: boolean;
  /** Mixer-only: max simultaneous instances (6-8) */
  maxInstances: number;
  /** Mixer-only: jitter intensity 0-1 */
  jitterIntensity: number;
}

/** Track config snapshot within a preset */
export interface PresetTrackConfig {
  trackId: string;
  volume: number;
  isPlaying: boolean;
  loop: boolean;
}

/** A saved scene preset */
export interface SoundboardPreset {
  id: string;
  name: string;
  trackConfigs: PresetTrackConfig[];
}

/** Bundled sample metadata */
export interface BundledSample {
  key: string;
  name: string;
  category: 'nature' | 'interior' | 'combat' | 'ambient' | 'music' | 'fx';
  icon: string;
}

/** Full soundboard tool state (stored in WindowState.toolState) */
export interface SoundboardState {
  mode: SoundboardMode;
  tracks: SoundboardTrack[];
  presets: SoundboardPreset[];
  activePresetId: string | null;
  masterVolume: number; // 0-1
}

/** Default state for new soundboard instances */
export const DEFAULT_SOUNDBOARD_STATE: SoundboardState = {
  mode: 'simple',
  tracks: [],
  presets: [],
  activePresetId: null,
  masterVolume: 0.8,
};

/** Bundled CC0 sample catalog */
export const BUNDLED_SAMPLES: BundledSample[] = [
  // Nature / Environment
  { key: 'rain', name: 'Rain', category: 'nature', icon: 'water_drop' },
  { key: 'forest', name: 'Forest', category: 'nature', icon: 'forest' },
  { key: 'wind', name: 'Wind', category: 'nature', icon: 'air' },
  // Interior
  { key: 'fireplace', name: 'Fireplace', category: 'interior', icon: 'local_fire_department' },
  { key: 'tavern', name: 'Tavern', category: 'interior', icon: 'sports_bar' },
  { key: 'town', name: 'Town', category: 'interior', icon: 'location_city' },
  // Ambient Music
  { key: 'Ambient 1', name: 'Ambient 1', category: 'music', icon: 'music_note' },
  { key: 'Ambient 2', name: 'Ambient 2', category: 'music', icon: 'music_note' },
  { key: 'Ambient 3', name: 'Ambient 3', category: 'music', icon: 'music_note' },
  { key: 'Ambient 4', name: 'Ambient 4', category: 'music', icon: 'music_note' },
  { key: 'Ambient 5', name: 'Ambient 5', category: 'music', icon: 'music_note' },
  { key: 'Ambient 6', name: 'Ambient 6', category: 'music', icon: 'music_note' },
  { key: 'Ambient 7', name: 'Ambient 7', category: 'music', icon: 'music_note' },
  { key: 'Ambient 8', name: 'Ambient 8', category: 'music', icon: 'music_note' },
  { key: 'Ambient 9', name: 'Ambient 9', category: 'music', icon: 'music_note' },
  { key: 'Ambient 10', name: 'Ambient 10', category: 'music', icon: 'music_note' },
  // Light Ambience Music
  { key: 'Light Ambience 1', name: 'Light Ambience 1', category: 'music', icon: 'sunny' },
  { key: 'Light Ambience 2', name: 'Light Ambience 2', category: 'music', icon: 'sunny' },
  { key: 'Light Ambience 3', name: 'Light Ambience 3', category: 'music', icon: 'sunny' },
  { key: 'Light Ambience 4', name: 'Light Ambience 4', category: 'music', icon: 'sunny' },
  { key: 'Light Ambience 5', name: 'Light Ambience 5', category: 'music', icon: 'sunny' },
  // Dark Ambient Music
  { key: 'Dark Ambient 1', name: 'Dark Ambient 1', category: 'music', icon: 'dark_mode' },
  { key: 'Dark Ambient 2', name: 'Dark Ambient 2', category: 'music', icon: 'dark_mode' },
  { key: 'Dark Ambient 3', name: 'Dark Ambient 3', category: 'music', icon: 'dark_mode' },
  { key: 'Dark Ambient 4', name: 'Dark Ambient 4', category: 'music', icon: 'dark_mode' },
  { key: 'Dark Ambient 5', name: 'Dark Ambient 5', category: 'music', icon: 'dark_mode' },
  // Action Music
  { key: 'Action 1', name: 'Action 1', category: 'combat', icon: 'bolt' },
  { key: 'Action 2', name: 'Action 2', category: 'combat', icon: 'bolt' },
  { key: 'Action 3', name: 'Action 3', category: 'combat', icon: 'bolt' },
  { key: 'Action 4', name: 'Action 4', category: 'combat', icon: 'bolt' },
  { key: 'Action 5', name: 'Action 5', category: 'combat', icon: 'bolt' },
  // Sound Effects
  { key: 'bell', name: 'Bell', category: 'fx', icon: 'notifications' },
  { key: 'Fx 1', name: 'Fx 1', category: 'fx', icon: 'volume_up' },
  { key: 'Fx 2', name: 'Fx 2', category: 'fx', icon: 'volume_up' },
  { key: 'Fx 3', name: 'Fx 3', category: 'fx', icon: 'volume_up' },
];
