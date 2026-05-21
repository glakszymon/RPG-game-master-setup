/*
 * useFloatingDrag — pointer-event drag for viewport-fixed floating widgets.
 * No scale compensation needed (widgets live in viewport coordinates).
 */

import { useRef, useCallback } from 'react';

interface DragCallbacks {
  onMove: (x: number, y: number) => void;
}

export function useFloatingDrag(x: number, y: number, callbacks: DragCallbacks) {
  const dragState = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      dragState.current = { startX: e.clientX, startY: e.clientY, originX: x, originY: y };
    },
    [x, y],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.current) return;
      const dx = e.clientX - dragState.current.startX;
      const dy = e.clientY - dragState.current.startY;
      callbacks.onMove(dragState.current.originX + dx, dragState.current.originY + dy);
    },
    [callbacks],
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.current) return;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      dragState.current = null;
    },
    [],
  );

  return { handlePointerDown, handlePointerMove, handlePointerUp };
}
