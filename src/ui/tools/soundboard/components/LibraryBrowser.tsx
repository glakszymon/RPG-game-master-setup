/*
 * LibraryBrowser — grid view of bundled CC0 samples with category filter.
 */

import { useState, useCallback } from 'react';
import { BUNDLED_SAMPLES } from '../types';
import type { BundledSample } from '../types';
import styles from '../Soundboard.module.css';

interface LibraryBrowserProps {
  onAddSample: (key: string) => void;
  onClose: () => void;
}

type CategoryFilter = 'all' | BundledSample['category'];

const CATEGORIES: { value: CategoryFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'nature', label: '🌿 Nature' },
  { value: 'interior', label: '🏠 Interior' },
  { value: 'combat', label: '⚔️ Combat' },
  { value: 'ambient', label: '🎵 Ambient' },
];

export function LibraryBrowser({ onAddSample, onClose }: LibraryBrowserProps) {
  const [filter, setFilter] = useState<CategoryFilter>('all');

  const filtered = filter === 'all'
    ? BUNDLED_SAMPLES
    : BUNDLED_SAMPLES.filter(s => s.category === filter);

  const handleAdd = useCallback((key: string) => {
    onAddSample(key);
  }, [onAddSample]);

  return (
    <div className={styles.libraryOverlay}>
      <div className={styles.libraryHeader}>
        <span className={styles.libraryTitle}>CC0 Library</span>
        <button className={styles.trackBtn} onClick={onClose} title="Close">✕</button>
      </div>
      <div className={styles.libraryFilters}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            className={`${styles.presetBtn} ${filter === cat.value ? styles.presetBtnActive : ''}`}
            onClick={() => setFilter(cat.value)}
          >
            {cat.label}
          </button>
        ))}
      </div>
      <div className={styles.libraryGrid}>
        {filtered.map(sample => (
          <button
            key={sample.key}
            className={styles.librarySampleBtn}
            onClick={() => handleAdd(sample.key)}
            title={`Add ${sample.name}`}
          >
            <span className={styles.librarySampleIcon}>{sample.icon}</span>
            <span className={styles.librarySampleName}>{sample.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
