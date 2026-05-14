/*
 * useWindowResize — custom 8-directional resize via pointer events.
 *
 * No library handles scale compensation correctly inside a
 * CSS-transformed container, so this is custom (~60 lines of logic).
 */

import { useCallback, useRef } from 'react';
import type { TOOL_MIN_SIZES } from '../types';

type MinSizes = (typeof TOOL_MIN_SIZES)[keyof typeof TOOL_MIN_SIZES];

export type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

interface ResizeCallbacks {
  onResizeStart?: () => void;
  onResize: (x: number, y: number, width: number, height: number) => void;
  onResizeEnd?: () => void;
}

export function useWindowResize(
  getRect: () => { x: number; y: number; width: number; height: number },
  scale: number,
  minSize: MinSizes,
  callbacks: ResizeCallbacks,
) {
  const resizingRef = useRef(false);

  const handlePointerDown = useCallback(
    (edge: ResizeEdge) => (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      resizingRef.current = true;
      callbacks.onResizeStart?.();

      const startX = e.clientX;
      const startY = e.clientY;
      const startRect = getRect();

      const onMove = (ev: PointerEvent) => {
        if (!resizingRef.current) return;

        const dx = (ev.clientX - startX) / scale;
        const dy = (ev.clientY - startY) / scale;

        let { x, y, width, height } = startRect;

        // Apply delta based on edge
        if (edge.includes('e')) width = Math.max(minSize.minWidth, startRect.width + dx);
        if (edge.includes('w')) {
          const newW = Math.max(minSize.minWidth, startRect.width - dx);
          x = startRect.x + (startRect.width - newW);
          width = newW;
        }
        if (edge.includes('s')) height = Math.max(minSize.minHeight, startRect.height + dy);
        if (edge.includes('n')) {
          const newH = Math.max(minSize.minHeight, startRect.height - dy);
          y = startRect.y + (startRect.height - newH);
          height = newH;
        }

        callbacks.onResize(x, y, width, height);
      };

      const onUp = () => {
        resizingRef.current = false;
        callbacks.onResizeEnd?.();
        document.removeEventListener('pointermove', onMove);
        document.removeEventListener('pointerup', onUp);
      };

      document.addEventListener('pointermove', onMove);
      document.addEventListener('pointerup', onUp);
    },
    [getRect, scale, minSize, callbacks],
  );

  return { handlePointerDown };
}
