import { useEffect, useRef, useCallback, useLayoutEffect, useMemo } from 'react';
import type { ViewportState } from '../types';

// ── Coordinate conversion ──

export function screenToWorld(sx: number, sy: number, vp: ViewportState): [number, number] {
  return [
    (sx - vp.x) / vp.zoom,
    (sy - vp.y) / vp.zoom,
  ];
}

export function worldToScreen(wx: number, wy: number, vp: ViewportState): [number, number] {
  return [
    wx * vp.zoom + vp.x,
    wy * vp.zoom + vp.y,
  ];
}

// ── Types ──

export interface RenderContext {
  ctx: CanvasRenderingContext2D;
  canvas: HTMLCanvasElement;
  viewport: ViewportState;
  dpr: number;
  cssWidth: number;
  cssHeight: number;
}

/** Called each frame when dirty or animating. Draw in world-space (transform already set). */
export type DrawCallback = (rc: RenderContext, time: number) => void;

export interface CanvasRendererHandle {
  /** Mark canvas as needing a repaint */
  markDirty: () => void;
  /** Enable continuous rAF loop (for VFX animations) */
  setAnimating: (v: boolean) => void;
  /** Current viewport (mutable ref — read freely, write via setViewport) */
  viewportRef: React.RefObject<ViewportState>;
  /** The canvas element */
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  /** The 2D context */
  ctxRef: React.RefObject<CanvasRenderingContext2D | null>;
  /** Current CSS dimensions */
  sizeRef: React.RefObject<{ w: number; h: number }>;
}

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 5;

/**
 * useCanvasRenderer — creates a <canvas>, handles HiDPI, resize, dirty-flag render loop,
 * zoom (scroll centered on cursor), and pan (middle-mouse drag).
 */
export function useCanvasRenderer(
  containerRef: React.RefObject<HTMLDivElement | null>,
  initialViewport: ViewportState,
  mapImage: HTMLImageElement | null,
  onDraw: DrawCallback,
  onViewportChange: (vp: ViewportState) => void,
): CanvasRendererHandle {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const viewportRef = useRef<ViewportState>(initialViewport);
  const sizeRef = useRef({ w: 0, h: 0 });
  const dprRef = useRef(window.devicePixelRatio || 1);

  // Dirty-flag render loop state
  const dirtyRef = useRef(true);
  const animatingRef = useRef(false);
  const rafIdRef = useRef(0);

  // Keep callbacks fresh without re-running effects
  const onDrawRef = useRef(onDraw);
  useLayoutEffect(() => { onDrawRef.current = onDraw; });
  const onViewportChangeRef = useRef(onViewportChange);
  useLayoutEffect(() => { onViewportChangeRef.current = onViewportChange; });
  const mapImageRef = useRef(mapImage);
  useLayoutEffect(() => { mapImageRef.current = mapImage; });

  const markDirty = useCallback(() => {
    dirtyRef.current = true;
    if (!rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(tick);
    }
  }, []);

  const setAnimating = useCallback((v: boolean) => {
    animatingRef.current = v;
    if (v && !rafIdRef.current) {
      rafIdRef.current = requestAnimationFrame(tick);
    }
  }, []);

  // The render tick — defined as a stable function via ref
  function tick(time: number) {
    rafIdRef.current = 0;
    const ctx = ctxRef.current;
    const canvas = canvasRef.current;
    if (!ctx || !canvas) return;

    if (dirtyRef.current || animatingRef.current) {
      dirtyRef.current = false;
      const dpr = dprRef.current;
      const vp = viewportRef.current;
      const { w: cssW, h: cssH } = sizeRef.current;

      // Reset transform & clear
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // World-space transform: DPR * zoom + pan
      ctx.setTransform(
        vp.zoom * dpr, 0,
        0, vp.zoom * dpr,
        vp.x * dpr,
        vp.y * dpr,
      );

      // Draw map image
      const img = mapImageRef.current;
      if (img && img.complete && img.naturalWidth > 0) {
        ctx.drawImage(img, 0, 0);
      }

      // Let layers draw (grid, fow, tokens, vfx)
      const rc: RenderContext = { ctx, canvas, viewport: vp, dpr, cssWidth: cssW, cssHeight: cssH };
      onDrawRef.current(rc, time);

      // Reset to screen-space (for any future screen-space drawing)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    // Continue loop if animating
    if (animatingRef.current) {
      rafIdRef.current = requestAnimationFrame(tick);
    }
  }

  // ── Create canvas + ResizeObserver ──
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const canvas = document.createElement('canvas');
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';
    container.prepend(canvas);
    canvasRef.current = canvas;

    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) {
      console.error('[useCanvasRenderer] Failed to get 2D context');
      return;
    }
    ctxRef.current = ctx;

    const resize = () => {
      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      dprRef.current = dpr;
      canvas.width = Math.floor(rect.width * dpr);
      canvas.height = Math.floor(rect.height * dpr);
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;
      sizeRef.current = { w: rect.width, h: rect.height };
      markDirty();
    };

    const ro = new ResizeObserver(resize);
    ro.observe(container);
    resize(); // initial

    return () => {
      ro.disconnect();
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = 0;
      canvas.remove();
      canvasRef.current = null;
      ctxRef.current = null;
    };
  }, [containerRef, markDirty]);

  // ── Set viewport once on mount (restored from persistence) ──
  const initialViewportApplied = useRef(false);
  useEffect(() => {
    if (!initialViewportApplied.current) {
      viewportRef.current = initialViewport;
      initialViewportApplied.current = true;
      markDirty();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markDirty]);

  // ── Repaint when map image changes ──
  useEffect(() => {
    markDirty();
  }, [mapImage, markDirty]);

  // ── Wheel zoom (centered on cursor) ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const sx = e.clientX - rect.left;
      const sy = e.clientY - rect.top;
      const vp = viewportRef.current;

      // World point under cursor before zoom
      const [wx, wy] = screenToWorld(sx, sy, vp);

      const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1;
      const newZoom = Math.min(Math.max(vp.zoom * factor, MIN_ZOOM), MAX_ZOOM);

      // Adjust pan so (wx,wy) stays under (sx,sy)
      viewportRef.current = {
        zoom: newZoom,
        x: sx - wx * newZoom,
        y: sy - wy * newZoom,
      };
      markDirty();
      onViewportChangeRef.current(viewportRef.current);
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [markDirty]);

  // ── Pan (middle mouse drag) ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let isPanning = false;
    let lastX = 0;
    let lastY = 0;

    const onDown = (e: PointerEvent) => {
      if (e.button !== 1) return;
      isPanning = true;
      lastX = e.clientX;
      lastY = e.clientY;
      canvas.setPointerCapture(e.pointerId);
      e.preventDefault();
    };

    const onMove = (e: PointerEvent) => {
      if (!isPanning) return;
      const vp = viewportRef.current;
      viewportRef.current = {
        ...vp,
        x: vp.x + (e.clientX - lastX),
        y: vp.y + (e.clientY - lastY),
      };
      lastX = e.clientX;
      lastY = e.clientY;
      markDirty();
    };

    const onUp = (e: PointerEvent) => {
      if (!isPanning) return;
      isPanning = false;
      canvas.releasePointerCapture(e.pointerId);
      onViewportChangeRef.current(viewportRef.current);
    };

    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    return () => {
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
    };
  }, [markDirty]);

  const handle = useMemo<CanvasRendererHandle>(() => ({
    markDirty, setAnimating, viewportRef, canvasRef, ctxRef, sizeRef,
  }), [markDirty, setAnimating]);

  return handle;
}
