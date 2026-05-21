/*
 * Canvas types — state shape for the infinite canvas windowing system.
 */

export type ToolType =
  | 'combat-tracker'
  | 'party-tracker'
  | 'bestiary'
  | 'encounter-sets'
  | 'notepad'
  | 'map-display'
  | 'soundboard'
  | 'weather-generator'
  | 'time-clock'
  | 'time-calendar'
  | 'time-session-timer'
  | 'shop-generator'
  | 'dice-roller'
  | 'npc-tool'
  | 'player-view';

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

export type { FloatingWidgetState, FloatingUtilityType } from '../floating/types';
import type { FloatingWidgetState } from '../floating/types';

export interface CanvasState {
  windows: WindowState[];
  background: BackgroundType;
  /** Monotonic counter for z-order — index in windows array determines render order */
  nextWindowId: number;
  /** Shared time state across all time tool windows */
  timeState: CampaignTimeState;
  /** Viewport-fixed floating utility widgets */
  floatingWidgets: FloatingWidgetState[];
}

export interface ViewportTransform {
  x: number;
  y: number;
  scale: number;
}

/** A saved window layout snapshot (geometry only, no toolState) */
export interface PresetWindowSnapshot {
  toolType: ToolType;
  x: number;
  y: number;
  width: number;
  height: number;
  pinned: boolean;
  minimized: boolean;
}

export interface FocusPreset {
  id: string;
  name: string;
  windows: PresetWindowSnapshot[];
  viewport: ViewportTransform;
  isAutoSave: boolean;
  updatedAt: string;
}

/** Per-tool minimum dimensions */
export const TOOL_MIN_SIZES: Record<ToolType, { minWidth: number; minHeight: number }> = {
  'combat-tracker': { minWidth: 400, minHeight: 300 },
  'party-tracker': { minWidth: 450, minHeight: 350 },
  'bestiary': { minWidth: 350, minHeight: 300 },
  'encounter-sets': { minWidth: 500, minHeight: 350 },
  'notepad': { minWidth: 800, minHeight: 500 },
  'map-display': { minWidth: 400, minHeight: 400 },
  'soundboard': { minWidth: 350, minHeight: 250 },
  'weather-generator': { minWidth: 300, minHeight: 200 },
  'time-clock': { minWidth: 280, minHeight: 320 },
  'time-calendar': { minWidth: 320, minHeight: 350 },
  'time-session-timer': { minWidth: 280, minHeight: 250 },
  'shop-generator': { minWidth: 350, minHeight: 300 },
  'dice-roller': { minWidth: 250, minHeight: 200 },
  'npc-tool': { minWidth: 400, minHeight: 350 },
  'player-view': { minWidth: 350, minHeight: 400 },
};

/** Default sizes for new windows */
export const TOOL_DEFAULT_SIZES: Record<ToolType, { width: number; height: number }> = {
  'combat-tracker': { width: 500, height: 400 },
  'party-tracker': { width: 550, height: 400 },
  'bestiary': { width: 450, height: 400 },
  'encounter-sets': { width: 600, height: 500 },
  'notepad': { width: 1200, height: 700 },
  'map-display': { width: 600, height: 500 },
  'soundboard': { width: 400, height: 300 },
  'weather-generator': { width: 350, height: 280 },
  'time-clock': { width: 320, height: 400 },
  'time-calendar': { width: 420, height: 450 },
  'time-session-timer': { width: 350, height: 350 },
  'shop-generator': { width: 450, height: 380 },
  'dice-roller': { width: 300, height: 250 },
  'npc-tool': { width: 500, height: 450 },
  'player-view': { width: 500, height: 500 },
};

/** Tool display names and icons */
export const TOOL_INFO: Record<ToolType, { name: string; icon: string }> = {
  'combat-tracker': { name: 'Combat Tracker', icon: '⚔️' },
  'party-tracker': { name: 'Party Tracker', icon: '👥' },
  'bestiary': { name: 'Bestiary', icon: '🐉' },
  'encounter-sets': { name: 'Encounter Sets', icon: '⚔️' },
  'notepad': { name: 'Notepad', icon: '📝' },
  'map-display': { name: 'Map Display', icon: '🗺️' },
  'soundboard': { name: 'Soundboard', icon: '🔊' },
  'weather-generator': { name: 'Weather Generator', icon: '🌤️' },
  'time-clock': { name: 'Time Clock', icon: '🌅' },
  'time-calendar': { name: 'Calendar', icon: '📅' },
  'time-session-timer': { name: 'Session Timer', icon: '⏱️' },
  'shop-generator': { name: 'Shop Generator', icon: '🏪' },
  'dice-roller': { name: 'Dice Roller', icon: '🎲' },
  'npc-tool': { name: 'NPC Tool', icon: '🧑' },
  'player-view': { name: 'Player View', icon: '📡' },
};

/** Context menu categories */
export const TOOL_CATEGORIES = [
  {
    label: 'Combat Tools',
    tools: ['combat-tracker', 'encounter-sets', 'dice-roller'] as ToolType[],
  },
  {
    label: 'Party & NPCs',
    tools: ['party-tracker', 'bestiary', 'npc-tool'] as ToolType[],
  },
  {
    label: 'World & Time',
    tools: ['weather-generator', 'time-clock', 'time-calendar', 'time-session-timer', 'shop-generator'] as ToolType[],
  },
  {
    label: 'Notes & Content',
    tools: ['notepad', 'map-display'] as ToolType[],
  },
  {
    label: 'Audio/Visual',
    tools: ['soundboard', 'player-view'] as ToolType[],
  },
] as const;

// ── Time State ──

export interface CalendarConfig {
  months: Array<{ name: string; days: number }>;
  weekDays: string[];
  holidays: Array<{ month: number; day: number; name: string; color?: string }>;
  /** Advanced mode only */
  summerSolstice?: { month: number; day: number; dawnHour: number; duskHour: number };
  winterSolstice?: { month: number; day: number; dawnHour: number; duskHour: number };
}

export interface CustomTimer {
  id: string;
  name: string;
  mode: 'real-time' | 'in-game';
  direction: 'up' | 'down';
  targetMinutes: number;
  elapsedMinutes: number;
  startedAt: number | null;
  accumulatedMs: number;
  soundEnabled: boolean;
  paused: boolean;
  completed: boolean;
  pinned: boolean;
}

export interface CampaignTimeState {
  currentMinute: number;
  currentHour: number;
  currentDay: number;
  currentMonth: number;
  currentYear: number;

  dawnHour: number;
  duskHour: number;
  customTimeButtons: Array<{ label: string; minutes: number }>;

  calendarMode: 'simple' | 'advanced';
  calendar: CalendarConfig;

  autoAdvance: {
    enabled: boolean;
    ratio: number;
  };

  sessionTimer: {
    startedAt: number | null;
    accumulatedMs: number;
  };
  customTimers: CustomTimer[];
}

const REAL_WORLD_MONTHS = [
  { name: 'January', days: 31 }, { name: 'February', days: 28 },
  { name: 'March', days: 31 }, { name: 'April', days: 30 },
  { name: 'May', days: 31 }, { name: 'June', days: 30 },
  { name: 'July', days: 31 }, { name: 'August', days: 31 },
  { name: 'September', days: 30 }, { name: 'October', days: 31 },
  { name: 'November', days: 30 }, { name: 'December', days: 31 },
];

const REAL_WORLD_WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export const DEFAULT_TIME_STATE: CampaignTimeState = {
  currentMinute: 0,
  currentHour: 12,
  currentDay: 1,
  currentMonth: 0,
  currentYear: 1,

  dawnHour: 6,
  duskHour: 18,
  customTimeButtons: [],

  calendarMode: 'simple',
  calendar: {
    months: REAL_WORLD_MONTHS,
    weekDays: REAL_WORLD_WEEKDAYS,
    holidays: [],
  },

  autoAdvance: { enabled: false, ratio: 10 },

  sessionTimer: { startedAt: null, accumulatedMs: 0 },
  customTimers: [],
};
