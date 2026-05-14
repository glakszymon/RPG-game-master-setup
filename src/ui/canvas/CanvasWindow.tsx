/*
 * CanvasWindow — wraps ToolWindow with drag, resize, z-order, and pin.
 *
 * Uses react-draggable for title-bar drag and custom pointer events
 * for 8-directional resize. Handles scale compensation for both.
 */

import { useRef, useCallback, useState } from 'react';
import Draggable from 'react-draggable';
import type { DraggableData, DraggableEvent } from 'react-draggable';
import { ToolWindow } from '../components/ToolWindow';
import { useWindowResize, type ResizeEdge } from './hooks/useWindowResize';
import { TOOL_MIN_SIZES, TOOL_INFO } from './types';
import type { WindowState } from './types';
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
  children: React.ReactNode;
}

const RESIZE_EDGES: ResizeEdge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

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
  children,
}: CanvasWindowProps) {
  const nodeRef = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);

  const toolInfo = TOOL_INFO[win.toolType];
  const minSize = TOOL_MIN_SIZES[win.toolType];

  // ── Drag ──

  const handleDragStop = useCallback(
    (_e: DraggableEvent, data: DraggableData) => {
      onMove(win.id, data.x, data.y);
    },
    [win.id, onMove],
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
    // Wait for CSS animation to finish
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
    <Draggable
      nodeRef={nodeRef as React.RefObject<HTMLElement>}
      handle={`.${styles.dragHandle}`}
      cancel={`.${styles.windowContent}`}
      position={{ x: win.x, y: win.y }}
      onStop={handleDragStop}
      scale={scale}
    >
      <div
        ref={nodeRef}
        className={`canvas-window ${styles.canvasWindow} ${closing ? styles.closing : ''}`}
        style={{
          width: win.width,
          height: win.height,
          zIndex,
          position: 'absolute',
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
          onClose={handleClose}
          onMinimize={handleMinimize}
          onTogglePin={() => onTogglePin(win.id)}
          pinned={win.pinned}
          dragHandleClass={styles.dragHandle}
        >
          <div className={styles.windowContent}>
            {children}
          </div>
        </ToolWindow>
      </div>
    </Draggable>
  );
}

export { CanvasWindow };
