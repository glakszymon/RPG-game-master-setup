/*
 * LibraryPanel — left panel view showing all creature templates.
 * Groups creatures by creature type (aberration, beast, dragon, etc.).
 * Search, filter, and select templates. Drag to encounter tree.
 */

import { useState, useMemo } from 'react';
import type { CreatureTemplate, CreatureType } from '../types';
import { CREATURE_TYPE_ICON } from '../types';
import { CreatureCard } from './CreatureCard';
import styles from '../Bestiary.module.css';

interface LibraryPanelProps {
  templates: CreatureTemplate[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

/** Capitalize first letter */
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Stable ordering for creature types */
const TYPE_ORDER: CreatureType[] = [
  'aberration', 'beast', 'celestial', 'construct', 'dragon',
  'elemental', 'fey', 'fiend', 'giant', 'humanoid',
  'monstrosity', 'ooze', 'plant', 'undead', 'swarm',
];

export function LibraryPanel({ templates, selectedId, onSelect, onAdd, searchQuery, onSearchChange }: LibraryPanelProps) {
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());

  const allTags = useMemo(() => {
    const tags = new Set<string>();
    for (const t of templates) {
      for (const tag of t.tags) tags.add(tag);
    }
    return Array.from(tags).sort();
  }, [templates]);

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
    if (tagFilter) {
      list = list.filter(t => t.tags.includes(tagFilter));
    }
    return list;
  }, [templates, searchQuery, tagFilter]);

  // Group by creature type
  const grouped = useMemo(() => {
    const groups = new Map<string, CreatureTemplate[]>();
    const uncategorized: CreatureTemplate[] = [];

    for (const t of filtered) {
      if (t.creatureType) {
        const key = t.creatureType;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(t);
      } else {
        uncategorized.push(t);
      }
    }

    // Sort groups by TYPE_ORDER
    const ordered: { key: string; label: string; icon: string; items: CreatureTemplate[] }[] = [];
    for (const type of TYPE_ORDER) {
      const items = groups.get(type);
      if (items && items.length > 0) {
        ordered.push({
          key: type,
          label: capitalize(type),
          icon: CREATURE_TYPE_ICON[type],
          items: items.sort((a, b) => a.name.localeCompare(b.name)),
        });
      }
    }
    if (uncategorized.length > 0) {
      ordered.push({
        key: '__uncategorized',
        label: 'Uncategorized',
        icon: 'category',
        items: uncategorized.sort((a, b) => a.name.localeCompare(b.name)),
      });
    }
    return ordered;
  }, [filtered]);

  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const hasGroups = grouped.length > 0;
  const isSearching = searchQuery.trim().length > 0;

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

      {allTags.length > 0 && (
        <div className={styles.searchBar} style={{ paddingTop: 0 }}>
          <div className={styles.tagsContainer}>
            {tagFilter && (
              <span className={styles.tag}>
                {tagFilter}
                <span className={styles.tagRemove} onClick={() => setTagFilter(null)}>x</span>
              </span>
            )}
            {!tagFilter && allTags.slice(0, 8).map(tag => (
              <span key={tag} className={styles.tag} onClick={() => setTagFilter(tag)} style={{ cursor: 'pointer' }}>
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

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
        ) : isSearching && !hasGroups ? (
          /* Flat list when searching yields no grouped results */
          filtered.map(t => (
            <CreatureCard
              key={t.id}
              template={t}
              selected={t.id === selectedId}
              onClick={() => onSelect(t.id)}
            />
          ))
        ) : (
          grouped.map(group => (
            <div key={group.key} className={styles.typeGroup}>
              <div
                className={styles.typeGroupHeader}
                onClick={() => toggleGroup(group.key)}
              >
                <span className={`${styles.typeGroupChevron} ${!collapsedGroups.has(group.key) ? styles.typeGroupChevronOpen : ''}`}>
                  <span className={styles.iconSm}>chevron_right</span>
                </span>
                <span className={styles.iconSm}>{group.icon}</span>
                <span className={styles.typeGroupLabel}>{group.label}</span>
                <span className={styles.typeGroupCount}>{group.items.length}</span>
              </div>
              {!collapsedGroups.has(group.key) && (
                <div className={styles.typeGroupList}>
                  {group.items.map(t => (
                    <CreatureCard
                      key={t.id}
                      template={t}
                      selected={t.id === selectedId}
                      onClick={() => onSelect(t.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
