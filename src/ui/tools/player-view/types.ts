/**
 * Player View tool types — state for the LAN sharing control panel.
 */

export interface PlayerViewState {
  serverRunning: boolean;
  port: number | null;
  addresses: string[];
  connections: number;
  sharedWindows: string[];
  rotation: 0 | 90 | 180 | 270;
  interactionMode: 'disabled' | 'immediate' | 'approval';
}

export const DEFAULT_PLAYER_VIEW_STATE: PlayerViewState = {
  serverRunning: false,
  port: null,
  addresses: [],
  connections: 0,
  sharedWindows: [],
  rotation: 0,
  interactionMode: 'disabled',
};
