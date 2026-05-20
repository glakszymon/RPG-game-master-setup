import { useEffect, useRef } from 'react';
import type { PlayerMapState } from './types';

interface MapRendererProps {
  map: PlayerMapState;
}

const TOKEN_RADIUS = 20;

export function MapRenderer({ map }: MapRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mapImageRef = useRef<HTMLImageElement | null>(null);
  const fowImageRef = useRef<HTMLImageElement | null>(null);
  const tokenImagesRef = useRef<Map<string, HTMLImageElement>>(new Map());
  const mapRef = useRef(map);
  const rafRef = useRef<number>(0);
  const lastImageUrl = useRef<string | null>(null);
  const lastFowUrl = useRef<string | null>(null);

  // Always keep latest map state in ref
  mapRef.current = map;

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

          ctx.fillStyle = '#fff';
          ctx.font = `${Math.max(10, 12 * scale)}px system-ui`;
          ctx.textAlign = 'center';
          ctx.fillText(token.name, tx, ty + radius + 14 * scale);
        }

        // Draw FoW overlay
        if (fowImageRef.current) {
          ctx.globalCompositeOperation = 'multiply';
          const fow = fowImageRef.current;
          ctx.drawImage(fow, offsetX, offsetY, drawW, drawH);
          ctx.globalCompositeOperation = 'source-over';
        }
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
