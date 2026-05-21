/*
 * EntryDetail — right panel showing full details of a selected entry.
 */

import type { LibraryEntry } from '../types';
import { CATEGORY_LABELS, RARITY_LABELS, SCHOOL_LABELS } from '../types';
import styles from '../EquipmentLibrary.module.css';

interface EntryDetailProps {
  entry: LibraryEntry;
  onEdit?: () => void;
  onDelete?: () => void;
}

export function EntryDetail({ entry, onEdit, onDelete }: EntryDetailProps) {
  const isSpell = entry.category === 'spell';

  return (
    <div className={styles.detail}>
      <div className={styles.detailHeader}>
        <h2 className={styles.detailTitle}>{entry.name}</h2>
        <div className={styles.detailActions}>
          {onEdit && <button className={styles.editBtn} onClick={onEdit}>Edit</button>}
          {onDelete && <button className={styles.deleteBtn} onClick={onDelete}>Delete</button>}
        </div>
      </div>

      <div className={styles.detailMeta}>
        <span>{CATEGORY_LABELS[entry.category]}</span>
        {entry.rarity && <span> &middot; {RARITY_LABELS[entry.rarity]}</span>}
        {entry.school && <span> &middot; {SCHOOL_LABELS[entry.school]}</span>}
        {entry.source === 'custom' && <span className={styles.customBadge}>Custom</span>}
      </div>

      {isSpell && (
        <div className={styles.spellInfo}>
          <div><strong>Level:</strong> {entry.spellLevel === 0 ? 'Cantrip' : entry.spellLevel}</div>
          {entry.castingTime && <div><strong>Casting Time:</strong> {entry.castingTime}</div>}
          {entry.range && <div><strong>Range:</strong> {entry.range}</div>}
          {entry.components && <div><strong>Components:</strong> {entry.components}</div>}
          {entry.duration && <div><strong>Duration:</strong> {entry.duration}</div>}
        </div>
      )}

      {!isSpell && (
        <div className={styles.itemInfo}>
          {entry.weight !== null && <div><strong>Weight:</strong> {entry.weight} lb.</div>}
          {entry.cost && <div><strong>Cost:</strong> {entry.cost}</div>}
          {entry.properties.length > 0 && (
            <div><strong>Properties:</strong> {entry.properties.join(', ')}</div>
          )}
        </div>
      )}

      {entry.description && (
        <div className={styles.description}>{entry.description}</div>
      )}
    </div>
  );
}
