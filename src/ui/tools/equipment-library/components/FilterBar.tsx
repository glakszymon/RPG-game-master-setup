/*
 * FilterBar — category tabs, search input, and filter controls.
 */

import { useCallback } from 'react';
import { CATEGORY_LABELS, RARITY_LABELS, SCHOOL_LABELS, DEFAULT_FILTERS } from '../types';
import type { LibraryFilters, LibraryCategory, ItemRarity, SpellSchool } from '../types';
import styles from '../EquipmentLibrary.module.css';

interface FilterBarProps {
  filters: LibraryFilters;
  onChange: (filters: LibraryFilters) => void;
  onAdd: () => void;
}

const CATEGORIES: Array<LibraryCategory | 'all'> = ['all', 'weapon', 'armor', 'equipment', 'magic_item', 'spell'];

export function FilterBar({ filters, onChange, onAdd }: FilterBarProps) {
  const handleCategoryChange = useCallback((category: LibraryCategory | 'all') => {
    onChange({ ...DEFAULT_FILTERS, category, searchQuery: filters.searchQuery });
  }, [onChange, filters.searchQuery]);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({ ...filters, searchQuery: e.target.value });
  }, [onChange, filters]);

  const handleRarity = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filters, rarity: e.target.value ? (e.target.value as ItemRarity) : null });
  }, [onChange, filters]);

  const handleSchool = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filters, school: e.target.value ? (e.target.value as SpellSchool) : null });
  }, [onChange, filters]);

  const handleLevel = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({ ...filters, spellLevel: e.target.value !== '' ? Number(e.target.value) : null });
  }, [onChange, filters]);

  const isSpellCategory = filters.category === 'spell';
  const isItemCategory = filters.category !== 'all' && filters.category !== 'spell';

  return (
    <div className={styles.filterBar}>
      <div className={styles.categoryTabs}>
        {CATEGORIES.map(cat => (
          <button
            key={cat}
            className={`${styles.categoryTab} ${filters.category === cat ? styles.active : ''}`}
            onClick={() => handleCategoryChange(cat)}
          >
            {cat === 'all' ? 'All' : CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>
      <div className={styles.filterRow}>
        <input
          type="text"
          className={styles.searchInput}
          placeholder="Search..."
          value={filters.searchQuery}
          onChange={handleSearch}
        />
        {isItemCategory && (
          <select className={styles.filterSelect} value={filters.rarity ?? ''} onChange={handleRarity}>
            <option value="">All rarities</option>
            {Object.entries(RARITY_LABELS).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        )}
        {isSpellCategory && (
          <>
            <select className={styles.filterSelect} value={filters.spellLevel ?? ''} onChange={handleLevel}>
              <option value="">All levels</option>
              <option value="0">Cantrip</option>
              {[1,2,3,4,5,6,7,8,9].map(l => (
                <option key={l} value={l}>Level {l}</option>
              ))}
            </select>
            <select className={styles.filterSelect} value={filters.school ?? ''} onChange={handleSchool}>
              <option value="">All schools</option>
              {Object.entries(SCHOOL_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </>
        )}
        <button className={styles.addBtn} onClick={onAdd} title="Add custom entry">+</button>
      </div>
    </div>
  );
}
