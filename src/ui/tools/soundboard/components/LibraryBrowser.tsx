/*
 * LibraryBrowser — list view of bundled CC0 samples with category filter.
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

const CATEGORIES: { value: CategoryFilter; label: string; icon: string }[] = [
  { value: 'all', label: 'All', icon: 'library_music' },
  { value: 'nature', label: 'Nature', icon: 'eco' },
  { value: 'interior', label: 'Interior', icon: 'home' },
  { value: 'combat', label: 'Combat', icon: 'swords' },
  { value: 'ambient', label: 'Ambient', icon: 'music_note' },
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
        <span className={styles.libraryTitle}>
          <span className="material-symbols-outlined">library_music</span>
          CC0 Library
        </span>
        <button className={styles.trackBtn} onClick={onClose} title="Close">
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>
      <div className={styles.libraryFilters}>
        {CATEGORIES.map(cat => (
          <button
            key={cat.value}
            className={`${styles.presetBtn} ${filter === cat.value ? styles.presetBtnActive : ''}`}
            onClick={() => setFilter(cat.value)}
          >
            <span className="material-symbols-outlined">{cat.icon}</span>
            {cat.label}
          </button>
        ))}
      </div>
      <div className={styles.libraryList}>
        {filtered.map(sample => (
          <button
            key={sample.key}
            className={styles.librarySampleRow}
            onClick={() => handleAdd(sample.key)}
            title={`Add ${sample.name}`}
          >
            <span className="material-symbols-outlined">{sample.icon}</span>
            <span className={styles.librarySampleName}>{sample.name}</span>
            <span className={`material-symbols-outlined ${styles.addIcon}`}>add_circle</span>
          </button>
        ))}
      </div>
    </div>
  );
}
