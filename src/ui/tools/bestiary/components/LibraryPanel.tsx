/*
 * LibraryPanel — left panel view showing all creature templates.
 * Flat list with search and advanced filter support.
 */

import { useMemo } from 'react';
import type { CreatureTemplate } from '../types';
import type { CreatureFilters } from '../types';
import { CreatureCard } from './CreatureCard';
import styles from '../Bestiary.module.css';
import type { FieldValue } from '../../../components/dynamic-fields';

interface LibraryPanelProps {
  templates: CreatureTemplate[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: CreatureFilters;
}

/** Check if a template passes the advanced filters */
function passesFilters(template: CreatureTemplate, filters: CreatureFilters): boolean {
  const fv = template.fieldValues as Record<string, FieldValue> | null;

  // CR filter (field id: 'cr')
  if (filters.crMin !== null || filters.crMax !== null) {
    const crField = fv?.['cr'];
    const crVal = crField && crField.type === 'number' ? crField.value : null;
    if (crVal === null || crVal === undefined) {
      if (filters.crMin !== null || filters.crMax !== null) return false;
    } else {
      if (filters.crMin !== null && crVal < filters.crMin) return false;
      if (filters.crMax !== null && crVal > filters.crMax) return false;
    }
  }

  // Creature type filter (field id: 'creature_type', values are capitalized)
  if (filters.creatureTypes.length > 0) {
    const ctField = fv?.['creature_type'];
    const ct = ctField && ctField.type === 'select' ? ctField.selected?.toLowerCase() : null;
    if (!ct || !filters.creatureTypes.includes(ct)) return false;
  }

  // Size filter (field id: 'size', values are capitalized)
  if (filters.sizes.length > 0) {
    const sizeField = fv?.['size'];
    const size = sizeField && sizeField.type === 'select' ? sizeField.selected?.toLowerCase() : null;
    if (!size || !filters.sizes.includes(size)) return false;
  }

  // Speed filter (field id: 'speed', creature must have at least one of the selected speeds > 0)
  if (filters.speeds.length > 0) {
    const speedField = fv?.['speed'];
    if (!speedField || speedField.type !== 'speed-list' || !speedField.values) return false;
    const hasSpeed = filters.speeds.some(s => {
      const v = speedField.values[s];
      return v !== null && v !== undefined && v > 0;
    });
    if (!hasSpeed) return false;
  }

  // Senses filter (field id: 'senses')
  if (filters.senses.length > 0) {
    const sensesField = fv?.['senses'];
    if (!sensesField || sensesField.type !== 'speed-list' || !sensesField.values) return false;
    const hasSense = filters.senses.some(s => {
      const v = sensesField.values[s];
      return v !== null && v !== undefined && v > 0;
    });
    if (!hasSense) return false;
  }

  // HP filter (field id: 'hp_default')
  if (filters.minHp !== null || filters.maxHp !== null) {
    const hpField = fv?.['hp_default'];
    const hp = hpField && hpField.type === 'number' ? hpField.value : null;
    if (hp === null || hp === undefined) return false;
    if (filters.minHp !== null && hp < filters.minHp) return false;
    if (filters.maxHp !== null && hp > filters.maxHp) return false;
  }

  // Legendary actions filter (field id: 'legendary_actions')
  if (filters.hasLegendaryActions !== null) {
    const legendaryField = fv?.['legendary_actions'];
    const hasLegendary = legendaryField && legendaryField.type === 'action-list' && legendaryField.actions && legendaryField.actions.length > 0;
    if (filters.hasLegendaryActions && !hasLegendary) return false;
    if (!filters.hasLegendaryActions && hasLegendary) return false;
  }

  return true;
}

export function LibraryPanel({ templates, selectedId, onSelect, onAdd, searchQuery, onSearchChange, filters }: LibraryPanelProps) {
  const filtered = useMemo(() => {
    let list = templates;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(t =>
        t.name.toLowerCase().includes(q) ||
        t.creatureType?.toLowerCase().includes(q) ||
        t.tags.some(tag => tag.toLowerCase().includes(q))
      );
    }
    // Apply advanced filters
    list = list.filter(t => passesFilters(t, filters));
    // Sort alphabetically
    return list.sort((a, b) => a.name.localeCompare(b.name));
  }, [templates, searchQuery, filters]);

  return (
    <>
      <div className={styles.searchBar}>
        <input
          className={styles.searchInput}
          type="text"
          placeholder="Search creatures..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
        />
      </div>

      <div className={styles.listToolbar}>
        <button className={styles.iconBtn} onClick={onAdd} title="New creature">
          <span className={styles.iconSm}>add</span> New
        </button>
      </div>

      <div className={styles.listArea}>
        {filtered.length === 0 ? (
          <div className={styles.emptyState}>
            {templates.length === 0 ? 'No creatures yet. Click + New to create one.' : 'No matches found.'}
          </div>
        ) : (
          filtered.map(t => (
            <CreatureCard
              key={t.id}
              template={t}
              selected={t.id === selectedId}
              onClick={() => onSelect(t.id)}
            />
          ))
        )}
      </div>
    </>
  );
}
