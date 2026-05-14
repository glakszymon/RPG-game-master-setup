/*
 * ShortcutsOverlay — displays all registered keyboard shortcuts.
 *
 * Groups shortcuts by category and auto-discovers entries from the
 * SHORTCUTS registry, so new shortcuts appear without changes here.
 */

import { useMemo } from 'react';
import { Modal } from '../components/Modal';
import { SHORTCUTS } from './shortcuts';
import type { ShortcutDefinition } from './shortcuts';
import styles from './ShortcutsOverlay.module.css';

interface ShortcutsOverlayProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ShortcutsOverlay({ open, onOpenChange }: ShortcutsOverlayProps) {
  const grouped = useMemo(() => {
    const groups: Record<string, ShortcutDefinition[]> = {};
    for (const def of Object.values(SHORTCUTS)) {
      if (!groups[def.category]) groups[def.category] = [];
      groups[def.category].push(def);
    }
    return groups;
  }, []);

  const categoryOrder = ['Navigation', 'Editing', 'Window', 'General'];

  return (
    <Modal open={open} onOpenChange={onOpenChange} title="Skróty klawiszowe">
      <div className={styles.grid}>
        {categoryOrder.map((cat) => {
          const items = grouped[cat];
          if (!items) return null;
          return (
            <div key={cat} className={styles.category}>
              <h3 className={styles.categoryTitle}>{cat}</h3>
              {items.map((shortcut) => (
                <div key={shortcut.label} className={styles.row}>
                  <kbd className={styles.kbd}>{shortcut.label}</kbd>
                  <span className={styles.description}>{shortcut.description}</span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </Modal>
  );
}

export { ShortcutsOverlay };
