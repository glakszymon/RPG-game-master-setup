/*
 * AddCombatantForm — form to manually add a combatant.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import styles from './AddCombatantForm.module.css';

interface AddCombatantFormProps {
  onAdd: (data: { name: string; hp: number; maxHp: number; initiativeModifier: number }) => void;
  onClose: () => void;
}

export function AddCombatantForm({ onAdd, onClose }: AddCombatantFormProps) {
  const [name, setName] = useState('');
  const [hp, setHp] = useState('10');
  const [maxHp, setMaxHp] = useState('10');
  const [initMod, setInitMod] = useState('0');
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const hpNum = parseInt(hp, 10) || 10;
    const maxHpNum = parseInt(maxHp, 10) || hpNum;
    const initModNum = parseInt(initMod, 10) || 0;
    onAdd({ name: trimmedName, hp: hpNum, maxHp: maxHpNum, initiativeModifier: initModNum });
    onClose();
  }, [name, hp, maxHp, initMod, onAdd, onClose]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <form className={styles.form} onClick={(e) => e.stopPropagation()} onSubmit={handleSubmit}>
        <div className={styles.header}>Add Combatant</div>
        <div className={styles.field}>
          <label className={styles.label}>Name</label>
          <input
            ref={nameRef}
            className={styles.input}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Goblin"
          />
        </div>
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>HP</label>
            <input
              className={styles.input}
              type="number"
              value={hp}
              onChange={(e) => { setHp(e.target.value); setMaxHp(e.target.value); }}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Max HP</label>
            <input
              className={styles.input}
              type="number"
              value={maxHp}
              onChange={(e) => setMaxHp(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Init Mod</label>
            <input
              className={styles.input}
              type="number"
              value={initMod}
              onChange={(e) => setInitMod(e.target.value)}
            />
          </div>
        </div>
        <div className={styles.buttons}>
          <button type="button" className={styles.cancelButton} onClick={onClose}>Cancel</button>
          <button type="submit" className={styles.submitButton}>Add</button>
        </div>
      </form>
    </div>
  );
}
