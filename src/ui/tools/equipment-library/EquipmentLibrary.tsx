/*
 * EquipmentLibrary — main tool component.
 * Left panel: filtered entry list. Right panel: entry detail or form.
 */

import { useCallback, useMemo } from 'react';
import { useLibraryState, useFilteredEntries } from './hooks/useLibraryState';
import { LibraryList } from './components/LibraryList';
import { EntryDetail } from './components/EntryDetail';
import { EntryForm } from './components/EntryForm';
import { FilterBar } from './components/FilterBar';
import { DEFAULT_TOOL_STATE } from './types';
import type { EquipmentLibraryToolState, LibraryFilters, LibraryEntry } from './types';
import styles from './EquipmentLibrary.module.css';

interface EquipmentLibraryProps {
  toolState: EquipmentLibraryToolState | undefined;
  onToolStateChange: (state: EquipmentLibraryToolState) => void;
}

function uid(): string {
  return crypto.randomUUID();
}

export function EquipmentLibrary({ toolState, onToolStateChange }: EquipmentLibraryProps) {
  const state = toolState ?? DEFAULT_TOOL_STATE;

  const patchState = useCallback(
    (patch: Partial<EquipmentLibraryToolState>) => onToolStateChange({ ...state, ...patch }),
    [state, onToolStateChange],
  );

  const { entries, loading, saveEntry, deleteEntry } = useLibraryState();
  const filteredEntries = useFilteredEntries(entries, state.filters);

  const selectedEntry = useMemo(
    () => entries.find(e => e.id === state.selectedEntryId) ?? null,
    [entries, state.selectedEntryId],
  );

  const handleSelect = useCallback((id: string) => {
    patchState({ selectedEntryId: id, formOpen: false });
  }, [patchState]);

  const handleFilterChange = useCallback((filters: LibraryFilters) => {
    patchState({ filters });
  }, [patchState]);

  const handleCreate = useCallback(() => {
    patchState({ selectedEntryId: null, formOpen: true });
  }, [patchState]);

  const handleEdit = useCallback(() => {
    patchState({ formOpen: true });
  }, [patchState]);

  const handleSave = useCallback(async (entry: LibraryEntry) => {
    await saveEntry(entry);
    patchState({ selectedEntryId: entry.id, formOpen: false });
  }, [saveEntry, patchState]);

  const handleDelete = useCallback(async (id: string) => {
    await deleteEntry(id);
    patchState({ selectedEntryId: null, formOpen: false });
  }, [deleteEntry, patchState]);

  const handleCancelForm = useCallback(() => {
    patchState({ formOpen: false });
  }, [patchState]);

  if (loading) {
    return <div className={styles.loading}>Loading library...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.leftPanel}>
        <FilterBar filters={state.filters} onChange={handleFilterChange} onAdd={handleCreate} />
        <LibraryList
          entries={filteredEntries}
          selectedId={state.selectedEntryId}
          onSelect={handleSelect}
        />
      </div>
      <div className={styles.rightPanel}>
        {state.formOpen ? (
          <EntryForm
            entry={selectedEntry}
            defaultCategory={state.filters.category !== 'all' ? state.filters.category : 'weapon'}
            onSave={handleSave}
            onCancel={handleCancelForm}
            uid={uid}
          />
        ) : selectedEntry ? (
          <EntryDetail
            entry={selectedEntry}
            onEdit={selectedEntry.source === 'custom' ? handleEdit : undefined}
            onDelete={selectedEntry.source === 'custom' ? () => handleDelete(selectedEntry.id) : undefined}
          />
        ) : (
          <div className={styles.empty}>Select an entry or create a new one</div>
        )}
      </div>
    </div>
  );
}
