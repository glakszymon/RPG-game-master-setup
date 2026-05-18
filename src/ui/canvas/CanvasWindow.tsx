/*
 * CanvasWindow — wraps ToolWindow with drag, resize, z-order, and pin.
 *
 * Custom pointer-event drag on title bar with scale compensation.
 * Custom pointer events for 8-directional resize.
 */

import { useRef, useCallback, useState } from 'react';
import { ToolWindow } from '../components/ToolWindow';
import { useWindowResize, type ResizeEdge } from './hooks/useWindowResize';
import { TOOL_MIN_SIZES, TOOL_INFO } from './types';
import type { WindowState, ToolType } from './types';
import styles from './CanvasWindow.module.css';

interface CanvasWindowProps {
  window: WindowState;
  scale: number;
  zIndex: number;
  isActive: boolean;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, x: number, y: number, w: number, h: number) => void;
  onFocus: (id: string) => void;
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  onTogglePin: (id: string) => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  children: React.ReactNode;
}

const RESIZE_EDGES: ResizeEdge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

/** Tools that need full-bleed body (no padding, no scroll) */
const FULL_BLEED_TOOLS: ReadonlySet<ToolType> = new Set(['map-display']);

function CanvasWindow({
  window: win,
  scale,
  zIndex,
  isActive,
  onMove,
  onResize,
  onFocus,
  onClose,
  onMinimize,
  onTogglePin,
  onDragStart,
  onDragEnd,
  children,
}: CanvasWindowProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);

  const toolInfo = TOOL_INFO[win.toolType];
  const minSize = TOOL_MIN_SIZES[win.toolType];

  // Guard against unknown tool types (e.g. from stale persisted state)
  if (!toolInfo) {
    console.warn(`[CanvasWindow] Unknown toolType: "${win.toolType}", skipping render`);
    return null;
  }

  // ── Drag (custom pointer events) ──

  const dragState = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  const handleDragPointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Only primary button
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);

      dragState.current = {
        startX: e.clientX,
        startY: e.clientY,
        originX: win.x,
        originY: win.y,
      };
      onDragStart?.();
    },
    [win.x, win.y, onDragStart],
  );

  const handleDragPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.current) return;
      const dx = (e.clientX - dragState.current.startX) / scale;
      const dy = (e.clientY - dragState.current.startY) / scale;
      const newX = dragState.current.originX + dx;
      const newY = dragState.current.originY + dy;
      onMove(win.id, newX, newY);
    },
    [win.id, scale, onMove],
  );

  const handleDragPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!dragState.current) return;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      dragState.current = null;
      onDragEnd?.();
    },
    [onDragEnd],
  );

  // ── Resize ──

  const getRect = useCallback(
    () => ({ x: win.x, y: win.y, width: win.width, height: win.height }),
    [win.x, win.y, win.width, win.height],
  );

  const { handlePointerDown: handleResizePointerDown } = useWindowResize(
    getRect,
    scale,
    minSize,
    {
      onResize: (x, y, w, h) => onResize(win.id, x, y, w, h),
    },
  );

  // ── Focus ──

  const handleMouseDown = useCallback(() => {
    onFocus(win.id);
  }, [win.id, onFocus]);

  // ── Close with animation ──

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      onClose(win.id);
    }, 200);
  }, [win.id, onClose]);

  // ── Minimize ──

  const handleMinimize = useCallback(() => {
    onMinimize(win.id);
  }, [win.id, onMinimize]);

  if (win.minimized) return null;

  return (
    <div
      ref={nodeRef}
      className={`canvas-window ${styles.canvasWindow} ${closing ? styles.closing : ''}`}
      onContextMenu={(e) => { e.preventDefault(); e.stopPropagation(); }}
      style={{
        width: win.width,
        height: win.height,
        zIndex,
        position: 'absolute',
        transform: `translate(${win.x}px, ${win.y}px)`,
      }}
      onMouseDown={handleMouseDown}
    >
      {/* Resize handles */}
      {RESIZE_EDGES.map((edge) => (
        <div
          key={edge}
          className={`${styles.resizeHandle} ${styles[`resize_${edge}`]}`}
          onPointerDown={handleResizePointerDown(edge)}
        />
      ))}

      {/* Pin indicator */}
      {win.pinned && <div className={styles.pinIndicator}>📌</div>}

        <ToolWindow
        title={toolInfo.name}
        icon={toolInfo.icon}
        active={isActive}
        noPadding={FULL_BLEED_TOOLS.has(win.toolType)}
        onClose={handleClose}
        onMinimize={handleMinimize}
        onTogglePin={() => onTogglePin(win.id)}
        pinned={win.pinned}
        dragHandleClass={styles.dragHandle}
        dragHandleProps={{
          onPointerDown: handleDragPointerDown,
          onPointerMove: handleDragPointerMove,
          onPointerUp: handleDragPointerUp,
        }}
      >
        <div className={styles.windowContent} onPointerDown={(e) => e.stopPropagation()}>
          {children}
        </div>
      </ToolWindow>
    </div>
  );
}

export { CanvasWindow };
