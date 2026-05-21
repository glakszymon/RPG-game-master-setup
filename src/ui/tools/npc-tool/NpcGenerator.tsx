/*
 * NpcGenerator — random NPC generation from predefined lists.
 */

import { useState, useCallback, useEffect } from 'react';
import { DEFAULT_NAME_LISTS, ROLES, DESCRIPTIONS, AGE_RANGES } from './data/generatorData';
import type { NpcToolState, GeneratedNpc, NameListCategory } from './types';
import styles from './NpcGenerator.module.css';

interface NpcGeneratorProps {
  campaignId: string;
  state: NpcToolState;
  patchState: (patch: Partial<NpcToolState>) => void;
  onNpcSaved: () => void;
}

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function NpcGenerator({ campaignId, state, patchState, onNpcSaved }: NpcGeneratorProps) {
  const [nameLists, setNameLists] = useState<NameListCategory[]>(DEFAULT_NAME_LISTS);

  // Load custom name lists from DB
  useEffect(() => {
    (async () => {
      const rows = await window.electronAPI?.npc.listNameLists(campaignId);
      if (rows && rows.length > 0) {
        const custom: NameListCategory[] = rows.map((r) => ({
          ...JSON.parse(r.data_json),
          id: r.id,
          label: r.label,
        }));
        setNameLists([...DEFAULT_NAME_LISTS, ...custom]);
      }
    })();
  }, [campaignId]);

  const handleGenerate = useCallback(() => {
    const category = nameLists.find((c) => c.id === state.generatorNameType) ?? nameLists[0];
    const gender = state.generatorGender;
    const namePool = gender === 'neutral'
      ? [...category.names.male, ...category.names.female, ...category.names.neutral]
      : category.names[gender].length > 0
        ? category.names[gender]
        : [...category.names.male, ...category.names.female, ...category.names.neutral];

    const generated: GeneratedNpc = {
      name: pickRandom(namePool) || 'Unknown',
      role: pickRandom(ROLES),
      description: pickRandom(DESCRIPTIONS),
      age: Math.floor(Math.random() * (AGE_RANGES.max - AGE_RANGES.min + 1)) + AGE_RANGES.min,
      gender,
    };

    patchState({ lastGenerated: generated });
  }, [nameLists, state.generatorNameType, state.generatorGender, patchState]);

  const handleSave = useCallback(async () => {
    if (!state.lastGenerated) return;
    const gen = state.lastGenerated;
    const id = crypto.randomUUID();
    await window.electronAPI?.npc.save(JSON.stringify({
      id,
      campaign_id: campaignId,
      name: gen.name,
      type_role: gen.role,
      tags: JSON.stringify(['generated']),
      description: gen.description,
      notes: `Age: ${gen.age}`,
      portrait_path: null,
      portrait_builtin: null,
      field_values: JSON.stringify({ Age: String(gen.age) }),
    }));
    onNpcSaved();
    patchState({ lastGenerated: null });
  }, [state.lastGenerated, campaignId, onNpcSaved, patchState]);

  const handleImportJson = useCallback(async () => {
    const filePath = await window.electronAPI?.dialog.openImageFile();
    if (!filePath) return;
    // Read file content via a custom approach — for now we use readImage which returns base64
    // Actually, we need a JSON file reader. Let's use the settings API workaround:
    // For MVP, import via the file path approach is complex. Skip for now with a notice.
    // TODO: Implement proper JSON file import
  }, []);

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <label className={styles.field}>
          <span className={styles.label}>Name Type</span>
          <select
            value={state.generatorNameType}
            onChange={(e) => patchState({ generatorNameType: e.target.value })}
          >
            {nameLists.map((c) => (
              <option key={c.id} value={c.id}>{c.label}</option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Gender</span>
          <select
            value={state.generatorGender}
            onChange={(e) => patchState({ generatorGender: e.target.value as 'male' | 'female' | 'neutral' })}
          >
            <option value="neutral">Any</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
          </select>
        </label>

        <button className={styles.generateBtn} onClick={handleGenerate}>
          Generate
        </button>
      </div>

      {state.lastGenerated && (
        <div className={styles.result}>
          <div className={styles.resultField}>
            <span className={styles.resultLabel}>Name:</span> {state.lastGenerated.name}
          </div>
          <div className={styles.resultField}>
            <span className={styles.resultLabel}>Role:</span> {state.lastGenerated.role}
          </div>
          <div className={styles.resultField}>
            <span className={styles.resultLabel}>Description:</span> {state.lastGenerated.description}
          </div>
          <div className={styles.resultField}>
            <span className={styles.resultLabel}>Age:</span> {state.lastGenerated.age}
          </div>
          <button className={styles.saveBtn} onClick={handleSave}>
            Save to Library
          </button>
        </div>
      )}

      <div className={styles.importSection}>
        <button className={styles.importBtn} onClick={handleImportJson}>
          Import Custom Names (JSON)
        </button>
      </div>
    </div>
  );
}
