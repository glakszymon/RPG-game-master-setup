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
  category: 'nature' | 'interior' | 'combat' | 'ambient';
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
  { key: 'rain', name: 'Rain', category: 'nature', icon: 'water_drop' },
  { key: 'forest', name: 'Forest', category: 'nature', icon: 'forest' },
  { key: 'dungeon', name: 'Dungeon', category: 'interior', icon: 'castle' },
  { key: 'battle', name: 'Battle', category: 'combat', icon: 'swords' },
  { key: 'fire', name: 'Fire', category: 'interior', icon: 'local_fire_department' },
  { key: 'wind', name: 'Wind', category: 'nature', icon: 'air' },
  { key: 'river', name: 'River', category: 'nature', icon: 'waves' },
  { key: 'tavern', name: 'Tavern', category: 'interior', icon: 'sports_bar' },
];
