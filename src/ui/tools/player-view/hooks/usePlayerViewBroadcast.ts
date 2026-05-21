/**
 * usePlayerViewBroadcast — Broadcasts shared tool state to players via IPC.
 * Uses a fixed-interval approach (15fps) to guarantee live updates.
 */

import { useEffect, useRef } from 'react';
import { useSubscribe } from '../../../event-bus';
import type { PlayerViewState } from '../types';
import type { MapDisplayState } from '../../map-display/types';
import type { CombatTrackerState } from '../../combat-tracker/types';
import type { WindowState } from '../../../canvas/types';

// ── Player-safe broadcast types ──

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
  vfx: Array<{ id: string; preset: string; x: number; y: number; size: number; mode: string }>;
}

export interface PlayerCombatState {
  combatants: Array<{ id: string; name: string; portraitUrl: string | null; initiative: number | null }>;
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

// ── Interval ──

const BROADCAST_INTERVAL_MS = 200; // 5fps — enough for live feel without overloading

/**
 * Convert a local file path to a relative HTTP URL served by the LAN server.
 */
function filePathToUrl(filePath: string | null): string | null {
  if (!filePath) return null;
  if (filePath.startsWith('data:')) return filePath;
  if (filePath.startsWith('http://') || filePath.startsWith('https://')) return filePath;
  return `/file?path=${encodeURIComponent(filePath)}`;
}

export function usePlayerViewBroadcast(
  playerViewState: PlayerViewState,
  allWindows: WindowState[],
) {
  const stateRef = useRef(playerViewState);
  const windowsRef = useRef(allWindows);
  const lastJson = useRef('');
  const hpEventQueue = useRef<HpAnimationEvent[]>([]);

  // Keep refs fresh
  stateRef.current = playerViewState;
  windowsRef.current = allWindows;

  // Subscribe to HP change events and queue them for next broadcast tick
  useSubscribe('combat:hp-changed', ({ sourceType, sourceId, delta, currentHp }) => {
    if (!stateRef.current.serverRunning) return;
    hpEventQueue.current.push({ sourceType, sourceId, delta, currentHp });
  });

  useEffect(() => {
    if (!playerViewState.serverRunning) return;

    const tick = () => {
      const pvState = stateRef.current;
      const wins = windowsRef.current;

      if (!pvState.serverRunning || pvState.sharedWindows.length === 0) return;

      const state = buildBroadcastState(pvState, wins);

      // Attach queued HP events
      const pendingHp = hpEventQueue.current.splice(0);
      if (pendingHp.length > 0) {
        state.hpEvents = pendingHp;
      }

      const json = JSON.stringify(state);

      // Only broadcast when state actually changed (but always broadcast if HP events present)
      if (json === lastJson.current && pendingHp.length === 0) return;
      lastJson.current = json;

      window.electronAPI?.lan.broadcast('state-update', state);
    };

    // Broadcast immediately on start
    tick();

    const interval = setInterval(tick, BROADCAST_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [playerViewState.serverRunning]);
}

// ── State transformation ──

function buildBroadcastState(
  playerViewState: PlayerViewState,
  allWindows: WindowState[],
): PlayerBroadcastState {
  const state: PlayerBroadcastState = {
    rotation: playerViewState.rotation,
  };

  // Extract combat state first (needed to enrich map tokens)
  let combatState: CombatTrackerState | null = null;
  for (const win of allWindows) {
    if (win.toolType === 'combat-tracker' && win.toolState) {
      combatState = win.toolState as CombatTrackerState;
      break;
    }
  }

  for (const win of allWindows) {
    if (!playerViewState.sharedWindows.includes(win.id)) continue;

    if (win.toolType === 'map-display' && win.toolState) {
      state.map = transformMapState(win.toolState as MapDisplayState, combatState);
    }

    if (win.toolType === 'combat-tracker' && win.toolState) {
      state.combat = transformCombatState(win.toolState as CombatTrackerState);
    }
  }

  // Include conditions legend if enabled
  if (playerViewState.showEffectsLegend && combatState) {
    const conditions = combatState.conditions.length > 0 ? combatState.conditions : [];
    state.conditionsLegend = conditions.map(c => ({
      id: c.id,
      name: c.name,
      color: CONDITION_COLORS[c.id] ?? '#94a3b8',
    }));
  }

  return state;
}

const CONDITION_COLORS: Record<string, string> = {
  stunned: '#eab308',
  poisoned: '#22c55e',
  blinded: '#6b7280',
  frightened: '#a855f7',
  prone: '#f97316',
  paralyzed: '#eab308',
  charmed: '#ec4899',
  restrained: '#78716c',
  invisible: '#38bdf8',
  incapacitated: '#dc2626',
};

function transformMapState(mapState: MapDisplayState, combat: CombatTrackerState | null): PlayerMapState {
  return {
    imageUrl: filePathToUrl(mapState.imagePath),
    viewport: mapState.viewport,
    tokens: mapState.tokens.map(t => {
      // Find matching combatant by sourceType + sourceId
      const combatant = combat?.combatants.find(
        c => c.sourceType === t.sourceType && c.sourceId === t.sourceId,
      ) ?? null;

      return {
        id: t.id,
        x: t.x,
        y: t.y,
        scale: t.scale,
        name: t.name,
        avatarUrl: filePathToUrl(t.avatarPath),
        sourceType: t.sourceType,
        sourceId: t.sourceId,
        conditions: combatant?.conditions.map(ac => ({
          conditionId: ac.conditionId,
          color: CONDITION_COLORS[ac.conditionId] ?? '#94a3b8',
        })) ?? [],
        hp: combatant?.hp ?? null,
        maxHp: combatant?.maxHp ?? null,
        isDead: combatant ? combatant.hp <= 0 : false,
      };
    }),
    fowUrl: filePathToUrl(mapState.fowDataUrl),
    grid: mapState.grid,
    vfx: mapState.vfxInstances.map(v => ({
      id: v.id,
      preset: v.preset,
      x: v.x,
      y: v.y,
      size: v.size,
      mode: v.mode,
    })),
  };
}

function transformCombatState(combat: CombatTrackerState): PlayerCombatState {
  const activeCombatant = combat.isStarted && combat.activeCombatantIndex >= 0
    ? combat.combatants[combat.activeCombatantIndex] ?? null
    : null;

  return {
    combatants: combat.combatants.map(c => ({
      id: c.id,
      name: c.name,
      portraitUrl: filePathToUrl(c.portraitPath),
      initiative: c.initiativeRoll,
    })),
    activeCombatantIndex: combat.activeCombatantIndex,
    activeSource: activeCombatant
      ? { sourceType: activeCombatant.sourceType, sourceId: activeCombatant.sourceId }
      : null,
    currentRound: combat.currentRound,
    isStarted: combat.isStarted,
  };
}
