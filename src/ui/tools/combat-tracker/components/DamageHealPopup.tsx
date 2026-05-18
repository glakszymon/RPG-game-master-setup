/*
 * DamageHealPopup — modal popup for modifying a combatant's HP.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { Combatant } from '../types';
import styles from './DamageHealPopup.module.css';

interface DamageHealPopupProps {
  combatant: Combatant;
  onDamage: (id: string, amount: number) => void;
  onHeal: (id: string, amount: number) => void;
  onClose: () => void;
}

export function DamageHealPopup({ combatant, onDamage, onHeal, onClose }: DamageHealPopupProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleDamage = useCallback(() => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num <= 0) return;
    onDamage(combatant.id, num);
    onClose();
  }, [value, combatant.id, onDamage, onClose]);

  const handleHeal = useCallback(() => {
    const num = parseInt(value, 10);
    if (isNaN(num) || num <= 0) return;
    onHeal(combatant.id, num);
    onClose();
  }, [value, combatant.id, onHeal, onClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') onClose();
    if (e.key === 'Enter' && e.shiftKey) handleHeal();
    else if (e.key === 'Enter') handleDamage();
  }, [onClose, handleDamage, handleHeal]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
        <div className={styles.header}>
          <span className={styles.name}>{combatant.name}</span>
          <span className={styles.currentHp}>{Math.max(0, combatant.hp)} / {combatant.maxHp}</span>
        </div>
        <input
          ref={inputRef}
          className={styles.input}
          type="number"
          min="1"
          placeholder="Amount"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <div className={styles.buttons}>
          <button className={styles.damageButton} onClick={handleDamage}>
            Damage
          </button>
          <button className={styles.healButton} onClick={handleHeal}>
            Heal
          </button>
        </div>
      </div>
    </div>
  );
}
