/*
 * NpcGenerator — random NPC generation with user-selected parameters.
 * User picks: race, profession, gender, name type.
 * Generator randomizes: name + appearance.
 */

import { useState, useCallback, useEffect } from 'react';
import { DEFAULT_NAME_LISTS, RACES, PROFESSIONS, APPEARANCES, AGE_RANGES } from './data/generatorData';
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
  const [selectedRace, setSelectedRace] = useState('Human');
  const [selectedProfession, setSelectedProfession] = useState('Merchant');
  const [selectedAge, setSelectedAge] = useState(30);

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
      race: selectedRace,
      profession: selectedProfession,
      appearance: pickRandom(APPEARANCES),
      age: selectedAge,
      gender,
    };

    patchState({ lastGenerated: generated });
  }, [nameLists, state.generatorNameType, state.generatorGender, selectedRace, selectedProfession, selectedAge, patchState]);

  const handleSave = useCallback(async () => {
    if (!state.lastGenerated) return;
    const gen = state.lastGenerated;
    const id = crypto.randomUUID();
    await window.electronAPI?.npc.save(JSON.stringify({
      id,
      campaign_id: campaignId,
      name: gen.name,
      type_role: gen.profession,
      tags: JSON.stringify(['generated', gen.race.toLowerCase()]),
      description: gen.appearance,
      notes: `Race: ${gen.race}\nAge: ${gen.age}\nGender: ${gen.gender}`,
      portrait_path: null,
      portrait_builtin: null,
      field_values: JSON.stringify({ Age: String(gen.age), Race: gen.race, Gender: gen.gender }),
    }));
    onNpcSaved();
    patchState({ lastGenerated: null });
  }, [state.lastGenerated, campaignId, onNpcSaved, patchState]);

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

        <label className={styles.field}>
          <span className={styles.label}>Race</span>
          <select value={selectedRace} onChange={(e) => setSelectedRace(e.target.value)}>
            {RACES.map((r) => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Profession</span>
          <select value={selectedProfession} onChange={(e) => setSelectedProfession(e.target.value)}>
            {PROFESSIONS.map((p) => (
              <option key={p} value={p}>{p}</option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          <span className={styles.label}>Age ({selectedAge})</span>
          <input
            type="range"
            min={AGE_RANGES.min}
            max={AGE_RANGES.max}
            value={selectedAge}
            onChange={(e) => setSelectedAge(Number(e.target.value))}
          />
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
            <span className={styles.resultLabel}>Appearance:</span> {state.lastGenerated.appearance}
          </div>
          <div className={styles.resultDivider} />
          <div className={styles.resultMeta}>
            {state.lastGenerated.race} · {state.lastGenerated.profession} · Age {state.lastGenerated.age}
          </div>
          <button className={styles.saveBtn} onClick={handleSave}>
            Save to Library
          </button>
        </div>
      )}
    </div>
  );
}
