/*
 * FilterPanel — advanced creature filters drawer.
 * Appears as a left-side panel attached to the bestiary window.
 */

import { useCallback } from 'react';
import { DEFAULT_FILTERS } from '../types';
import type { CreatureFilters } from '../types';
import styles from '../Bestiary.module.css';

interface FilterPanelProps {
  filters: CreatureFilters;
  onChange: (filters: CreatureFilters) => void;
  onClose: () => void;
}

const CREATURE_TYPES = [
  'aberration', 'beast', 'celestial', 'construct', 'dragon',
  'elemental', 'fey', 'fiend', 'giant', 'humanoid',
  'monstrosity', 'ooze', 'plant', 'undead', 'swarm',
];

const SIZES = ['tiny', 'small', 'medium', 'large', 'huge', 'gargantuan'];

const SPEED_TYPES = ['walk', 'fly', 'swim', 'climb', 'burrow'];

const SENSE_TYPES = ['darkvision', 'blindsight', 'tremorsense', 'truesight'];

export function FilterPanel({ filters, onChange, onClose }: FilterPanelProps) {
  const patch = useCallback(
    (p: Partial<CreatureFilters>) => onChange({ ...filters, ...p }),
    [filters, onChange],
  );

  const toggleInArray = (arr: string[], value: string): string[] =>
    arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value];

  const hasActiveFilters = JSON.stringify(filters) !== JSON.stringify(DEFAULT_FILTERS);

  return (
    <div className={styles.filterPanelContent}>
      <div className={styles.filterHeader}>
        <span className={styles.filterTitle}>
          <span className="material-symbols-outlined">filter_alt</span>
          Filters
        </span>
        <button className={styles.iconBtn} onClick={onClose} title="Close filters">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      {hasActiveFilters && (
        <button
          className={styles.filterClearBtn}
          onClick={() => onChange(DEFAULT_FILTERS)}
        >
          <span className="material-symbols-outlined">clear_all</span> Clear all
        </button>
      )}

      {/* CR Range */}
      <div className={styles.filterSection}>
        <div className={styles.filterSectionLabel}>Challenge Rating</div>
        <div className={styles.filterRow}>
          <input
            className={styles.filterNumberInput}
            type="number"
            min={0}
            max={30}
            step={0.25}
            placeholder="Min"
            value={filters.crMin ?? ''}
            onChange={e => patch({ crMin: e.target.value ? Number(e.target.value) : null })}
          />
          <span className={styles.filterDash}>—</span>
          <input
            className={styles.filterNumberInput}
            type="number"
            min={0}
            max={30}
            step={0.25}
            placeholder="Max"
            value={filters.crMax ?? ''}
            onChange={e => patch({ crMax: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
      </div>

      {/* HP Range */}
      <div className={styles.filterSection}>
        <div className={styles.filterSectionLabel}>Hit Points</div>
        <div className={styles.filterRow}>
          <input
            className={styles.filterNumberInput}
            type="number"
            min={0}
            placeholder="Min"
            value={filters.minHp ?? ''}
            onChange={e => patch({ minHp: e.target.value ? Number(e.target.value) : null })}
          />
          <span className={styles.filterDash}>—</span>
          <input
            className={styles.filterNumberInput}
            type="number"
            min={0}
            placeholder="Max"
            value={filters.maxHp ?? ''}
            onChange={e => patch({ maxHp: e.target.value ? Number(e.target.value) : null })}
          />
        </div>
      </div>

      {/* Creature Type */}
      <div className={styles.filterSection}>
        <div className={styles.filterSectionLabel}>Creature Type</div>
        <div className={styles.filterChips}>
          {CREATURE_TYPES.map(ct => (
            <button
              key={ct}
              className={`${styles.filterChip} ${filters.creatureTypes.includes(ct) ? styles.filterChipActive : ''}`}
              onClick={() => patch({ creatureTypes: toggleInArray(filters.creatureTypes, ct) })}
            >
              {ct}
            </button>
          ))}
        </div>
      </div>

      {/* Size */}
      <div className={styles.filterSection}>
        <div className={styles.filterSectionLabel}>Size</div>
        <div className={styles.filterChips}>
          {SIZES.map(s => (
            <button
              key={s}
              className={`${styles.filterChip} ${filters.sizes.includes(s) ? styles.filterChipActive : ''}`}
              onClick={() => patch({ sizes: toggleInArray(filters.sizes, s) })}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Movement */}
      <div className={styles.filterSection}>
        <div className={styles.filterSectionLabel}>Movement</div>
        <div className={styles.filterChips}>
          {SPEED_TYPES.map(s => (
            <button
              key={s}
              className={`${styles.filterChip} ${filters.speeds.includes(s) ? styles.filterChipActive : ''}`}
              onClick={() => patch({ speeds: toggleInArray(filters.speeds, s) })}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Senses */}
      <div className={styles.filterSection}>
        <div className={styles.filterSectionLabel}>Senses</div>
        <div className={styles.filterChips}>
          {SENSE_TYPES.map(s => (
            <button
              key={s}
              className={`${styles.filterChip} ${filters.senses.includes(s) ? styles.filterChipActive : ''}`}
              onClick={() => patch({ senses: toggleInArray(filters.senses, s) })}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Legendary */}
      <div className={styles.filterSection}>
        <div className={styles.filterSectionLabel}>Special</div>
        <div className={styles.filterChips}>
          <button
            className={`${styles.filterChip} ${filters.hasLegendaryActions === true ? styles.filterChipActive : ''}`}
            onClick={() => patch({ hasLegendaryActions: filters.hasLegendaryActions === true ? null : true })}
          >
            Legendary
          </button>
          <button
            className={`${styles.filterChip} ${filters.hasLegendaryActions === false ? styles.filterChipActive : ''}`}
            onClick={() => patch({ hasLegendaryActions: filters.hasLegendaryActions === false ? null : false })}
          >
            Non-legendary
          </button>
        </div>
      </div>
    </div>
  );
}
