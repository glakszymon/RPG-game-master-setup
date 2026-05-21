/** Types matching PlayerBroadcastState from usePlayerViewBroadcast */

export interface PlayerTokenCondition {
  conditionId: string;
  color: string;
}

export interface PlayerToken {
  id: string;
  x: number;
  y: number;
  scale: number;
  name: string;
  avatarUrl: string | null;
  sourceType: string;
  sourceId: string;
  conditions: PlayerTokenCondition[];
  hp: number | null;
  maxHp: number | null;
  isDead: boolean;
}

export interface PlayerMapState {
  imageUrl: string | null;
  viewport: { x: number; y: number; zoom: number };
  tokens: PlayerToken[];
  fowUrl: string | null;
  grid: { type: string; cellSize: number; opacity: number };
  vfx: Array<{
    id: string;
    preset: string;
    x: number;
    y: number;
    size: number;
    mode: string;
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
  activeSource: { sourceType: string; sourceId: string | null } | null;
  currentRound: number;
  isStarted: boolean;
}

export interface PlayerBroadcastState {
  map?: PlayerMapState;
  combat?: PlayerCombatState;
  rotation: 0 | 90 | 180 | 270;
  hpEvents?: HpAnimationEvent[];
  conditionsLegend?: ConditionLegendEntry[];
}

export interface HpAnimationEvent {
  sourceType: string;
  sourceId: string | null;
  delta: number;
  currentHp: number;
}

export interface ConditionLegendEntry {
  id: string;
  name: string;
  color: string;
}
