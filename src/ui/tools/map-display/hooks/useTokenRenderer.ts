import { useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { useSubscribe } from '../../../event-bus';
import type { MapToken, MapTool } from '../types';
import type { CanvasRendererHandle, RenderContext } from './useCanvasRenderer';
import { screenToWorld, canvasLocalCoords } from './useCanvasRenderer';

export const TOKEN_RADIUS = 24;

// ── Constants for combat overlays ──

const FLOAT_DURATION = 1200;
const FLOAT_DISTANCE = 48;
const MAX_FLOATING_TEXTS = 50;
const GLOW_PERIOD = 1500;

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

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  startTime: number;
}

interface ConditionIndicator {
  color: string;
  conditionId: string;
}

// ── Utility functions ──

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Draw a condition-specific icon centered at (0,0). Size is the bounding box radius. */
function drawConditionIcon(ctx: CanvasRenderingContext2D, conditionId: string, size: number, zoom: number): void {
  const s = size;
  const lw = Math.max(1.5 / zoom, s * 0.08);
  ctx.strokeStyle = '#FFFFFF';
  ctx.fillStyle = '#FFFFFF';
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (conditionId) {
    case 'blinded': {
      // Crossed-out eye
      const ew = s * 0.8;
      const eh = s * 0.45;
      ctx.beginPath();
      ctx.ellipse(0, 0, ew / 2, eh / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
      // Pupil
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.15, 0, Math.PI * 2);
      ctx.fill();
      // Strike-through
      ctx.beginPath();
      ctx.moveTo(-s * 0.55, -s * 0.55);
      ctx.lineTo(s * 0.55, s * 0.55);
      ctx.stroke();
      break;
    }
    case 'stunned': {
      // Stars / dizzy spirals
      drawStar(ctx, 0, -s * 0.2, s * 0.3);
      drawStar(ctx, -s * 0.3, s * 0.2, s * 0.2);
      drawStar(ctx, s * 0.3, s * 0.2, s * 0.2);
      break;
    }
    case 'poisoned': {
      // Skull-like: circle + crossbones
      ctx.beginPath();
      ctx.arc(0, -s * 0.1, s * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      // X eyes
      const ex = s * 0.12;
      const ey = -s * 0.15;
      const ed = s * 0.08;
      ctx.beginPath();
      ctx.moveTo(-ex - ed, ey - ed); ctx.lineTo(-ex + ed, ey + ed);
      ctx.moveTo(-ex + ed, ey - ed); ctx.lineTo(-ex - ed, ey + ed);
      ctx.moveTo(ex - ed, ey - ed); ctx.lineTo(ex + ed, ey + ed);
      ctx.moveTo(ex + ed, ey - ed); ctx.lineTo(ex - ed, ey + ed);
      ctx.stroke();
      // Drip
      ctx.beginPath();
      ctx.moveTo(0, s * 0.2);
      ctx.lineTo(-s * 0.08, s * 0.5);
      ctx.lineTo(s * 0.08, s * 0.5);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'frightened': {
      // Exclamation mark in triangle
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.5);
      ctx.lineTo(-s * 0.45, s * 0.4);
      ctx.lineTo(s * 0.45, s * 0.4);
      ctx.closePath();
      ctx.stroke();
      // !
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.2);
      ctx.lineTo(0, s * 0.1);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, s * 0.25, s * 0.06, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'prone': {
      // Horizontal figure (lying down)
      ctx.beginPath();
      ctx.arc(-s * 0.3, 0, s * 0.15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.15, 0);
      ctx.lineTo(s * 0.5, 0);
      ctx.stroke();
      // Arrow down
      ctx.beginPath();
      ctx.moveTo(s * 0.3, -s * 0.2);
      ctx.lineTo(s * 0.3, s * 0.3);
      ctx.moveTo(s * 0.15, s * 0.15);
      ctx.lineTo(s * 0.3, s * 0.3);
      ctx.lineTo(s * 0.45, s * 0.15);
      ctx.stroke();
      break;
    }
    case 'paralyzed': {
      // Lightning bolt
      ctx.beginPath();
      ctx.moveTo(s * 0.1, -s * 0.5);
      ctx.lineTo(-s * 0.15, 0);
      ctx.lineTo(s * 0.1, 0);
      ctx.lineTo(-s * 0.1, s * 0.5);
      ctx.stroke();
      break;
    }
    case 'charmed': {
      // Heart
      ctx.beginPath();
      ctx.moveTo(0, s * 0.4);
      ctx.bezierCurveTo(-s * 0.5, s * 0.1, -s * 0.5, -s * 0.3, 0, -s * 0.15);
      ctx.bezierCurveTo(s * 0.5, -s * 0.3, s * 0.5, s * 0.1, 0, s * 0.4);
      ctx.fill();
      break;
    }
    case 'restrained': {
      // Chain links
      ctx.beginPath();
      ctx.ellipse(-s * 0.15, 0, s * 0.2, s * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(s * 0.15, 0, s * 0.2, s * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'invisible': {
      // Dashed circle (ghost outline)
      ctx.setLineDash([s * 0.15, s * 0.1]);
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      // Question mark
      ctx.font = `bold ${s * 0.5}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', 0, 0);
      break;
    }
    case 'incapacitated': {
      // X mark
      ctx.beginPath();
      ctx.moveTo(-s * 0.35, -s * 0.35);
      ctx.lineTo(s * 0.35, s * 0.35);
      ctx.moveTo(s * 0.35, -s * 0.35);
      ctx.lineTo(-s * 0.35, s * 0.35);
      ctx.stroke();
      break;
    }
    default: {
      // Generic: condition initial letter
      ctx.font = `bold ${s * 0.7}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(conditionId.charAt(0).toUpperCase(), 0, 0);
      break;
    }
  }
}

/** Draw a 4-point star at (x, y) with given radius */
function drawStar(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  const points = 4;
  const inner = r * 0.4;
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const angle = (i * Math.PI) / points - Math.PI / 2;
    const radius = i % 2 === 0 ? r : inner;
    const px = x + Math.cos(angle) * radius;
    const py = y + Math.sin(angle) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

/** Draw a skull icon centered at (0,0) with given size. Used for dead tokens (hp <= 0). */
function drawSkullIcon(ctx: CanvasRenderingContext2D, size: number): void {
  const s = size;
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = s * 0.06;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // Skull dome (top half circle)
  ctx.beginPath();
  ctx.arc(0, -s * 0.1, s * 0.45, Math.PI, 0);
  // Jaw (narrower arc below)
  ctx.quadraticCurveTo(s * 0.45, s * 0.25, s * 0.2, s * 0.4);
  ctx.lineTo(-s * 0.2, s * 0.4);
  ctx.quadraticCurveTo(-s * 0.45, s * 0.25, -s * 0.45, -s * 0.1);
  ctx.closePath();
  ctx.fill();

  // Eye sockets (dark)
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.ellipse(-s * 0.15, -s * 0.1, s * 0.12, s * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(s * 0.15, -s * 0.1, s * 0.12, s * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();

  // Nose (dark triangle)
  ctx.beginPath();
  ctx.moveTo(0, s * 0.05);
  ctx.lineTo(-s * 0.06, s * 0.18);
  ctx.lineTo(s * 0.06, s * 0.18);
  ctx.closePath();
  ctx.fill();

  // Teeth (dark lines on jaw area)
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = s * 0.03;
  for (let i = -2; i <= 2; i++) {
    const tx = i * s * 0.08;
    ctx.beginPath();
    ctx.moveTo(tx, s * 0.25);
    ctx.lineTo(tx, s * 0.38);
    ctx.stroke();
  }
}

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

  // ── Combat overlay state (transient — not persisted) ──
  const activeSourceRef = useRef<{ sourceType: string; sourceId: string | null } | null>(null);
  const floatingTextsRef = useRef<FloatingText[]>([]);
  const conditionOverlaysRef = useRef<Map<string, ConditionIndicator[]>>(new Map());
  const deadTokensRef = useRef<Set<string>>(new Set());

  // ── Event bus subscriptions ──

  useSubscribe('combat:turn-changed', ({ sourceType, sourceId }) => {
    activeSourceRef.current = { sourceType, sourceId };
    renderer.setAnimating(true);
    renderer.markDirty();
  });

  useSubscribe('combat:reset', () => {
    activeSourceRef.current = null;
    conditionOverlaysRef.current.clear();
    deadTokensRef.current.clear();
    floatingTextsRef.current = [];
    renderer.setAnimating(false);
    renderer.markDirty();
  });

  useSubscribe('combat:hp-changed', ({ sourceType, sourceId, delta, currentHp }) => {
    // Track dead state
    const key = `${sourceType}:${sourceId}`;
    if (currentHp <= 0) {
      deadTokensRef.current.add(key);
    } else {
      deadTokensRef.current.delete(key);
    }

    const token = tokensRef.current.find(
      (t) => t.sourceType === sourceType && t.sourceId === sourceId,
    );
    if (!token) return;

    const texts = floatingTextsRef.current;
    if (texts.length >= MAX_FLOATING_TEXTS) texts.shift();
    texts.push({
      x: token.x + (Math.random() - 0.5) * 20,
      y: token.y,
      text: delta > 0 ? `+${delta}` : `${delta}`,
      color: delta > 0 ? '#4ade80' : '#ef4444',
      startTime: performance.now(),
    });
    renderer.setAnimating(true);
    renderer.markDirty();
  });

  useSubscribe('combat:conditions-changed', ({ sourceType, sourceId, conditions }) => {
    const key = `${sourceType}:${sourceId}`;
    if (conditions.length === 0) {
      conditionOverlaysRef.current.delete(key);
    } else {
      conditionOverlaysRef.current.set(key, conditions.map((c) => ({
        color: CONDITION_COLORS[c.conditionId] ?? '#94a3b8',
        conditionId: c.conditionId,
      })));
    }
    renderer.markDirty();
  });

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
      const [sx, sy] = canvasLocalCoords(e, canvas);
      const [mx, my] = screenToWorld(sx, sy, renderer.viewportRef.current);
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
      const [sx, sy] = canvasLocalCoords(e, canvas);
      const [mx, my] = screenToWorld(sx, sy, renderer.viewportRef.current);
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
    const now = performance.now();
    const zoom = rc.viewport.zoom;
    const activeSource = activeSourceRef.current;

    for (const token of toks) {
      const tx = dragOverride?.id === token.id ? dragOverride.x : token.x;
      const ty = dragOverride?.id === token.id ? dragOverride.y : token.y;
      const radius = TOKEN_RADIUS * token.scale;

      // ── Active turn glow (BEFORE token) ──
      if (activeSource && token.sourceType === activeSource.sourceType && token.sourceId === activeSource.sourceId) {
        const t = (Math.sin((now / GLOW_PERIOD) * Math.PI * 2) + 1) / 2;
        const alpha = 0.3 + t * 0.6;
        const blur = 8 + t * 12;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.shadowColor = '#facc15';
        ctx.shadowBlur = blur / zoom;
        ctx.strokeStyle = '#facc15';
        ctx.lineWidth = 3 / zoom;
        ctx.beginPath();
        ctx.arc(tx, ty, radius + 4 / zoom, 0, Math.PI * 2);
        ctx.stroke();
        ctx.stroke(); // double-stroke for richer glow
        ctx.restore();
      }

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

      // ── Death overlay (skull on full circle) ──
      const tokenKey = `${token.sourceType}:${token.sourceId}`;
      const isDead = deadTokensRef.current.has(tokenKey);

      if (isDead) {
        // Dark overlay
        ctx.save();
        ctx.beginPath();
        ctx.arc(tx, ty, radius, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
        ctx.fill();
        ctx.restore();

        // Skull icon centered, large
        ctx.save();
        ctx.translate(tx, ty);
        ctx.globalAlpha = 0.95;
        drawSkullIcon(ctx, radius * 0.7);
        ctx.restore();
      } else {
        // ── Condition overlay (sectored full-circle with icons, scaled by count) ──
        const conditions = conditionOverlaysRef.current.get(tokenKey);
        if (conditions && conditions.length > 0) {
          const count = Math.min(conditions.length, 6);
          const sectorAngle = (Math.PI * 2) / count;
          // Icon size scales: 1 condition = 0.65*radius, 6 conditions = 0.3*radius
          const iconScale = Math.max(0.3, 0.65 - (count - 1) * 0.07);
          const iconSize = radius * iconScale;
          // Icon distance from center: closer to edge when more sectors
          const iconDist = count === 1 ? 0 : radius * Math.min(0.55, 0.35 + count * 0.04);

          for (let i = 0; i < count; i++) {
            const startAngle = -Math.PI / 2 + i * sectorAngle;
            const endAngle = startAngle + sectorAngle;

            // Draw colored sector overlay
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(tx, ty);
            ctx.arc(tx, ty, radius, startAngle, endAngle);
            ctx.closePath();
            ctx.fillStyle = conditions[i].color;
            ctx.globalAlpha = 0.45;
            ctx.fill();
            ctx.restore();

            // Draw icon in sector center
            const midAngle = startAngle + sectorAngle / 2;
            const ix = count === 1 ? tx : tx + Math.cos(midAngle) * iconDist;
            const iy = count === 1 ? ty : ty + Math.sin(midAngle) * iconDist;

            ctx.save();
            ctx.translate(ix, iy);
            ctx.globalAlpha = 0.95;
            drawConditionIcon(ctx, conditions[i].conditionId, iconSize, zoom);
            ctx.restore();
          }

          // Sector divider lines
          if (count > 1) {
            ctx.save();
            ctx.strokeStyle = 'rgba(0,0,0,0.5)';
            ctx.lineWidth = 1.5 / zoom;
            for (let i = 0; i < count; i++) {
              const angle = -Math.PI / 2 + i * sectorAngle;
              ctx.beginPath();
              ctx.moveTo(tx, ty);
              ctx.lineTo(tx + Math.cos(angle) * radius, ty + Math.sin(angle) * radius);
              ctx.stroke();
            }
            ctx.restore();
          }
        }
      }

      // Name label below token
      ctx.fillStyle = '#E8E6E3';
      const labelSize = 12 / rc.viewport.zoom;
      ctx.font = `${labelSize}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(token.name, tx, ty + radius + 4 / rc.viewport.zoom);
    }

    // ── Floating texts (always on top of tokens) ──
    const texts = floatingTextsRef.current;
    for (let i = texts.length - 1; i >= 0; i--) {
      const ft = texts[i];
      const t = Math.min((now - ft.startTime) / FLOAT_DURATION, 1);
      if (t >= 1) { texts.splice(i, 1); continue; }

      const yOffset = -easeOutCubic(t) * FLOAT_DISTANCE;
      const alpha = t < 0.6 ? 1 : 1 - (t - 0.6) / 0.4;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.font = `bold ${16 / zoom}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.strokeStyle = 'rgba(0,0,0,0.7)';
      ctx.lineWidth = 3 / zoom;
      ctx.strokeText(ft.text, ft.x, ft.y + yOffset);
      ctx.fillStyle = ft.color;
      ctx.fillText(ft.text, ft.x, ft.y + yOffset);
      ctx.restore();
    }

    // Stop animating if no active overlays need animation
    if (texts.length === 0 && !activeSourceRef.current) {
      renderer.setAnimating(false);
    }
  }, [renderer]);

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
