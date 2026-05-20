/**
 * usePlayerViewBroadcast — Broadcasts shared tool state to players via IPC.
 * Uses a fixed-interval approach (15fps) to guarantee live updates.
 */

import { useEffect, useRef } from 'react';
import type { PlayerViewState } from '../types';
import type { MapDisplayState } from '../../map-display/types';
import type { CombatTrackerState } from '../../combat-tracker/types';
import type { WindowState } from '../../../canvas/types';

// ── Player-safe broadcast types ──

export interface PlayerMapState {
  imageUrl: string | null;
  viewport: { x: number; y: number; zoom: number };
  tokens: Array<{ id: string; x: number; y: number; scale: number; name: string; avatarUrl: string | null }>;
  fowUrl: string | null;
  grid: { type: string; cellSize: number; opacity: number };
  vfx: Array<{ id: string; preset: string; x: number; y: number; size: number; mode: string; remainingMs: number }>;
}

export interface PlayerCombatState {
  combatants: Array<{ id: string; name: string; portraitUrl: string | null; initiative: number | null }>;
  activeCombatantIndex: number;
  currentRound: number;
  isStarted: boolean;
}

export interface PlayerBroadcastState {
  map?: PlayerMapState;
  combat?: PlayerCombatState;
  rotation: 0 | 90 | 180 | 270;
}

// ── Interval ──

const BROADCAST_INTERVAL_MS = 66; // ~15fps

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

  // Keep refs fresh
  stateRef.current = playerViewState;
  windowsRef.current = allWindows;

  useEffect(() => {
    if (!playerViewState.serverRunning) return;

    const tick = () => {
      const pvState = stateRef.current;
      const wins = windowsRef.current;

      if (!pvState.serverRunning || pvState.sharedWindows.length === 0) return;

      const state = buildBroadcastState(pvState, wins);
      const json = JSON.stringify(state);

      if (json === lastJson.current) return;
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

  for (const win of allWindows) {
    if (!playerViewState.sharedWindows.includes(win.id)) continue;

    if (win.toolType === 'map-display' && win.toolState) {
      state.map = transformMapState(win.toolState as MapDisplayState);
    }

    if (win.toolType === 'combat-tracker' && win.toolState) {
      state.combat = transformCombatState(win.toolState as CombatTrackerState);
    }
  }

  return state;
}

function transformMapState(mapState: MapDisplayState): PlayerMapState {
  const now = performance.now();

  return {
    imageUrl: filePathToUrl(mapState.imagePath),
    viewport: mapState.viewport,
    tokens: mapState.tokens.map(t => ({
      id: t.id,
      x: t.x,
      y: t.y,
      scale: t.scale,
      name: t.name,
      avatarUrl: filePathToUrl(t.avatarPath),
    })),
    fowUrl: filePathToUrl(mapState.fowDataUrl),
    grid: mapState.grid,
    vfx: mapState.vfxInstances.map(v => ({
      id: v.id,
      preset: v.preset,
      x: v.x,
      y: v.y,
      size: v.size,
      mode: v.mode,
      remainingMs: v.mode === 'one-shot'
        ? Math.max(0, (v.duration * 1000) - (now - v.startTime))
        : v.duration === 0 ? Infinity : Math.max(0, (v.duration * 1000) - (now - v.startTime)),
    })),
  };
}

function transformCombatState(combat: CombatTrackerState): PlayerCombatState {
  return {
    combatants: combat.combatants.map(c => ({
      id: c.id,
      name: c.name,
      portraitUrl: filePathToUrl(c.portraitPath),
      initiative: c.initiativeRoll,
    })),
    activeCombatantIndex: combat.activeCombatantIndex,
    currentRound: combat.currentRound,
    isStarted: combat.isStarted,
  };
}
