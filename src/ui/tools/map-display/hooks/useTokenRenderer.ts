import { useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import type { MapToken, MapTool } from '../types';
import type { CanvasRendererHandle, RenderContext } from './useCanvasRenderer';
import { screenToWorld } from './useCanvasRenderer';

export const TOKEN_RADIUS = 24;

/** Simple hash → HSL → hex string for consistent token colors */
function nameToColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 50%, 40%)`;
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export interface TokenRendererActions {
  addToken: (token: MapToken) => void;
  addTokenWithSync: (token: MapToken) => void;
  removeToken: (tokenId: string) => void;
  /** Draw all tokens (called from render loop in world-space) */
  drawTokens: (rc: RenderContext) => void;
}

export function useTokenRenderer(
  renderer: CanvasRendererHandle,
  tokens: MapToken[],
  activeTool: MapTool,
  onTokensChange: (tokens: MapToken[]) => void,
): TokenRendererActions {
  const tokensRef = useRef(tokens);
  useLayoutEffect(() => { tokensRef.current = tokens; });
  const onTokensChangeRef = useRef(onTokensChange);
  useLayoutEffect(() => { onTokensChangeRef.current = onTokensChange; });

  // Avatar cache: path → loaded HTMLImageElement (or null if loading/failed)
  const avatarCacheRef = useRef<Map<string, HTMLImageElement | null>>(new Map());
  const avatarLoadingRef = useRef<Set<string>>(new Set());

  // Load avatars when tokens change
  useEffect(() => {
    for (const token of tokens) {
      const path = token.avatarPath;
      if (!path) continue;
      if (avatarCacheRef.current.has(path) || avatarLoadingRef.current.has(path)) continue;

      avatarLoadingRef.current.add(path);

      (async () => {
        try {
          let dataUrl: string;
          if (path.startsWith('data:')) {
            dataUrl = path;
          } else {
            const result = await window.electronAPI?.dialog.readImage(path);
            if (!result) { avatarCacheRef.current.set(path, null); return; }
            dataUrl = result;
          }
          const img = new Image();
          img.onload = () => {
            avatarCacheRef.current.set(path, img);
            avatarLoadingRef.current.delete(path);
            renderer.markDirty();
          };
          img.onerror = () => {
            avatarCacheRef.current.set(path, null);
            avatarLoadingRef.current.delete(path);
          };
          img.src = dataUrl;
        } catch {
          avatarCacheRef.current.set(path, null);
          avatarLoadingRef.current.delete(path);
        }
      })();
    }
  }, [tokens, renderer]);

  // ── Drag handling ──
  useEffect(() => {
    const canvas = renderer.canvasRef.current;
    if (!canvas) return;

    const canDrag = activeTool === 'tokens' || activeTool === 'navigate';
    if (!canDrag) return;

    let dragging: { tokenId: string; offsetX: number; offsetY: number } | null = null;
    // Live position override during drag (world coords)
    let dragPos: { x: number; y: number } | null = null;

    const hitTest = (mx: number, my: number): string | null => {
      const toks = tokensRef.current;
      for (let i = toks.length - 1; i >= 0; i--) {
        const t = toks[i];
        const r = TOKEN_RADIUS * t.scale;
        const dx = mx - t.x;
        const dy = my - t.y;
        if (dx * dx + dy * dy <= r * r) return t.id;
      }
      return null;
    };

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const rect = canvas.getBoundingClientRect();
      const [mx, my] = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, renderer.viewportRef.current);
      const tokenId = hitTest(mx, my);
      if (!tokenId) return;

      const token = tokensRef.current.find((t) => t.id === tokenId);
      if (!token) return;

      dragging = { tokenId, offsetX: mx - token.x, offsetY: my - token.y };
      dragPos = { x: token.x, y: token.y };
      canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
      e.stopPropagation();
    };

    const onMove = (e: PointerEvent) => {
      if (!dragging) return;
      const rect = canvas.getBoundingClientRect();
      const [mx, my] = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, renderer.viewportRef.current);
      dragPos = { x: mx - dragging.offsetX, y: my - dragging.offsetY };
      // We need a way to draw at drag position — store it and markDirty
      dragPosMapRef.current = { id: dragging.tokenId, ...dragPos };
      renderer.markDirty();
    };

    const onUp = (e: PointerEvent) => {
      if (!dragging || !dragPos) return;
      const tokenId = dragging.tokenId;
      const newX = dragPos.x;
      const newY = dragPos.y;
      dragging = null;
      dragPos = null;
      dragPosMapRef.current = null;
      canvas.releasePointerCapture(e.pointerId);

      const updated = tokensRef.current.map((t) =>
        t.id === tokenId ? { ...t, x: newX, y: newY } : t,
      );
      onTokensChangeRef.current(updated);
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);

    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
    };
  }, [activeTool, renderer]);

  // Drag position override ref (shared between effect and draw)
  const dragPosMapRef = useRef<{ id: string; x: number; y: number } | null>(null);

  // ── Draw function ──
  const drawTokens = useCallback((rc: RenderContext) => {
    const { ctx } = rc;
    const toks = tokensRef.current;
    const dragOverride = dragPosMapRef.current;
    const cache = avatarCacheRef.current;

    for (const token of toks) {
      const tx = dragOverride?.id === token.id ? dragOverride.x : token.x;
      const ty = dragOverride?.id === token.id ? dragOverride.y : token.y;
      const radius = TOKEN_RADIUS * token.scale;

      // Circle clip + avatar or fallback
      ctx.save();
      ctx.beginPath();
      ctx.arc(tx, ty, radius, 0, Math.PI * 2);
      ctx.clip();

      const avatar = token.avatarPath ? cache.get(token.avatarPath) : null;
      if (avatar && avatar.complete && avatar.naturalWidth > 0) {
        ctx.drawImage(avatar, tx - radius, ty - radius, radius * 2, radius * 2);
      } else {
        ctx.fillStyle = nameToColor(token.name);
        ctx.fill();
        // Initials
        ctx.fillStyle = '#FFFFFF';
        const fontSize = radius * 0.8;
        ctx.font = `bold ${fontSize}px system-ui, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(getInitials(token.name), tx, ty);
      }
      ctx.restore();

      // Border ring
      ctx.beginPath();
      ctx.arc(tx, ty, radius, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      ctx.lineWidth = 2 / rc.viewport.zoom;
      ctx.stroke();

      // Name label below token
      ctx.fillStyle = '#E8E6E3';
      const labelSize = 12 / rc.viewport.zoom;
      ctx.font = `${labelSize}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(token.name, tx, ty + radius + 4 / rc.viewport.zoom);
    }
  }, []);

  // ── Actions ──
  const addToken = useCallback((token: MapToken) => {
    onTokensChangeRef.current([...tokensRef.current, token]);
  }, []);

  const addTokenWithSync = useCallback((token: MapToken) => {
    const synced = tokensRef.current.map((t) =>
      t.sourceType === 'party' && t.sourceId === token.sourceId
        ? { ...t, name: token.name, avatarPath: token.avatarPath }
        : t,
    );
    onTokensChangeRef.current([...synced, token]);
  }, []);

  const removeToken = useCallback((tokenId: string) => {
    onTokensChangeRef.current(tokensRef.current.filter((t) => t.id !== tokenId));
  }, []);

  return { addToken, addTokenWithSync, removeToken, drawTokens };
}
