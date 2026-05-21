/*
 * LibraryList — scrollable list of entry cards.
 */

import type { LibraryEntry } from '../types';
import { CATEGORY_LABELS, RARITY_LABELS } from '../types';
import styles from '../EquipmentLibrary.module.css';

interface LibraryListProps {
  entries: LibraryEntry[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function LibraryList({ entries, selectedId, onSelect }: LibraryListProps) {
  if (entries.length === 0) {
    return <div className={styles.emptyList}>No entries found</div>;
  }

  return (
    <div className={styles.list}>
      {entries.map(entry => (
        <div
          key={entry.id}
          className={`${styles.entryCard} ${entry.id === selectedId ? styles.selected : ''}`}
          onClick={() => onSelect(entry.id)}
          draggable
          onDragStart={(e) => {
            e.dataTransfer.setData('application/json', JSON.stringify({
              type: 'library-entry',
              entryId: entry.id,
              category: entry.category,
              name: entry.name,
            }));
            e.dataTransfer.effectAllowed = 'copy';
          }}
        >
          <div className={styles.entryName}>{entry.name}</div>
          <div className={styles.entryMeta}>
            <span className={styles.categoryBadge}>{CATEGORY_LABELS[entry.category]}</span>
            {entry.rarity && <span className={styles.rarityBadge}>{RARITY_LABELS[entry.rarity]}</span>}
            {entry.spellLevel !== null && (
              <span className={styles.levelBadge}>
                {entry.spellLevel === 0 ? 'Cantrip' : `Lvl ${entry.spellLevel}`}
              </span>
            )}
            {entry.source === 'custom' && <span className={styles.customBadge}>Custom</span>}
          </div>
        </div>
      ))}
    </div>
  );
}
