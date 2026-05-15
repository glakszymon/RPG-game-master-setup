import { useEffect, useRef, useCallback } from 'react';
import { Graphics, Container, Text, Application, Assets, Sprite, TextStyle } from 'pixi.js';
import type { MapToken, MapTool } from '../types';

/**
 * useTokenLayer — renders tokens on the map and handles dragging.
 *
 * Each token is a Container with:
 *   - Circle background (colored, with initials as fallback)
 *   - Avatar sprite (if avatarPath provided, loaded via IPC base64)
 *   - Name label below
 *
 * Tokens are draggable when activeTool === 'tokens' or 'navigate'.
 * Drag uses left mouse button on token containers.
 */

const TOKEN_RADIUS = 24;

const LABEL_STYLE = new TextStyle({
  fontSize: 11,
  fill: '#E8E6E3',
  align: 'center',
  fontFamily: 'system-ui, sans-serif',
  dropShadow: {
    color: '#000000',
    blur: 2,
    distance: 1,
    alpha: 0.8,
  },
});

/** Simple hash → hue for consistent token colors */
function nameToColor(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  // Convert HSL(hue, 50%, 40%) to hex (approximate)
  const h = hue / 60;
  const c = 0.5; // chroma
  const x = c * (1 - Math.abs((h % 2) - 1));
  let r = 0, g = 0, b = 0;
  if (h < 1) { r = c; g = x; }
  else if (h < 2) { r = x; g = c; }
  else if (h < 3) { g = c; b = x; }
  else if (h < 4) { g = x; b = c; }
  else if (h < 5) { r = x; b = c; }
  else { r = c; b = x; }
  const m = 0.4 - c / 2;
  const toHex = (v: number) => Math.round((v + m) * 255);
  return (toHex(r) << 16) | (toHex(g) << 8) | toHex(b);
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

interface TokenLayerActions {
  addToken: (token: MapToken) => void;
  addTokenWithSync: (token: MapToken) => void;
  removeToken: (tokenId: string) => void;
  updateTokensBySource: (sourceId: string, patch: { name: string; avatarPath: string | null }) => void;
}

export function useTokenLayer(
  appRef: React.RefObject<Application | null>,
  worldContainerRef: React.RefObject<Container | null>,
  tokens: MapToken[],
  activeTool: MapTool,
  onTokensChange: (tokens: MapToken[]) => void,
): TokenLayerActions {
  const tokenContainerRef = useRef<Container | null>(null);
  const tokenSpritesRef = useRef<Map<string, Container>>(new Map());
  const tokensRef = useRef(tokens);
  useEffect(() => { tokensRef.current = tokens; });

  // ── Create token layer container ──
  useEffect(() => {
    const worldContainer = worldContainerRef.current;
    if (!worldContainer) return;

    const layer = new Container();
    layer.label = 'token-layer';
    // Add on top of everything (after map, grid, fow)
    worldContainer.addChild(layer);
    tokenContainerRef.current = layer;
    const sprites = tokenSpritesRef.current;

    return () => {
      layer.destroy({ children: true });
      tokenContainerRef.current = null;
      sprites.clear();
    };
  }, [worldContainerRef]);

  const tokenDataRef = useRef<Map<string, { name: string; avatarPath: string | null }>>(new Map());

  // ── Sync token sprites with token data ──
  useEffect(() => {
    const app = appRef.current;
    const layer = tokenContainerRef.current;
    if (!app || !layer) return;

    const existing = tokenSpritesRef.current;
    const prevData = tokenDataRef.current;
    const currentIds = new Set(tokens.map((t) => t.id));

    // Remove tokens that no longer exist
    for (const [id, container] of existing) {
      if (!currentIds.has(id)) {
        container.destroy({ children: true });
        existing.delete(id);
        prevData.delete(id);
      }
    }

    // Add or update tokens
    for (const token of tokens) {
      let container = existing.get(token.id);
      const prev = prevData.get(token.id);
      const nameChanged = prev && prev.name !== token.name;
      const avatarChanged = prev && prev.avatarPath !== token.avatarPath;

      // Rebuild visual if name or avatar changed
      if (container && (nameChanged || avatarChanged)) {
        container.destroy({ children: true });
        existing.delete(token.id);
        container = undefined;
      }

      if (!container) {
        container = createTokenVisual(token);
        layer.addChild(container);
        existing.set(token.id, container);

        // Load avatar async if available
        if (token.avatarPath) {
          loadTokenAvatar(app, container, token.avatarPath);
        }
      }

      // Update position
      container.x = token.x;
      container.y = token.y;
      container.scale.set(token.scale);

      // Track current data for change detection
      prevData.set(token.id, { name: token.name, avatarPath: token.avatarPath });
    }
  }, [appRef, tokens]);

  // ── Drag handling ──
  useEffect(() => {
    const app = appRef.current;
    const worldContainer = worldContainerRef.current;
    const canvas = app?.renderer ? app.canvas : null;
    if (!canvas || !worldContainer) return;

    const canDrag = activeTool === 'tokens' || activeTool === 'navigate';
    if (!canDrag) return;

    let dragging: { tokenId: string; offsetX: number; offsetY: number } | null = null;

    const toMapCoords = (e: PointerEvent) => {
      if (worldContainer.destroyed) return null;
      const rect = canvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      return {
        x: (cx - worldContainer.x) / worldContainer.scale.x,
        y: (cy - worldContainer.y) / worldContainer.scale.y,
      };
    };

    const hitTest = (mapX: number, mapY: number): string | null => {
      const radius = TOKEN_RADIUS;
      // Check in reverse order (top-most first)
      for (let i = tokensRef.current.length - 1; i >= 0; i--) {
        const t = tokensRef.current[i];
        const dx = mapX - t.x;
        const dy = mapY - t.y;
        if (dx * dx + dy * dy <= radius * radius * t.scale * t.scale) {
          return t.id;
        }
      }
      return null;
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const pos = toMapCoords(e);
      if (!pos) return;
      const tokenId = hitTest(pos.x, pos.y);
      if (!tokenId) return;

      const token = tokensRef.current.find((t) => t.id === tokenId);
      if (!token) return;

      dragging = {
        tokenId,
        offsetX: pos.x - token.x,
        offsetY: pos.y - token.y,
      };
      canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
      e.stopPropagation();
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!dragging) return;
      const pos = toMapCoords(e);
      if (!pos) return;
      const newX = pos.x - dragging.offsetX;
      const newY = pos.y - dragging.offsetY;

      // Update visual immediately
      const sprite = tokenSpritesRef.current.get(dragging.tokenId);
      if (sprite) {
        sprite.x = newX;
        sprite.y = newY;
      }
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!dragging) return;
      const pos = toMapCoords(e);
      if (!pos) return;
      const newX = pos.x - dragging.offsetX;
      const newY = pos.y - dragging.offsetY;
      const tokenId = dragging.tokenId;
      dragging = null;
      canvas.releasePointerCapture(e.pointerId);

      // Persist position
      const updated = tokensRef.current.map((t) =>
        t.id === tokenId ? { ...t, x: newX, y: newY } : t,
      );
      onTokensChange(updated);
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
    };
  }, [appRef, worldContainerRef, activeTool, onTokensChange]);

  // ── Public actions ──
  const addToken = useCallback((token: MapToken) => {
    onTokensChange([...tokensRef.current, token]);
  }, [onTokensChange]);

  /** Add token + sync name/avatar on existing tokens from same source in one atomic update */
  const addTokenWithSync = useCallback((token: MapToken) => {
    const synced = tokensRef.current.map((t) =>
      t.sourceType === 'party' && t.sourceId === token.sourceId
        ? { ...t, name: token.name, avatarPath: token.avatarPath }
        : t,
    );
    onTokensChange([...synced, token]);
  }, [onTokensChange]);

  const removeToken = useCallback((tokenId: string) => {
    onTokensChange(tokensRef.current.filter((t) => t.id !== tokenId));
  }, [onTokensChange]);

  const updateTokensBySource = useCallback((sourceId: string, patch: { name: string; avatarPath: string | null }) => {
    const current = tokensRef.current;
    const hasMatch = current.some((t) => t.sourceId === sourceId);
    if (!hasMatch) return;
    onTokensChange(current.map((t) =>
      t.sourceId === sourceId ? { ...t, name: patch.name, avatarPath: patch.avatarPath } : t,
    ));
  }, [onTokensChange]);

  return { addToken, addTokenWithSync, removeToken, updateTokensBySource };
}

// ── Create the visual for a single token ──
function createTokenVisual(token: MapToken): Container {
  const container = new Container();
  container.label = `token-${token.id}`;

  // Background circle
  const bg = new Graphics();
  const color = nameToColor(token.name);
  bg.circle(0, 0, TOKEN_RADIUS).fill({ color, alpha: 0.85 });
  bg.circle(0, 0, TOKEN_RADIUS).stroke({ color: 0xffffff, width: 2, alpha: 0.6 });
  container.addChild(bg);

  // Initials text (fallback, always rendered — hidden when avatar loads)
  const initials = new Text({ text: getInitials(token.name), style: new TextStyle({
    fontSize: 16,
    fill: '#FFFFFF',
    fontWeight: 'bold',
    fontFamily: 'system-ui, sans-serif',
    align: 'center',
  })});
  initials.anchor.set(0.5);
  initials.label = 'initials';
  container.addChild(initials);

  // Name label below
  const label = new Text({ text: token.name, style: LABEL_STYLE });
  label.anchor.set(0.5, 0);
  label.y = TOKEN_RADIUS + 4;
  container.addChild(label);

  return container;
}

// ── Load avatar into token container ──
async function loadTokenAvatar(
  _app: Application,
  container: Container,
  avatarPath: string,
) {
  try {
    // avatarPath may already be a base64 data URL (from Party Tracker's img src)
    let dataUrl: string;
    if (avatarPath.startsWith('data:')) {
      dataUrl = avatarPath;
    } else {
      const result = await window.electronAPI?.dialog.readImage(avatarPath);
      if (!result || container.destroyed) return;
      dataUrl = result;
    }
    if (container.destroyed) return;

    const texture = await Assets.load(dataUrl);
    const sprite = new Sprite(texture);

    // Fit into circle — scale to TOKEN_RADIUS * 2
    const maxDim = Math.max(texture.width, texture.height);
    const scale = (TOKEN_RADIUS * 2) / maxDim;
    sprite.width = texture.width * scale;
    sprite.height = texture.height * scale;
    sprite.anchor.set(0.5);

    // Create circular mask
    const mask = new Graphics();
    mask.circle(0, 0, TOKEN_RADIUS).fill({ color: 0xffffff });
    container.addChild(mask);
    sprite.mask = mask;

    // Add avatar behind initials, hide initials
    container.addChildAt(sprite, 1);
    const initials = container.children.find((c) => c.label === 'initials');
    if (initials) initials.visible = false;
  } catch {
    // Keep initials fallback
  }
}
