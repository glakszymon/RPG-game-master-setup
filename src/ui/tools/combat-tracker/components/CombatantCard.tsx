/*
 * CombatantCard — single-line combatant row in the combat tracker.
 * Shows: portrait, name, HP (red), armor (shield), conditions.
 */

import { useCallback } from 'react';
import type { Combatant, CombatCondition } from '../types';
import styles from './CombatantCard.module.css';

interface CombatantCardProps {
  combatant: Combatant;
  isActive: boolean;
  conditions: CombatCondition[];
  onHpClick: (combatant: Combatant) => void;
  onConditionClick: (combatant: Combatant) => void;
  onRemove: (id: string) => void;
  onDragStart: (e: React.DragEvent, combatant: Combatant) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, targetId: string) => void;
  onDragEnd: () => void;
}

export function CombatantCard({
  combatant,
  isActive,
  conditions,
  onHpClick,
  onConditionClick,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: CombatantCardProps) {
  const isDead = combatant.hp <= 0;

  const cardClass = [
    styles.card,
    isActive ? styles.active : '',
    isDead ? styles.dead : '',
  ].filter(Boolean).join(' ');

  const activeConditions = conditions.filter((c) =>
    combatant.conditions.some((ac) => ac.conditionId === c.id)
  );

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Remove ${combatant.name} from combat?`)) {
      onRemove(combatant.id);
    }
  }, [combatant.id, combatant.name, onRemove]);

  return (
    <div
      className={cardClass}
      draggable
      onDragStart={(e) => onDragStart(e, combatant)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, combatant.id)}
      onDragEnd={onDragEnd}
    >
      {/* Portrait */}
      <div className={styles.portrait}>
        {combatant.portraitPath ? (
          <img src={combatant.portraitPath} alt={combatant.name} />
        ) : (
          <span className={styles.portraitPlaceholder}>
            {combatant.name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      {/* Name */}
      <span className={styles.name}>{combatant.name}</span>

      {/* HP — red with heart icon and progress bar */}
      <button
        className={styles.hpButton}
        onClick={() => onHpClick(combatant)}
        title="Damage / Heal"
      >
        <span className={styles.hpIcon}>♥</span>
        <span className={styles.hpValue}>{Math.max(0, combatant.hp)}</span>
        <span className={styles.hpSeparator}>/</span>
        <span className={styles.hpMax}>{combatant.maxHp}</span>
        <div className={styles.hpBar}>
          <div
            className={styles.hpBarFill}
            style={{ width: `${Math.max(0, Math.min(100, (combatant.hp / combatant.maxHp) * 100))}%` }}
          />
        </div>
      </button>

      {/* Armor — shield (always visible) */}
      <span className={styles.armor} title="Armor">
        🛡 {combatant.armor}
      </span>

      {/* Condition badges */}
      {activeConditions.length > 0 && (
        <div className={styles.conditionBadges}>
          {activeConditions.map((c) => {
            const ac = combatant.conditions.find((a) => a.conditionId === c.id);
            const duration = ac?.roundsLeft;
            return (
              <span key={c.id} className={styles.badge}>
                {c.name}{duration !== null && duration !== undefined ? ` (${duration})` : ''}
              </span>
            );
          })}
        </div>
      )}

      {/* Condition toggle */}
      <button
        className={styles.conditionButton}
        onClick={() => onConditionClick(combatant)}
        title="Conditions"
      >
        ◉
      </button>

      {/* Remove button */}
      <button className={styles.removeButton} onClick={handleRemove} title="Remove">
        ×
      </button>
    </div>
  );
}
