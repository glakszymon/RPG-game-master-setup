/*
 * EntryForm — create/edit form for custom library entries.
 */

import { useState, useCallback } from 'react';
import { CATEGORY_LABELS, RARITY_LABELS, SCHOOL_LABELS } from '../types';
import type { LibraryEntry, LibraryCategory, ItemRarity, SpellSchool } from '../types';
import styles from '../EquipmentLibrary.module.css';

interface EntryFormProps {
  entry: LibraryEntry | null;
  defaultCategory: LibraryCategory;
  onSave: (entry: LibraryEntry) => void;
  onCancel: () => void;
  uid: () => string;
}

export function EntryForm({ entry, defaultCategory, onSave, onCancel, uid }: EntryFormProps) {
  const [name, setName] = useState(entry?.name ?? '');
  const [category, setCategory] = useState<LibraryCategory>(entry?.category ?? defaultCategory);
  const [description, setDescription] = useState(entry?.description ?? '');
  const [rarity, setRarity] = useState<ItemRarity | ''>(entry?.rarity ?? '');
  const [weight, setWeight] = useState(entry?.weight?.toString() ?? '');
  const [cost, setCost] = useState(entry?.cost ?? '');
  const [properties, setProperties] = useState(entry?.properties.join(', ') ?? '');
  const [spellLevel, setSpellLevel] = useState(entry?.spellLevel?.toString() ?? '0');
  const [school, setSchool] = useState<SpellSchool | ''>(entry?.school ?? '');
  const [castingTime, setCastingTime] = useState(entry?.castingTime ?? '');
  const [range, setRange] = useState(entry?.range ?? '');
  const [components, setComponents] = useState(entry?.components ?? '');
  const [duration, setDuration] = useState(entry?.duration ?? '');

  const isSpell = category === 'spell';

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const result: LibraryEntry = {
      id: entry?.id ?? uid(),
      source: 'custom',
      category,
      name: name.trim(),
      description,
      rarity: !isSpell && rarity ? rarity : null,
      weight: !isSpell && weight ? parseFloat(weight) : null,
      cost: !isSpell ? cost || null : null,
      properties: !isSpell && properties ? properties.split(',').map(p => p.trim()).filter(Boolean) : [],
      spellLevel: isSpell ? parseInt(spellLevel, 10) : null,
      school: isSpell && school ? school : null,
      castingTime: isSpell ? castingTime || null : null,
      range: isSpell ? range || null : null,
      components: isSpell ? components || null : null,
      duration: isSpell ? duration || null : null,
      tags: entry?.tags ?? [],
      createdAt: entry?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onSave(result);
  }, [name, category, description, rarity, weight, cost, properties, spellLevel, school, castingTime, range, components, duration, entry, uid, onSave, isSpell]);

  return (
    <form className={styles.form} onSubmit={handleSubmit}>
      <h3 className={styles.formTitle}>{entry ? 'Edit Entry' : 'New Entry'}</h3>

      <label className={styles.formField}>
        <span>Category</span>
        <select value={category} onChange={e => setCategory(e.target.value as LibraryCategory)}>
          {Object.entries(CATEGORY_LABELS).map(([val, label]) => (
            <option key={val} value={val}>{label}</option>
          ))}
        </select>
      </label>

      <label className={styles.formField}>
        <span>Name</span>
        <input type="text" value={name} onChange={e => setName(e.target.value)} required />
      </label>

      <label className={styles.formField}>
        <span>Description</span>
        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={4} />
      </label>

      {!isSpell && (
        <>
          <label className={styles.formField}>
            <span>Rarity</span>
            <select value={rarity} onChange={e => setRarity(e.target.value as ItemRarity | '')}>
              <option value="">None</option>
              {Object.entries(RARITY_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </label>
          <label className={styles.formField}>
            <span>Weight (lb.)</span>
            <input type="number" step="0.01" value={weight} onChange={e => setWeight(e.target.value)} />
          </label>
          <label className={styles.formField}>
            <span>Cost</span>
            <input type="text" value={cost} onChange={e => setCost(e.target.value)} placeholder="e.g. 50 gp" />
          </label>
          <label className={styles.formField}>
            <span>Properties (comma-separated)</span>
            <input type="text" value={properties} onChange={e => setProperties(e.target.value)} placeholder="e.g. finesse, light" />
          </label>
        </>
      )}

      {isSpell && (
        <>
          <label className={styles.formField}>
            <span>Spell Level</span>
            <select value={spellLevel} onChange={e => setSpellLevel(e.target.value)}>
              <option value="0">Cantrip</option>
              {[1,2,3,4,5,6,7,8,9].map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </label>
          <label className={styles.formField}>
            <span>School</span>
            <select value={school} onChange={e => setSchool(e.target.value as SpellSchool | '')}>
              <option value="">None</option>
              {Object.entries(SCHOOL_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </label>
          <label className={styles.formField}>
            <span>Casting Time</span>
            <input type="text" value={castingTime} onChange={e => setCastingTime(e.target.value)} placeholder="e.g. 1 action" />
          </label>
          <label className={styles.formField}>
            <span>Range</span>
            <input type="text" value={range} onChange={e => setRange(e.target.value)} placeholder="e.g. 120 feet" />
          </label>
          <label className={styles.formField}>
            <span>Components</span>
            <input type="text" value={components} onChange={e => setComponents(e.target.value)} placeholder="e.g. V, S, M (a pinch of dust)" />
          </label>
          <label className={styles.formField}>
            <span>Duration</span>
            <input type="text" value={duration} onChange={e => setDuration(e.target.value)} placeholder="e.g. Concentration, 1 minute" />
          </label>
        </>
      )}

      <div className={styles.formActions}>
        <button type="submit" className={styles.saveBtn}>Save</button>
        <button type="button" className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
      </div>
    </form>
  );
}
