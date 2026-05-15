/**
 * Local UI types for the Time Session Timer tool.
 * Core data types (CustomTimer, CampaignTimeState.sessionTimer) live in canvas/types.ts.
 */

export interface TimerDisplayState {
  /** Current display milliseconds for real-time timers (computed from rAF) */
  displayMs: number;
}

export interface NewTimerForm {
  name: string;
  mode: 'real-time' | 'in-game';
  direction: 'up' | 'down';
  targetHours: string;
  targetMinutes: string;
  targetSeconds: string;
}

export const EMPTY_FORM: NewTimerForm = {
  name: '',
  mode: 'real-time',
  direction: 'up',
  targetHours: '0',
  targetMinutes: '30',
  targetSeconds: '0',
};
