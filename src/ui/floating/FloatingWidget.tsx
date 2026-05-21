/*
 * FloatingWidget — draggable viewport-fixed wrapper for floating utilities.
 * Similar to CanvasWindow but simpler: no resize, no pinning, no z-order groups.
 */

import { memo, useCallback } from 'react';
import { useFloatingDrag } from './hooks/useFloatingDrag';
import { FLOATING_WIDGET_INFO } from './types';
import type { FloatingWidgetState } from './types';
import styles from './FloatingWidget.module.css';

interface FloatingWidgetProps {
  widget: FloatingWidgetState;
  onMove: (id: string, x: number, y: number) => void;
  onMinimize: (id: string) => void;
  onClose: (id: string) => void;
  children: React.ReactNode;
}

export const FloatingWidget = memo(function FloatingWidget({
  widget,
  onMove,
  onMinimize,
  onClose,
  children,
}: FloatingWidgetProps) {
  const info = FLOATING_WIDGET_INFO[widget.type];

  const handleMove = useCallback(
    (x: number, y: number) => onMove(widget.id, x, y),
    [widget.id, onMove],
  );

  const { handlePointerDown, handlePointerMove, handlePointerUp } = useFloatingDrag(
    widget.x,
    widget.y,
    { onMove: handleMove },
  );

  if (widget.minimized) {
    return (
      <button
        className={styles.minimizedIcon}
        style={{ position: 'fixed', left: widget.x, top: widget.y }}
        onClick={() => onMinimize(widget.id)}
        title={info.name}
      >
        {info.icon}
      </button>
    );
  }

  return (
    <div
      className={styles.floatingWidget}
      style={{ position: 'fixed', left: widget.x, top: widget.y }}
    >
      <div
        className={styles.titleBar}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        <span className={styles.titleIcon}>{info.icon}</span>
        <span className={styles.titleText}>{info.name}</span>
        <div className={styles.titleActions}>
          <button className={styles.actionBtn} onClick={() => onMinimize(widget.id)} title="Minimize">
            −
          </button>
          <button className={styles.actionBtn} onClick={() => onClose(widget.id)} title="Close">
            ×
          </button>
        </div>
      </div>
      <div className={styles.body}>
        {children}
      </div>
    </div>
  );
});
