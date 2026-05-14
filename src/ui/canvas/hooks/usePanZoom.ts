/*
 * usePanZoom — lifecycle hook for @panzoom/panzoom.
 *
 * Initializes panzoom on the canvas element, wires up wheel zoom,
 * and exposes current transform via a ref (no React re-renders during pan/zoom).
 */

import { useEffect, useRef, useCallback } from 'react';
import Panzoom from '@panzoom/panzoom';
import type { PanzoomObject } from '@panzoom/panzoom';
import type { ViewportTransform } from '../types';

interface UsePanZoomOptions {
  minScale?: number;
  maxScale?: number;
}

export function usePanZoom(options: UsePanZoomOptions = {}) {
  const { minScale = 0.1, maxScale = 3 } = options;

  const canvasRef = useRef<HTMLDivElement>(null);
  const panzoomRef = useRef<PanzoomObject | null>(null);
  const transformRef = useRef<ViewportTransform>({ x: 0, y: 0, scale: 1 });
  const onTransformChangeRef = useRef<((t: ViewportTransform) => void) | null>(null);

  useEffect(() => {
    const el = canvasRef.current;
    if (!el) return;

    const parent = el.parentElement;
    if (!parent) return;

    const pz = Panzoom(el, {
      canvas: true,
      minScale,
      maxScale,
      // No containment — infinite canvas
      // @panzoom/panzoom omits 'none' from types but accepts it at runtime
      // Omitting 'contain' achieves the same: no containment by default
      excludeClass: 'canvas-window',
      startScale: 1,
      startX: 0,
      startY: 0,
      // Disable panzoom's default cursor styling
      cursor: '',
    });

    panzoomRef.current = pz;

    // Wire up wheel zoom
    const wheelHandler = (e: WheelEvent) => {
      pz.zoomWithWheel(e);
    };
    parent.addEventListener('wheel', wheelHandler, { passive: false });

    // Track transform changes (no React re-render)
    const changeHandler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      transformRef.current = {
        x: detail.x,
        y: detail.y,
        scale: detail.scale,
      };
      onTransformChangeRef.current?.(transformRef.current);
    };
    el.addEventListener('panzoomchange', changeHandler);

    return () => {
      parent.removeEventListener('wheel', wheelHandler);
      el.removeEventListener('panzoomchange', changeHandler);
      pz.destroy();
      panzoomRef.current = null;
    };
  }, [minScale, maxScale]);

  const getTransform = useCallback((): ViewportTransform => {
    return transformRef.current;
  }, []);

  const setTransformCallback = useCallback((cb: (t: ViewportTransform) => void) => {
    onTransformChangeRef.current = cb;
  }, []);

  /** Programmatically set zoom level */
  const zoomTo = useCallback((scale: number) => {
    panzoomRef.current?.zoom(scale, { animate: true });
  }, []);

  /** Zoom in by one step */
  const zoomIn = useCallback(() => {
    panzoomRef.current?.zoomIn();
  }, []);

  /** Zoom out by one step */
  const zoomOut = useCallback(() => {
    panzoomRef.current?.zoomOut();
  }, []);

  /** Reset to default view */
  const resetView = useCallback(() => {
    panzoomRef.current?.reset({ animate: true });
  }, []);

  /** Animate to a specific transform (for preset restore) */
  const panTo = useCallback((x: number, y: number, scale: number, animate = true) => {
    const pz = panzoomRef.current;
    if (!pz) return;
    pz.zoom(scale, { animate });
    pz.pan(x, y, { animate });
  }, []);

  return {
    canvasRef,
    getTransform,
    setTransformCallback,
    zoomTo,
    zoomIn,
    zoomOut,
    resetView,
    panTo,
    transformRef,
  };
}
