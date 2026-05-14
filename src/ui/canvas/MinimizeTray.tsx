/*
 * MinimizeTray — viewport-fixed tray for minimized windows.
 *
 * Anchored near the minimap in the bottom-right corner.
 * Shows pills for each minimized window. Click to restore.
 */

import { TOOL_INFO } from './types';
import type { WindowState } from './types';
import styles from './MinimizeTray.module.css';

interface MinimizeTrayProps {
  windows: WindowState[];
  onRestore: (id: string) => void;
}

function MinimizeTray({ windows, onRestore }: MinimizeTrayProps) {
  const minimized = windows.filter((w) => w.minimized);

  if (minimized.length === 0) return null;

  return (
    <div className={styles.tray}>
      {minimized.map((w) => {
        const info = TOOL_INFO[w.toolType];
        return (
          <button
            key={w.id}
            className={styles.pill}
            onClick={() => onRestore(w.id)}
            title={`Restore ${info.name}`}
          >
            <span className={styles.pillIcon}>{info.icon}</span>
            <span className={styles.pillLabel}>{info.name}</span>
          </button>
        );
      })}
    </div>
  );
}

export { MinimizeTray };
