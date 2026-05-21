/*
 * NpcLibrary — searchable list of campaign NPCs with detail view.
 */

import { useState, useCallback, useMemo } from 'react';
import { NpcDetail } from './NpcDetail';
import type { Npc, NpcToolState, NpcCustomFieldDef } from './types';
import styles from './NpcLibrary.module.css';

interface NpcLibraryProps {
  npcs: Npc[];
  customFields: NpcCustomFieldDef[];
  campaignId: string;
  state: NpcToolState;
  patchState: (patch: Partial<NpcToolState>) => void;
  onDataChange: () => void;
}

export function NpcLibrary({ npcs, customFields, campaignId, state, patchState, onDataChange }: NpcLibraryProps) {
  const [editingNpc, setEditingNpc] = useState<Npc | null>(null);

  // Filtered NPCs
  const filtered = useMemo(() => {
    let list = npcs;
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      list = list.filter((n) => n.name.toLowerCase().includes(q));
    }
    if (state.selectedTags.length > 0) {
      list = list.filter((n) => state.selectedTags.some((t) => n.tags.includes(t)));
    }
    return list;
  }, [npcs, state.searchQuery, state.selectedTags]);

  // All unique tags
  const allTags = useMemo(() => {
    const set = new Set<string>();
    npcs.forEach((n) => n.tags.forEach((t) => set.add(t)));
    return Array.from(set).sort();
  }, [npcs]);

  const handleCreate = useCallback(async () => {
    const id = crypto.randomUUID();
    const newNpc: Npc = {
      id,
      campaignId,
      name: 'New NPC',
      typeRole: '',
      tags: [],
      description: '',
      notes: '',
      portraitPath: null,
      portraitBuiltin: null,
      fieldValues: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await window.electronAPI?.npc.save(JSON.stringify({
      id: newNpc.id,
      campaign_id: newNpc.campaignId,
      name: newNpc.name,
      type_role: newNpc.typeRole,
      tags: JSON.stringify(newNpc.tags),
      description: newNpc.description,
      notes: newNpc.notes,
      portrait_path: newNpc.portraitPath,
      portrait_builtin: newNpc.portraitBuiltin,
      field_values: JSON.stringify(newNpc.fieldValues),
    }));
    onDataChange();
    patchState({ selectedNpcId: id });
    setEditingNpc(newNpc);
  }, [campaignId, onDataChange, patchState]);

  const handleSelect = useCallback((npc: Npc) => {
    patchState({ selectedNpcId: npc.id });
    setEditingNpc(npc);
  }, [patchState]);

  const handleBack = useCallback(() => {
    patchState({ selectedNpcId: null });
    setEditingNpc(null);
  }, [patchState]);

  const handleDelete = useCallback(async (id: string) => {
    await window.electronAPI?.npc.delete(id);
    onDataChange();
    handleBack();
  }, [onDataChange, handleBack]);

  const handleTagToggle = useCallback((tag: string) => {
    const current = state.selectedTags;
    const next = current.includes(tag)
      ? current.filter((t) => t !== tag)
      : [...current, tag];
    patchState({ selectedTags: next });
  }, [state.selectedTags, patchState]);

  // Detail view
  if (editingNpc) {
    return (
      <NpcDetail
        npc={editingNpc}
        customFields={customFields}
        campaignId={campaignId}
        onBack={handleBack}
        onSave={onDataChange}
        onDelete={handleDelete}
      />
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <input
          className={styles.search}
          type="text"
          placeholder="Search NPCs..."
          value={state.searchQuery}
          onChange={(e) => patchState({ searchQuery: e.target.value })}
        />
        <button className={styles.addBtn} onClick={handleCreate} title="New NPC">
          + New
        </button>
      </div>

      {allTags.length > 0 && (
        <div className={styles.tags}>
          {allTags.map((tag) => (
            <button
              key={tag}
              className={`${styles.tagChip} ${state.selectedTags.includes(tag) ? styles.tagActive : ''}`}
              onClick={() => handleTagToggle(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      )}

      <div className={styles.list}>
        {filtered.length === 0 ? (
          <div className={styles.empty}>
            {npcs.length === 0 ? 'No NPCs yet. Click "+ New" to create one.' : 'No matches.'}
          </div>
        ) : (
          filtered.map((npc) => (
            <div
              key={npc.id}
              className={styles.npcItem}
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData('application/json', JSON.stringify({
                  type: 'npc-character',
                  id: npc.id,
                  name: npc.name,
                  portraitPath: npc.portraitPath ?? npc.portraitBuiltin,
                  ...mapFieldsToCombatStats(npc.fieldValues),
                }));
                e.dataTransfer.effectAllowed = 'copy';
              }}
              onClick={() => handleSelect(npc)}
            >
              <div className={styles.npcAvatar}>
                {npc.portraitPath || npc.portraitBuiltin ? '🖼️' : '🧑'}
              </div>
              <div className={styles.npcInfo}>
                <div className={styles.npcName}>{npc.name}</div>
                {npc.typeRole && <div className={styles.npcRole}>{npc.typeRole}</div>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

/** Map custom field values to combat stats by name convention */
function mapFieldsToCombatStats(fieldValues: Record<string, string>): Record<string, number | undefined> {
  const result: Record<string, number | undefined> = {};
  for (const [key, val] of Object.entries(fieldValues)) {
    const lower = key.toLowerCase();
    const num = Number(val);
    if (isNaN(num)) continue;
    if (lower === 'hp' || lower === 'hit points') {
      result.hp = num;
      result.maxHp = num;
    } else if (lower === 'ac' || lower === 'armor') {
      result.armor = num;
    } else if (lower === 'initiative' || lower === 'initiative modifier') {
      result.initiativeModifier = num;
    }
  }
  return result;
}
