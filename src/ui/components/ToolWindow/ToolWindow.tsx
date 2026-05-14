import { type ReactNode, useState } from 'react';
import styles from './ToolWindow.module.css';

export interface ToolWindowProps {
  /** Tytuł wyświetlany w title barze */
  title: string;

  /** Opcjonalna ikona obok tytułu (ReactNode — SVG, emoji, itp.) */
  icon?: ReactNode;

  /** Treść okna */
  children: ReactNode;

  /** Czy okno jest aktywne (złoty glow) */
  active?: boolean;

  /** Callback zamknięcia */
  onClose?: () => void;

  /** Dodatkowe className */
  className?: string;
}

/**
 * ToolWindow — okno narzędziowe na canvasie.
 *
 * Glassmorphism panel z title barem, przyciskami minimize/close,
 * i opcjonalnym accent glow gdy aktywne.
 *
 * Drag/resize logika będzie w Canvas module — ToolWindow odpowiada
 * wyłącznie za wygląd i strukturę HTML.
 *
 * Użycie:
 *   <ToolWindow title="Party Tracker" icon={<SwordIcon />} active>
 *     <PartyTrackerContent />
 *   </ToolWindow>
 */
function ToolWindow({
  title,
  icon,
  children,
  active = false,
  onClose,
  className,
}: ToolWindowProps) {
  const [minimized, setMinimized] = useState(false);

  const rootClasses = [
    styles.window,
    active ? styles.active : '',
    minimized ? styles.minimized : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={rootClasses}>
      {/* Title bar — będzie drag handle przy canvas implementacji */}
      <div className={styles.titleBar}>
        {icon && <span className={styles.titleIcon}>{icon}</span>}
        <span className={styles.title}>{title}</span>
        <div className={styles.controls}>
          {/* Minimize */}
          <button
            className={styles.controlButton}
            onClick={() => setMinimized(!minimized)}
            aria-label={minimized ? 'Rozwiń' : 'Minimalizuj'}
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
          {/* Close */}
          {onClose && (
            <button
              className={`${styles.controlButton} ${styles.controlButtonClose}`}
              onClick={onClose}
              aria-label="Zamknij"
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

      {/* Body — ukrywane przy minimize */}
      <div className={styles.body}>{children}</div>
    </div>
  );
}

export { ToolWindow };
