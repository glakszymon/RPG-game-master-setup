import { useEffect, useRef } from 'react';
import type { PlayerMapState, HpAnimationEvent } from './types';

interface MapRendererProps {
  map: PlayerMapState;
  activeSource: { sourceType: string; sourceId: string | null } | null;
  hpEvents?: HpAnimationEvent[];
}

const TOKEN_RADIUS = 20;
const GLOW_PERIOD = 1500;
const FLOAT_DURATION = 1200;
const FLOAT_DISTANCE = 48;
const MAX_FLOATING_TEXTS = 50;

interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  startTime: number;
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

const VFX_COLORS: Record<string, string> = {
  fire: 'rgba(255, 69, 0, 0.6)',
  explosion: 'rgba(255, 102, 0, 0.6)',
  smoke: 'rgba(136, 136, 136, 0.6)',
  lightning: 'rgba(102, 170, 255, 0.6)',
  glow: 'rgba(255, 224, 102, 0.6)',
  fog: 'rgba(170, 187, 204, 0.6)',
  ice: 'rgba(136, 204, 255, 0.6)',
};

export function MapRenderer({ map, activeSource, hpEvents }: MapRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapImageRef = useRef<HTMLImageElement | null>(null);
  const fowImageRef = useRef<HTMLImageElement | null>(null);
  const tokenImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const mapRef = useRef(map);
  const activeSourceRef = useRef(activeSource);
  const rafRef = useRef<number>(0);
  const lastImageUrl = useRef<string | null>(null);
  const lastFowUrl = useRef<string | null>(null);
  const floatingTextsRef = useRef<FloatingText[]>([]);

  // Always keep latest state in refs
  mapRef.current = map;
  activeSourceRef.current = activeSource;

  // Load map image when URL changes
  useEffect(() => {
    if (map.imageUrl === lastImageUrl.current) return;
    lastImageUrl.current = map.imageUrl;

    if (!map.imageUrl) {
      mapImageRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = map.imageUrl;
    img.onload = () => { mapImageRef.current = img; };
    img.onerror = () => { mapImageRef.current = null; };
  }, [map.imageUrl]);

  // Load FoW image when URL changes
  useEffect(() => {
    if (map.fowUrl === lastFowUrl.current) return;
    lastFowUrl.current = map.fowUrl;

    if (!map.fowUrl) {
      fowImageRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = map.fowUrl;
    img.onload = () => { fowImageRef.current = img; };
    img.onerror = () => { fowImageRef.current = null; };
  }, [map.fowUrl]);

  // Load token avatars
  useEffect(() => {
    const currentMap = tokenImagesRef.current;
    const neededIds = new Set(map.tokens.map(t => t.id));

    for (const id of currentMap.keys()) {
      if (!neededIds.has(id)) currentMap.delete(id);
    }

    for (const token of map.tokens) {
      if (!token.avatarUrl) continue;
      if (currentMap.has(token.id)) continue;
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = token.avatarUrl;
      img.onload = () => { currentMap.set(token.id, img); };
    }
  }, [map.tokens]);

  // Process incoming HP events into floating texts
  useEffect(() => {
    if (!hpEvents || hpEvents.length === 0) return;
    const currentMap = mapRef.current;

    for (const ev of hpEvents) {
      const token = currentMap.tokens.find(
        t => t.sourceType === ev.sourceType && t.sourceId === ev.sourceId,
      );
      if (!token) continue;

      const texts = floatingTextsRef.current;
      if (texts.length >= MAX_FLOATING_TEXTS) texts.shift();
      texts.push({
        x: token.x + (Math.random() - 0.5) * 20,
        y: token.y,
        text: ev.delta > 0 ? `+${ev.delta}` : `${ev.delta}`,
        color: ev.delta > 0 ? '#4ade80' : '#ef4444',
        startTime: performance.now(),
      });
    }
  }, [hpEvents]);

  // Single rAF render loop
  useEffect(() => {
    const render = () => {
      const canvas = canvasRef.current;
      if (!canvas) { rafRef.current = requestAnimationFrame(render); return; }

      const ctx = canvas.getContext('2d');
      if (!ctx) { rafRef.current = requestAnimationFrame(render); return; }

      // Fill entire viewport
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;

      if (canvas.width !== Math.round(screenW * dpr) || canvas.height !== Math.round(screenH * dpr)) {
        canvas.width = Math.round(screenW * dpr);
        canvas.height = Math.round(screenH * dpr);
      }

      const currentMap = mapRef.current;
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Fit map image to fill entire screen (no zoom/pan from DM)
      ctx.save();
      ctx.scale(dpr, dpr);

      if (mapImageRef.current) {
        const img = mapImageRef.current;
        const imgW = img.naturalWidth;
        const imgH = img.naturalHeight;

        // Scale to fit entire map on screen (contain, not cover)
        const scaleX = screenW / imgW;
        const scaleY = screenH / imgH;
        const scale = Math.min(scaleX, scaleY);

        const drawW = imgW * scale;
        const drawH = imgH * scale;
        const offsetX = (screenW - drawW) / 2;
        const offsetY = (screenH - drawH) / 2;

        ctx.drawImage(img, offsetX, offsetY, drawW, drawH);

        // Draw grid
        if (currentMap.grid.opacity > 0 && currentMap.grid.cellSize > 0) {
          ctx.save();
          ctx.translate(offsetX, offsetY);
          ctx.scale(scale, scale);
          drawGrid(ctx, currentMap.grid, img);
          ctx.restore();
        }

        // Draw tokens (positions are in map-image coordinates)
        for (const token of currentMap.tokens) {
          const tx = offsetX + token.x * scale;
          const ty = offsetY + token.y * scale;
          const radius = TOKEN_RADIUS * token.scale * scale;
          const tokenImg = tokenImagesRef.current.get(token.id);

          // Active turn glow (pulsing gold ring)
          const currentActiveSource = activeSourceRef.current;
          if (currentActiveSource && token.sourceType === currentActiveSource.sourceType && token.sourceId === currentActiveSource.sourceId) {
            const now = Date.now();
            const t = (Math.sin((now / GLOW_PERIOD) * Math.PI * 2) + 1) / 2;
            const alpha = 0.3 + t * 0.6;
            const blur = 8 + t * 12;

            ctx.save();
            ctx.globalAlpha = alpha;
            ctx.shadowColor = '#facc15';
            ctx.shadowBlur = blur;
            ctx.strokeStyle = '#facc15';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.arc(tx, ty, radius + 4, 0, Math.PI * 2);
            ctx.stroke();
            ctx.stroke();
            ctx.restore();
          }

          // Draw token circle
          if (tokenImg) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(tx, ty, radius, 0, Math.PI * 2);
            ctx.clip();
            ctx.drawImage(tokenImg, tx - radius, ty - radius, radius * 2, radius * 2);
            ctx.restore();
          } else {
            ctx.beginPath();
            ctx.arc(tx, ty, radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(130, 100, 255, 0.6)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(255,255,255,0.5)';
            ctx.lineWidth = 2;
            ctx.stroke();
          }

          // Dead overlay (skull)
          if (token.isDead) {
            ctx.save();
            ctx.beginPath();
            ctx.arc(tx, ty, radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
            ctx.fill();
            ctx.restore();

            ctx.save();
            ctx.translate(tx, ty);
            ctx.globalAlpha = 0.95;
            drawSkullIcon(ctx, radius * 0.7);
            ctx.restore();
          } else if (token.conditions.length > 0) {
            // Condition overlay (sectored full-circle with icons — 1:1 with DM map)
            const count = Math.min(token.conditions.length, 6);
            const sectorAngle = (Math.PI * 2) / count;
            const iconScale = Math.max(0.3, 0.65 - (count - 1) * 0.07);
            const iconSize = radius * iconScale;
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
              ctx.fillStyle = token.conditions[i].color;
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
              drawConditionIcon(ctx, token.conditions[i].conditionId, iconSize);
              ctx.restore();
            }

            // Sector divider lines
            if (count > 1) {
              ctx.save();
              ctx.strokeStyle = 'rgba(0,0,0,0.5)';
              ctx.lineWidth = 1.5;
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

          // Name label below token
          ctx.fillStyle = '#E8E6E3';
          ctx.font = `${Math.max(10, 12 * scale)}px system-ui`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillText(token.name, tx, ty + radius + 4);
        }

        // Draw VFX effects
        for (const vfx of currentMap.vfx) {
          const vx = offsetX + vfx.x * scale;
          const vy = offsetY + vfx.y * scale;
          const vSize = vfx.size * scale;

          const color = VFX_COLORS[vfx.preset] ?? 'rgba(255, 200, 50, 0.6)';

          // Animated glow pulse
          const pulse = 0.7 + 0.3 * Math.sin(Date.now() / 300 + vfx.x);

          // Outer glow
          const gradient = ctx.createRadialGradient(vx, vy, 0, vx, vy, vSize * pulse);
          gradient.addColorStop(0, color);
          gradient.addColorStop(0.6, color.replace('0.6', '0.3'));
          gradient.addColorStop(1, 'rgba(0,0,0,0)');

          ctx.beginPath();
          ctx.arc(vx, vy, vSize * pulse, 0, Math.PI * 2);
          ctx.fillStyle = gradient;
          ctx.fill();
        }

        // Draw FoW overlay
        if (fowImageRef.current) {
          ctx.globalCompositeOperation = 'multiply';
          const fow = fowImageRef.current;
          ctx.drawImage(fow, offsetX, offsetY, drawW, drawH);
          ctx.globalCompositeOperation = 'source-over';
        }

        // Draw floating HP texts
        const now = performance.now();
        const texts = floatingTextsRef.current;
        for (let i = texts.length - 1; i >= 0; i--) {
          const ft = texts[i];
          const elapsed = now - ft.startTime;
          if (elapsed >= FLOAT_DURATION) {
            texts.splice(i, 1);
            continue;
          }
          const progress = elapsed / FLOAT_DURATION;
          const eased = easeOutCubic(progress);
          const tx = offsetX + ft.x * scale;
          const ty = offsetY + (ft.y - eased * FLOAT_DISTANCE) * scale;
          const alpha = 1 - progress;

          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.font = `bold ${Math.max(14, 18 * scale)}px system-ui`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillStyle = ft.color;
          ctx.strokeStyle = 'rgba(0,0,0,0.7)';
          ctx.lineWidth = 3;
          ctx.strokeText(ft.text, tx, ty);
          ctx.fillText(ft.text, tx, ty);
          ctx.restore();
        }

        // Fantasy border around the map
        drawFantasyBorder(ctx, offsetX, offsetY, drawW, drawH);
      }

      ctx.restore();
      rafRef.current = requestAnimationFrame(render);
    };

    rafRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(rafRef.current);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'block',
      }}
    />
  );
}

// ── Grid helper ──

function drawGrid(
  ctx: CanvasRenderingContext2D,
  grid: { type: string; cellSize: number; opacity: number },
  mapImage: HTMLImageElement,
) {
  const w = mapImage.naturalWidth;
  const h = mapImage.naturalHeight;

  ctx.strokeStyle = `rgba(255, 255, 255, ${grid.opacity})`;
  ctx.lineWidth = 0.5;

  if (grid.type === 'square' || grid.type === 'grid') {
    for (let x = 0; x <= w; x += grid.cellSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y <= h; y += grid.cellSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }
}

// ── Fantasy border ──

function drawFantasyBorder(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  const borderWidth = 6;
  const cornerSize = 24;

  // Outer border - dark gold
  ctx.strokeStyle = 'rgba(140, 100, 30, 0.9)';
  ctx.lineWidth = borderWidth + 2;
  ctx.strokeRect(x - 1, y - 1, w + 2, h + 2);

  // Main border - bright gold
  ctx.strokeStyle = 'rgba(210, 170, 60, 0.85)';
  ctx.lineWidth = borderWidth;
  ctx.strokeRect(x, y, w, h);

  // Inner border - light gold highlight
  ctx.strokeStyle = 'rgba(240, 210, 100, 0.4)';
  ctx.lineWidth = 1.5;
  ctx.strokeRect(x + borderWidth, y + borderWidth, w - borderWidth * 2, h - borderWidth * 2);

  // Corner ornaments
  const corners = [
    [x, y],
    [x + w, y],
    [x, y + h],
    [x + w, y + h],
  ];

  ctx.fillStyle = 'rgba(220, 180, 60, 0.9)';
  ctx.strokeStyle = 'rgba(100, 70, 20, 0.9)';
  ctx.lineWidth = 2;

  for (const [cx, cy] of corners) {
    ctx.beginPath();
    ctx.arc(cx, cy, cornerSize / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Inner dot
    ctx.beginPath();
    ctx.arc(cx, cy, cornerSize / 5, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(100, 70, 20, 0.8)';
    ctx.fill();
    ctx.fillStyle = 'rgba(220, 180, 60, 0.9)';
  }
}

// ── Skull icon (dead tokens) ──

function drawSkullIcon(ctx: CanvasRenderingContext2D, size: number): void {
  const s = size;
  ctx.fillStyle = '#FFFFFF';
  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = s * 0.06;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.arc(0, -s * 0.1, s * 0.45, Math.PI, 0);
  ctx.quadraticCurveTo(s * 0.45, s * 0.25, s * 0.2, s * 0.4);
  ctx.lineTo(-s * 0.2, s * 0.4);
  ctx.quadraticCurveTo(-s * 0.45, s * 0.25, -s * 0.45, -s * 0.1);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.ellipse(-s * 0.15, -s * 0.1, s * 0.12, s * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(s * 0.15, -s * 0.1, s * 0.12, s * 0.14, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(0, s * 0.05);
  ctx.lineTo(-s * 0.06, s * 0.18);
  ctx.lineTo(s * 0.06, s * 0.18);
  ctx.closePath();
  ctx.fill();

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

// ── Condition icons ──

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

function drawConditionIcon(ctx: CanvasRenderingContext2D, conditionId: string, size: number): void {
  const s = size;
  const lw = s * 0.08;
  ctx.strokeStyle = '#FFFFFF';
  ctx.fillStyle = '#FFFFFF';
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (conditionId) {
    case 'blinded': {
      const ew = s * 0.8;
      const eh = s * 0.45;
      ctx.beginPath();
      ctx.ellipse(0, 0, ew / 2, eh / 2, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(-s * 0.55, -s * 0.55);
      ctx.lineTo(s * 0.55, s * 0.55);
      ctx.stroke();
      break;
    }
    case 'stunned': {
      drawStar(ctx, 0, -s * 0.2, s * 0.3);
      drawStar(ctx, -s * 0.3, s * 0.2, s * 0.2);
      drawStar(ctx, s * 0.3, s * 0.2, s * 0.2);
      break;
    }
    case 'poisoned': {
      ctx.beginPath();
      ctx.arc(0, -s * 0.1, s * 0.3, 0, Math.PI * 2);
      ctx.stroke();
      const ex = s * 0.12, ey = -s * 0.15, ed = s * 0.08;
      ctx.beginPath();
      ctx.moveTo(-ex - ed, ey - ed); ctx.lineTo(-ex + ed, ey + ed);
      ctx.moveTo(-ex + ed, ey - ed); ctx.lineTo(-ex - ed, ey + ed);
      ctx.moveTo(ex - ed, ey - ed); ctx.lineTo(ex + ed, ey + ed);
      ctx.moveTo(ex + ed, ey - ed); ctx.lineTo(ex - ed, ey + ed);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, s * 0.2);
      ctx.lineTo(-s * 0.08, s * 0.5);
      ctx.lineTo(s * 0.08, s * 0.5);
      ctx.closePath();
      ctx.fill();
      break;
    }
    case 'frightened': {
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.5);
      ctx.lineTo(-s * 0.45, s * 0.4);
      ctx.lineTo(s * 0.45, s * 0.4);
      ctx.closePath();
      ctx.stroke();
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
      ctx.beginPath();
      ctx.arc(-s * 0.3, 0, s * 0.15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.15, 0);
      ctx.lineTo(s * 0.5, 0);
      ctx.stroke();
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
      ctx.beginPath();
      ctx.moveTo(s * 0.1, -s * 0.5);
      ctx.lineTo(-s * 0.15, 0);
      ctx.lineTo(s * 0.1, 0);
      ctx.lineTo(-s * 0.1, s * 0.5);
      ctx.stroke();
      break;
    }
    case 'charmed': {
      ctx.beginPath();
      ctx.moveTo(0, s * 0.4);
      ctx.bezierCurveTo(-s * 0.5, s * 0.1, -s * 0.5, -s * 0.3, 0, -s * 0.15);
      ctx.bezierCurveTo(s * 0.5, -s * 0.3, s * 0.5, s * 0.1, 0, s * 0.4);
      ctx.fill();
      break;
    }
    case 'restrained': {
      ctx.beginPath();
      ctx.ellipse(-s * 0.15, 0, s * 0.2, s * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(s * 0.15, 0, s * 0.2, s * 0.3, 0, 0, Math.PI * 2);
      ctx.stroke();
      break;
    }
    case 'invisible': {
      ctx.setLineDash([s * 0.15, s * 0.1]);
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.font = `bold ${s * 0.5}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('?', 0, 0);
      break;
    }
    case 'incapacitated': {
      ctx.beginPath();
      ctx.moveTo(-s * 0.35, -s * 0.35);
      ctx.lineTo(s * 0.35, s * 0.35);
      ctx.moveTo(s * 0.35, -s * 0.35);
      ctx.lineTo(-s * 0.35, s * 0.35);
      ctx.stroke();
      break;
    }
    default: {
      ctx.font = `bold ${s * 0.7}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(conditionId.charAt(0).toUpperCase(), 0, 0);
      break;
    }
  }
}
