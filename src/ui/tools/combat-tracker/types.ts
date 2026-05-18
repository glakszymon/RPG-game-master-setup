/*
 * Combat Tracker — data types
 */

/** An active condition on a combatant with duration tracking */
export interface ActiveCondition {
  conditionId: string;
  /** Duration mode: 'rounds' = turn-based, 'time' = real-time seconds */
  mode: 'rounds' | 'time';
  /** Rounds remaining (mode=rounds). null = indefinite */
  roundsLeft: number | null;
  /** Timestamp (ms) when the condition expires (mode=time). null = indefinite */
  expiresAt: number | null;
}

/** A single combatant in the encounter */
export interface Combatant {
  id: string;
  name: string;
  portraitPath: string | null;
  hp: number;
  maxHp: number;
  armor: number;
  initiativeModifier: number;
  initiativeRoll: number | null;
  conditions: ActiveCondition[];
  sourceType: 'party' | 'bestiary' | 'manual';
  sourceId: string | null;
}

/** A condition/status that can be applied to combatants */
export interface CombatCondition {
  id: string;
  name: string;
  isCustom: boolean;
}

/** Notification about an expired condition */
export interface ConditionExpiry {
  combatantName: string;
  conditionName: string;
}

/** Combat Tracker tool state (stored in WindowState.toolState) */
export interface CombatTrackerState {
  combatants: Combatant[];
  activeCombatantIndex: number;
  currentRound: number;
  conditions: CombatCondition[];
  isStarted: boolean;
}

/** Default preset conditions */
export const DEFAULT_CONDITIONS: CombatCondition[] = [
  { id: 'stunned', name: 'Stunned', isCustom: false },
  { id: 'poisoned', name: 'Poisoned', isCustom: false },
  { id: 'blinded', name: 'Blinded', isCustom: false },
  { id: 'frightened', name: 'Frightened', isCustom: false },
  { id: 'prone', name: 'Prone', isCustom: false },
  { id: 'paralyzed', name: 'Paralyzed', isCustom: false },
  { id: 'charmed', name: 'Charmed', isCustom: false },
  { id: 'restrained', name: 'Restrained', isCustom: false },
  { id: 'invisible', name: 'Invisible', isCustom: false },
  { id: 'incapacitated', name: 'Incapacitated', isCustom: false },
];

/** Default empty state */
export const DEFAULT_COMBAT_TRACKER_STATE: CombatTrackerState = {
  combatants: [],
  activeCombatantIndex: -1,
  currentRound: 1,
  conditions: DEFAULT_CONDITIONS,
  isStarted: false,
};
