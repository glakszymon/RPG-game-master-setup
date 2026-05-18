/*
 * Event Bus — typed event definitions for cross-tool communication.
 */

import type { ActiveCondition, Combatant } from '../tools/combat-tracker/types';

export interface EventMap {
  'combat:turn-changed': { sourceType: string; sourceId: string | null; combatantId: string };
  'combat:hp-changed': { sourceType: string; sourceId: string | null; delta: number; currentHp: number; maxHp: number };
  'combat:conditions-changed': { sourceType: string; sourceId: string | null; conditions: ActiveCondition[] };
  'combat:combatant-added': { combatant: Combatant };
  'combat:reset': Record<string, never>;
}

export type EventKey = keyof EventMap;
export type EventHandler<K extends EventKey> = (payload: EventMap[K]) => void;
