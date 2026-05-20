/** Types matching PlayerBroadcastState from usePlayerViewBroadcast */

export interface PlayerMapState {
  imageUrl: string | null;
  viewport: { x: number; y: number; zoom: number };
  tokens: Array<{
    id: string;
    x: number;
    y: number;
    scale: number;
    name: string;
    avatarUrl: string | null;
  }>;
  fowUrl: string | null;
  grid: { type: string; cellSize: number; opacity: number };
  vfx: Array<{
    id: string;
    preset: string;
    x: number;
    y: number;
    size: number;
    mode: string;
    remainingMs: number;
  }>;
}

export interface PlayerCombatState {
  combatants: Array<{
    id: string;
    name: string;
    portraitUrl: string | null;
    initiative: number | null;
  }>;
  activeCombatantIndex: number;
  currentRound: number;
  isStarted: boolean;
}

export interface PlayerBroadcastState {
  map?: PlayerMapState;
  combat?: PlayerCombatState;
  rotation: 0 | 90 | 180 | 270;
}
