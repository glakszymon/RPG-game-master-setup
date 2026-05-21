/*
 * NpcTool — NPC Library + Generator tool window.
 */

import { useState, useEffect, useCallback } from 'react';
import { NpcLibrary } from './NpcLibrary';
import { NpcGenerator } from './NpcGenerator';
import type { NpcToolState, NpcToolTab, Npc, NpcCustomFieldDef } from './types';
import { DEFAULT_NPC_TOOL_STATE } from './types';
import styles from './NpcTool.module.css';

interface NpcToolProps {
  toolState: NpcToolState | undefined;
  onToolStateChange: (state: NpcToolState) => void;
  campaignId: string;
}

export function NpcTool({ toolState, onToolStateChange, campaignId }: NpcToolProps) {
  const state = toolState ?? DEFAULT_NPC_TOOL_STATE;
  const [npcs, setNpcs] = useState<Npc[]>([]);
  const [customFields, setCustomFields] = useState<NpcCustomFieldDef[]>([]);
  const [loading, setLoading] = useState(true);

  const patchState = useCallback(
    (patch: Partial<NpcToolState>) => onToolStateChange({ ...state, ...patch }),
    [state, onToolStateChange]
  );

  // Load NPCs and custom fields from DB
  const loadData = useCallback(async () => {
    const api = window.electronAPI?.npc;
    if (!api) return;

    const [npcRows, fieldRows] = await Promise.all([
      api.list(campaignId),
      api.listCustomFields(campaignId),
    ]);

    setNpcs(
      npcRows.map((r) => ({
        id: r.id,
        campaignId: r.campaign_id,
        name: r.name,
        typeRole: r.type_role,
        tags: JSON.parse(r.tags) as string[],
        description: r.description,
        notes: r.notes,
        portraitPath: r.portrait_path,
        portraitBuiltin: r.portrait_builtin,
        fieldValues: JSON.parse(r.field_values) as Record<string, string>,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
      }))
    );

    setCustomFields(
      fieldRows.map((r) => ({
        id: r.id,
        campaignId: r.campaign_id,
        fieldName: r.field_name,
        fieldType: r.field_type as 'text' | 'number',
        sortOrder: r.sort_order,
      }))
    );

    setLoading(false);
  }, [campaignId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleTabChange = useCallback(
    (tab: NpcToolTab) => patchState({ activeTab: tab }),
    [patchState]
  );

  return (
    <div className={styles.container}>
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${state.activeTab === 'library' ? styles.tabActive : ''}`}
          onClick={() => handleTabChange('library')}
        >
          Library
        </button>
        <button
          className={`${styles.tab} ${state.activeTab === 'generator' ? styles.tabActive : ''}`}
          onClick={() => handleTabChange('generator')}
        >
          Generator
        </button>
      </div>
      <div className={styles.content}>
        {loading ? (
          <div className={styles.loading}>Loading...</div>
        ) : state.activeTab === 'library' ? (
          <NpcLibrary
            npcs={npcs}
            customFields={customFields}
            campaignId={campaignId}
            state={state}
            patchState={patchState}
            onDataChange={loadData}
          />
        ) : (
          <NpcGenerator
            campaignId={campaignId}
            state={state}
            patchState={patchState}
            onNpcSaved={loadData}
          />
        )}
      </div>
    </div>
  );
}
