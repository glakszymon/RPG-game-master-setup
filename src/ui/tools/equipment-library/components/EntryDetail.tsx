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
        {entry.itemType && <span> &middot; {entry.itemType}</span>}
        {entry.rarity && <span> &middot; {RARITY_LABELS[entry.rarity]}</span>}
        {entry.school && <span> &middot; {SCHOOL_LABELS[entry.school]}</span>}
        {entry.source === 'custom' && <span className={styles.customBadge}>Custom</span>}
      </div>

      {/* Schematic stats for items */}
      {!isSpell && (
        <div className={styles.statBlock}>
          {entry.damage && (
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Damage</span>
              <span className={styles.statValue}>{entry.damage}{entry.damageType ? ` ${entry.damageType}` : ''}</span>
            </div>
          )}
          {entry.ac !== null && (
            <div className={styles.statRow}>
              <span className={styles.statLabel}>AC</span>
              <span className={styles.statValue}>{entry.ac}</span>
            </div>
          )}
          {entry.weight !== null && (
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Weight</span>
              <span className={styles.statValue}>{entry.weight} lb.</span>
            </div>
          )}
          {entry.cost && (
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Cost</span>
              <span className={styles.statValue}>{entry.cost}</span>
            </div>
          )}
          {entry.properties.length > 0 && (
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Properties</span>
              <span className={styles.statValue}>{entry.properties.join(', ')}</span>
            </div>
          )}
        </div>
      )}

      {/* Schematic stats for spells */}
      {isSpell && (
        <div className={styles.statBlock}>
          <div className={styles.statRow}>
            <span className={styles.statLabel}>Level</span>
            <span className={styles.statValue}>{entry.spellLevel === 0 ? 'Cantrip' : entry.spellLevel}</span>
          </div>
          {entry.castingTime && (
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Casting Time</span>
              <span className={styles.statValue}>{entry.castingTime}</span>
            </div>
          )}
          {entry.range && (
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Range</span>
              <span className={styles.statValue}>{entry.range}</span>
            </div>
          )}
          {entry.components && (
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Components</span>
              <span className={styles.statValue}>{entry.components}</span>
            </div>
          )}
          {entry.duration && (
            <div className={styles.statRow}>
              <span className={styles.statLabel}>Duration</span>
              <span className={styles.statValue}>{entry.duration}</span>
            </div>
          )}
        </div>
      )}

      {entry.description && (
        <div className={styles.description}>{entry.description}</div>
      )}
    </div>
  );
}
