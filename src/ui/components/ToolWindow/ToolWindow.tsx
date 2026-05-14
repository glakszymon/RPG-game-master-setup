import React, { type ReactNode } from 'react';
import styles from './ToolWindow.module.css';

export interface ToolWindowProps {
  /** Title displayed in the title bar */
  title: string;

  /** Optional icon next to title (ReactNode — SVG, emoji, etc.) */
  icon?: ReactNode;

  /** Window content */
  children: ReactNode;

  /** Whether window is active (gold glow) */
  active?: boolean;

  /** Whether window is pinned (always on top) */
  pinned?: boolean;

  /** Close callback */
  onClose?: () => void;

  /** Minimize callback — when provided, canvas manages minimize state externally */
  onMinimize?: () => void;

  /** Pin toggle callback */
  onTogglePin?: () => void;

  /** CSS class name applied to the title bar for drag handle targeting */
  dragHandleClass?: string;

  /** Pointer event handlers spread onto the title bar for custom drag */
  dragHandleProps?: React.HTMLAttributes<HTMLDivElement>;

  /** Additional className */
  className?: string;
}

/**
 * ToolWindow — tool window on the canvas.
 *
 * Glassmorphism panel with title bar, minimize/close buttons,
 * and optional accent glow when active.
 *
 * Drag/resize logic lives in the Canvas module — ToolWindow is
 * responsible only for appearance and HTML structure.
 */
function ToolWindow({
  title,
  icon,
  children,
  active = false,
  pinned = false,
  onClose,
  onMinimize,
  onTogglePin,
  dragHandleClass,
  dragHandleProps,
  className,
}: ToolWindowProps) {
  const rootClasses = [
    styles.window,
    active ? styles.active : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  const titleBarClasses = [
    styles.titleBar,
    dragHandleClass ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClasses}>
      {/* Title bar — drag handle when used on canvas */}
      <div className={titleBarClasses} {...dragHandleProps}>
        {icon && <span className={styles.titleIcon}>{icon}</span>}
        <span className={styles.title}>{title}</span>
        <div className={styles.controls}>
          {/* Pin toggle */}
          {onTogglePin && (
            <button
              className={`${styles.controlButton} ${pinned ? styles.controlButtonActive : ''}`}
              onClick={(e) => { e.stopPropagation(); onTogglePin(); }}
              aria-label={pinned ? 'Unpin' : 'Pin'}
              title={pinned ? 'Unpin window' : 'Pin window (always on top)'}
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7 1L11 5M4 3L9 8M3 7L1 11L5 9M6 2L10 6" />
              </svg>
            </button>
          )}
          {/* Minimize */}
          {onMinimize && (
            <button
              className={styles.controlButton}
              onClick={(e) => { e.stopPropagation(); onMinimize(); }}
              aria-label="Minimize"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M2 6h8" />
              </svg>
            </button>
          )}
          {/* Close */}
          {onClose && (
            <button
              className={`${styles.controlButton} ${styles.controlButtonClose}`}
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              aria-label="Close"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              >
                <path d="M2 2l8 8M10 2l-8 8" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className={styles.body}>{children}</div>
    </div>
  );
}

export { ToolWindow };
