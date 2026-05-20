/**
 * PlayerPreview — Scaled-down canvas showing what players see.
 * Uses the same broadcast state (PlayerBroadcastState) for accuracy.
 */

import { useCallback, useEffect, useRef } from 'react';
import type { PlayerBroadcastState, PlayerMapState } from '../hooks/usePlayerViewBroadcast';
import type { PlayerViewState } from '../types';
import type { WindowState } from '../../../canvas/types';
import type { MapDisplayState } from '../../map-display/types';
import type { CombatTrackerState } from '../../combat-tracker/types';
import styles from './PlayerPreview.module.css';

interface PlayerPreviewProps {
  playerViewState: PlayerViewState;
  allWindows: WindowState[];
}

const TOKEN_RADIUS = 20;

export function PlayerPreview({ playerViewState, allWindows }: PlayerPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapImageRef = useRef<HTMLImageElement | null>(null);
  const lastMapUrl = useRef<string | null>(null);
  const rafRef = useRef<number>(0);

  // Build broadcast state locally (same logic as the hook)
  const buildState = useCallback((): PlayerBroadcastState => {
    const state: PlayerBroadcastState = { rotation: playerViewState.rotation };

    for (const win of allWindows) {
      if (!playerViewState.sharedWindows.includes(win.id)) continue;
      if (win.toolType === 'map-display' && win.toolState) {
        const ms = win.toolState as MapDisplayState;
        state.map = {
          imageUrl: ms.imagePath,
          viewport: ms.viewport,
          tokens: ms.tokens.map(t => ({ id: t.id, x: t.x, y: t.y, scale: t.scale, name: t.name, avatarUrl: t.avatarPath, sourceType: t.sourceType, sourceId: t.sourceId, conditions: [], hp: null, maxHp: null, isDead: false })),
          fowUrl: ms.fowDataUrl,
          grid: ms.grid,
          vfx: [],
        };
      }
      if (win.toolType === 'combat-tracker' && win.toolState) {
        const cs = win.toolState as CombatTrackerState;
        state.combat = {
          combatants: cs.combatants.map(c => ({ id: c.id, name: c.name, portraitUrl: c.portraitPath, initiative: c.initiativeRoll })),
          activeCombatantIndex: cs.activeCombatantIndex,
          activeSource: cs.isStarted && cs.activeCombatantIndex >= 0 && cs.combatants[cs.activeCombatantIndex]
            ? { sourceType: cs.combatants[cs.activeCombatantIndex].sourceType, sourceId: cs.combatants[cs.activeCombatantIndex].sourceId }
            : null,
          currentRound: cs.currentRound,
          isStarted: cs.isStarted,
        };
      }
    }
    return state;
  }, [playerViewState, allWindows]);

  // Load map image when URL changes
  useEffect(() => {
    const state = buildState();
    const url = state.map?.imageUrl ?? null;
    if (url === lastMapUrl.current) return;
    lastMapUrl.current = url;

    if (!url) { mapImageRef.current = null; return; }
    const img = new Image();
    img.src = url;
    img.onload = () => { mapImageRef.current = img; };
  }, [buildState]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const w = Math.floor(rect.width * devicePixelRatio);
    const h = Math.floor(rect.height * devicePixelRatio);
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w;
      canvas.height = h;
    }

    const state = buildState();
    ctx.clearRect(0, 0, w, h);

    if (!state.map) {
      ctx.fillStyle = '#222';
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = '#666';
      ctx.font = '12px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('No map shared', w / 2, h / 2);
      rafRef.current = requestAnimationFrame(render);
      return;
    }

    renderMap(ctx, w, h, state.map, mapImageRef.current);
    rafRef.current = requestAnimationFrame(render);
  }, [buildState]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, [render]);

  return (
    <div className={styles.previewContainer}>
      <canvas ref={canvasRef} className={styles.canvas} />
      {playerViewState.rotation !== 0 && (
        <span className={styles.rotationBadge}>{playerViewState.rotation}°</span>
      )}
    </div>
  );
}

function renderMap(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  map: PlayerMapState,
  mapImage: HTMLImageElement | null,
) {
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(map.viewport.zoom, map.viewport.zoom);
  ctx.translate(-map.viewport.x, -map.viewport.y);

  if (mapImage) {
    ctx.drawImage(mapImage, 0, 0, mapImage.naturalWidth, mapImage.naturalHeight);
  }

  // Draw tokens as small dots
  for (const token of map.tokens) {
    const r = TOKEN_RADIUS * token.scale * 0.5;
    ctx.beginPath();
    ctx.arc(token.x, token.y, r, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(130, 100, 255, 0.7)';
    ctx.fill();
  }

  ctx.restore();
}
