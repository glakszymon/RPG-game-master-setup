import { useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import type { MapTool, BrushSettings } from '../types';
import type { CanvasRendererHandle, RenderContext } from './useCanvasRenderer';
import { screenToWorld, canvasLocalCoords } from './useCanvasRenderer';

/**
 * useFowRenderer — Fog of War via offscreen canvas with destination-out compositing.
 *
 * - Offscreen canvas sized to map image dimensions
 * - Black fill = fog visible; clearRect / destination-out = revealed
 * - Painted via brush strokes with getCoalescedEvents for smoothness
 * - Saved async via toBlob + FileReader (non-blocking)
 */

export interface FowActions {
  revealAll: () => void;
  concealAll: () => void;
  /** Draw FoW onto the main canvas (called from render loop, world-space) */
  drawFow: (rc: RenderContext) => void;
}

export function useFowRenderer(
  renderer: CanvasRendererHandle,
  mapWidth: number,
  mapHeight: number,
  activeTool: MapTool,
  brushSettings: BrushSettings,
  fowDataUrl: string | null,
  onFowChange: (dataUrl: string) => void,
): FowActions {
  const fogCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const fogCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const isPaintingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initializedRef = useRef(false);

  // Keep refs fresh
  const onFowChangeRef = useRef(onFowChange);
  useLayoutEffect(() => { onFowChangeRef.current = onFowChange; });
  const activeToolRef = useRef(activeTool);
  useLayoutEffect(() => { activeToolRef.current = activeTool; });
  const brushRef = useRef(brushSettings);
  useLayoutEffect(() => { brushRef.current = brushSettings; });

  // ── Create / resize offscreen fog canvas ──
  useEffect(() => {
    if (mapWidth === 0 || mapHeight === 0) return;

    const fogCanvas = document.createElement('canvas');
    fogCanvas.width = mapWidth;
    fogCanvas.height = mapHeight;
    const fogCtx = fogCanvas.getContext('2d', { willReadFrequently: false })!;
    fogCanvasRef.current = fogCanvas;
    fogCtxRef.current = fogCtx;
    initializedRef.current = false;

    // Fill with black (full fog) — fully opaque on offscreen, rendered with globalAlpha
    fogCtx.fillStyle = 'rgba(0, 0, 0, 1)';
    fogCtx.fillRect(0, 0, mapWidth, mapHeight);

    // Restore from saved data URL
    if (fowDataUrl) {
      const img = new Image();
      img.onload = () => {
        fogCtx.globalCompositeOperation = 'copy';
        fogCtx.drawImage(img, 0, 0);
        fogCtx.globalCompositeOperation = 'source-over';
        initializedRef.current = true;
        renderer.markDirty();
      };
      img.onerror = () => { initializedRef.current = true; };
      img.src = fowDataUrl;
    } else {
      initializedRef.current = true;
    }

    renderer.markDirty();

    return () => {
      fogCanvasRef.current = null;
      fogCtxRef.current = null;
    };
    // fowDataUrl intentionally excluded — only load on init/resize
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mapWidth, mapHeight, renderer]);

  // ── Debounced save via toBlob (async, non-blocking) ──
  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const fogCanvas = fogCanvasRef.current;
      if (!fogCanvas) return;
      fogCanvas.toBlob((blob) => {
        if (!blob) return;
        const reader = new FileReader();
        reader.onload = () => {
          onFowChangeRef.current(reader.result as string);
        };
        reader.readAsDataURL(blob);
      }, 'image/png');
    }, 500);
  }, []);

  // ── Paint brush stamp at world coords ──
  const paintAt = useCallback((wx: number, wy: number) => {
    const fogCtx = fogCtxRef.current;
    if (!fogCtx) return;

    const isReveal = activeToolRef.current === 'fow-reveal';
    const radius = brushRef.current.size / 2;

    if (isReveal) {
      fogCtx.globalCompositeOperation = 'destination-out';
      fogCtx.fillStyle = 'rgba(0, 0, 0, 1)';
    } else {
      fogCtx.globalCompositeOperation = 'source-over';
      fogCtx.fillStyle = 'rgba(0, 0, 0, 1)';
    }

    fogCtx.beginPath();
    fogCtx.arc(wx, wy, radius, 0, Math.PI * 2);
    fogCtx.fill();
    fogCtx.globalCompositeOperation = 'source-over';
  }, []);

  const paintLine = useCallback((x0: number, y0: number, x1: number, y1: number) => {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const spacing = Math.max(brushRef.current.size * 0.25, 1);
    const steps = Math.max(1, Math.floor(dist / spacing));
    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      paintAt(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t);
    }
  }, [paintAt]);

  // ── Pointer event handlers ──
  useEffect(() => {
    const canvas = renderer.canvasRef.current;
    if (!canvas) return;

    const isFowTool = activeTool === 'fow-reveal' || activeTool === 'fow-conceal';
    if (!isFowTool) return;

    const onDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const [sx, sy] = canvasLocalCoords(e, canvas);
      const [wx, wy] = screenToWorld(sx, sy, renderer.viewportRef.current);

      isPaintingRef.current = true;
      lastPosRef.current = { x: wx, y: wy };
      canvas.setPointerCapture(e.pointerId);
      paintAt(wx, wy);
      renderer.markDirty();
    };

    const onMove = (e: PointerEvent) => {
      if (!isPaintingRef.current) return;
      // Use coalesced events for smooth strokes
      const events = (e as any).getCoalescedEvents?.() ?? [e];
      for (const ce of events) {
        const [sx, sy] = canvasLocalCoords(ce, canvas);
        const [wx, wy] = screenToWorld(sx, sy, renderer.viewportRef.current);
        const last = lastPosRef.current;
        if (last) {
          paintLine(last.x, last.y, wx, wy);
        } else {
          paintAt(wx, wy);
        }
        lastPosRef.current = { x: wx, y: wy };
      }
      renderer.markDirty();
    };

    const onUp = (e: PointerEvent) => {
      if (!isPaintingRef.current) return;
      isPaintingRef.current = false;
      lastPosRef.current = null;
      canvas.releasePointerCapture(e.pointerId);
      scheduleSave();
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.style.cursor = 'crosshair';

    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.style.cursor = '';
    };
  }, [activeTool, renderer, paintAt, paintLine, scheduleSave]);

  // Cleanup save timer
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // ── Actions ──
  const revealAll = useCallback(() => {
    const fogCtx = fogCtxRef.current;
    const fogCanvas = fogCanvasRef.current;
    if (!fogCtx || !fogCanvas) return;
    fogCtx.clearRect(0, 0, fogCanvas.width, fogCanvas.height);
    renderer.markDirty();
    scheduleSave();
  }, [renderer, scheduleSave]);

  const concealAll = useCallback(() => {
    const fogCtx = fogCtxRef.current;
    const fogCanvas = fogCanvasRef.current;
    if (!fogCtx || !fogCanvas) return;
    fogCtx.globalCompositeOperation = 'source-over';
    fogCtx.fillStyle = 'rgba(0, 0, 0, 1)';
    fogCtx.fillRect(0, 0, fogCanvas.width, fogCanvas.height);
    renderer.markDirty();
    scheduleSave();
  }, [renderer, scheduleSave]);

  const drawFow = useCallback((rc: RenderContext) => {
    const fogCanvas = fogCanvasRef.current;
    if (!fogCanvas || !initializedRef.current) return;
    // Draw fog overlay at 70% opacity (semi-transparent)
    rc.ctx.save();
    rc.ctx.globalAlpha = 0.7;
    rc.ctx.drawImage(fogCanvas, 0, 0);
    rc.ctx.restore();
  }, []);

  return { revealAll, concealAll, drawFow };
}
