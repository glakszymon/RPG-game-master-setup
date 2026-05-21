/*
 * useLibraryState — main state hook for equipment & spells library.
 * Loads all entries from SQLite via IPC on mount, provides CRUD and filtering.
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { rowToEntry } from '../types';
import type { LibraryEntry, LibraryFilters } from '../types';
import type { LibraryEntryRow } from '../../../electron.d';

export function useLibraryState() {
  const [entries, setEntries] = useState<LibraryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);

  // Load all entries on mount
  const load = useCallback(async () => {
    const api = window.electronAPI?.library;
    if (!api) { setLoading(false); return; }

    try {
      const rows: LibraryEntryRow[] = await api.listEntries();
      setEntries(rows.map(row => rowToEntry(row as unknown as import('../types').LibraryEntryRow)));
    } catch (err) {
      console.error('Failed to load library entries', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (loadingRef.current) return;
    loadingRef.current = true;
    load();
  }, [load]);

  // Seed SRD on first load
  useEffect(() => {
    const api = window.electronAPI?.library;
    if (!api) return;
    api.seedSrd().then((result) => {
      if (result && !result.skipped && result.seeded > 0) {
        load();
      }
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── CRUD ──

  const saveEntry = useCallback(async (entry: LibraryEntry) => {
    const api = window.electronAPI?.library;
    if (!api) return;

    await api.saveEntry(JSON.stringify(entry));
    setEntries(prev => {
      const idx = prev.findIndex(e => e.id === entry.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = entry;
        return next;
      }
      return [...prev, entry].sort((a, b) => a.name.localeCompare(b.name));
    });
  }, []);

  const deleteEntry = useCallback(async (id: string) => {
    const api = window.electronAPI?.library;
    if (!api) return;

    await api.deleteEntry(id);
    setEntries(prev => prev.filter(e => e.id !== id));
  }, []);

  return { entries, loading, saveEntry, deleteEntry, reload: load };
}

/** Filter entries based on filter state */
export function useFilteredEntries(entries: LibraryEntry[], filters: LibraryFilters): LibraryEntry[] {
  return useMemo(() => {
    let filtered = entries;

    if (filters.category !== 'all') {
      filtered = filtered.filter(e => e.category === filters.category);
    }

    if (filters.sourceFilter !== 'all') {
      filtered = filtered.filter(e => e.source === filters.sourceFilter);
    }

    if (filters.rarity) {
      filtered = filtered.filter(e => e.rarity === filters.rarity);
    }

    if (filters.spellLevel !== null) {
      filtered = filtered.filter(e => e.spellLevel === filters.spellLevel);
    }

    if (filters.school) {
      filtered = filtered.filter(e => e.school === filters.school);
    }

    if (filters.searchQuery.trim()) {
      const q = filters.searchQuery.toLowerCase();
      filtered = filtered.filter(e => e.name.toLowerCase().includes(q));
    }

    return filtered;
  }, [entries, filters]);
}
