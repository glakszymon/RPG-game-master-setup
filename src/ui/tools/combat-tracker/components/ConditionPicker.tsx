/*
 * ConditionPicker — form-based popup to apply/manage conditions on a combatant.
 * Choose effect, set duration (rounds or timer), apply.
 * Shows list of currently active conditions with countdown.
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import type { CombatCondition, ActiveCondition } from '../types';
import styles from './ConditionPicker.module.css';

interface ConditionPickerProps {
  conditions: CombatCondition[];
  activeConditions: ActiveCondition[];
  onApply: (conditionId: string, mode: 'rounds' | 'time', value: number) => void;
  onRemoveCondition: (conditionId: string) => void;
  onAddCustom: (name: string) => void;
  onRemoveCustom: (id: string) => void;
  onClose: () => void;
}

export function ConditionPicker({
  conditions,
  activeConditions,
  onApply,
  onRemoveCondition,
  onAddCustom,
  onRemoveCustom,
  onClose,
}: ConditionPickerProps) {
  const [selectedCondition, setSelectedCondition] = useState('');
  const [mode, setMode] = useState<'rounds' | 'time'>('rounds');
  const [roundsValue, setRoundsValue] = useState('3');
  const [minutesValue, setMinutesValue] = useState('1');
  const [secondsValue, setSecondsValue] = useState('0');
  const [newCondition, setNewCondition] = useState('');
  const [, setTick] = useState(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Tick every second for timer countdown display
  useEffect(() => {
    const hasTimedConditions = activeConditions.some((ac) => ac.mode === 'time' && ac.expiresAt !== null);
    if (hasTimedConditions) {
      tickRef.current = setInterval(() => setTick((t) => t + 1), 1000);
      return () => { if (tickRef.current) clearInterval(tickRef.current); };
    }
    return () => { if (tickRef.current) clearInterval(tickRef.current); };
  }, [activeConditions]);

  const handleApply = useCallback(() => {
    if (!selectedCondition) return;
    if (mode === 'rounds') {
      const rounds = parseInt(roundsValue, 10);
      if (!rounds || rounds < 1) return;
      onApply(selectedCondition, 'rounds', rounds);
    } else {
      const totalSeconds = (parseInt(minutesValue, 10) || 0) * 60 + (parseInt(secondsValue, 10) || 0);
      if (totalSeconds < 1) return;
      onApply(selectedCondition, 'time', totalSeconds);
    }
    setSelectedCondition('');
    onClose();
  }, [selectedCondition, mode, roundsValue, minutesValue, secondsValue, onApply, onClose]);

  const handleAddCustom = useCallback(() => {
    const name = newCondition.trim();
    if (!name) return;
    onAddCustom(name);
    setNewCondition('');
  }, [newCondition, onAddCustom]);

  const getConditionName = (id: string) => conditions.find((c) => c.id === id)?.name ?? id;

  const formatTimeLeft = (expiresAt: number | null): string => {
    if (expiresAt === null) return '∞';
    const left = Math.max(0, Math.ceil((expiresAt - Date.now()) / 1000));
    const m = Math.floor(left / 60);
    const s = left % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  // Available conditions (not yet active)
  const availableConditions = conditions.filter(
    (c) => !activeConditions.some((ac) => ac.conditionId === c.id)
  );

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.popup} onClick={(e) => e.stopPropagation()}>
        <div className={styles.headerRow}>
          <div className={styles.header}>Zarządzanie efektami</div>
          <button className={styles.closeButton} onClick={onClose} title="Zamknij">×</button>
        </div>

        {/* Active conditions list */}
        {activeConditions.length > 0 && (
          <div className={styles.activeSection}>
            <div className={styles.sectionLabel}>Aktywne</div>
            <div className={styles.activeList}>
              {activeConditions.map((ac) => (
                <div key={ac.conditionId} className={styles.activeItem}>
                  <span className={styles.activeName}>{getConditionName(ac.conditionId)}</span>
                  <span className={styles.activeTimer}>
                    {ac.mode === 'rounds'
                      ? (ac.roundsLeft !== null ? `${ac.roundsLeft} rund` : '∞')
                      : formatTimeLeft(ac.expiresAt)
                    }
                  </span>
                  <button
                    className={styles.removeActiveButton}
                    onClick={() => onRemoveCondition(ac.conditionId)}
                    title="Usuń efekt"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Apply new condition form */}
        <div className={styles.formSection}>
          <div className={styles.sectionLabel}>Dodaj efekt</div>

          {/* Condition select */}
          <select
            className={styles.select}
            value={selectedCondition}
            onChange={(e) => setSelectedCondition(e.target.value)}
          >
            <option value="">— Wybierz efekt —</option>
            {availableConditions.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Duration mode toggle */}
          <div className={styles.modeToggle}>
            <button
              className={`${styles.modeButton} ${mode === 'rounds' ? styles.modeActive : ''}`}
              onClick={() => setMode('rounds')}
            >
              Rundy
            </button>
            <button
              className={`${styles.modeButton} ${mode === 'time' ? styles.modeActive : ''}`}
              onClick={() => setMode('time')}
            >
              Zegar
            </button>
          </div>

          {/* Duration value */}
          {mode === 'rounds' ? (
            <div className={styles.durationRow}>
              <input
                type="number"
                className={styles.durationInput}
                min={1}
                value={roundsValue}
                onChange={(e) => setRoundsValue(e.target.value)}
              />
              <span className={styles.durationLabel}>rund</span>
            </div>
          ) : (
            <div className={styles.durationRow}>
              <input
                type="number"
                className={styles.durationInput}
                min={0}
                value={minutesValue}
                onChange={(e) => setMinutesValue(e.target.value)}
              />
              <span className={styles.durationLabel}>min</span>
              <input
                type="number"
                className={styles.durationInput}
                min={0}
                max={59}
                value={secondsValue}
                onChange={(e) => setSecondsValue(e.target.value)}
              />
              <span className={styles.durationLabel}>sek</span>
            </div>
          )}

          <button
            className={styles.applyButton}
            onClick={handleApply}
            disabled={!selectedCondition}
          >
            Zastosuj
          </button>
        </div>

        {/* Add custom condition */}
        <div className={styles.addRow}>
          <input
            className={styles.addInput}
            type="text"
            placeholder="Nowy efekt..."
            value={newCondition}
            onChange={(e) => setNewCondition(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') handleAddCustom(); }}
          />
          <button className={styles.addButton} onClick={handleAddCustom}>+</button>
        </div>

        {/* Custom conditions management */}
        {conditions.filter((c) => c.isCustom).length > 0 && (
          <div className={styles.customList}>
            {conditions.filter((c) => c.isCustom).map((c) => (
              <div key={c.id} className={styles.customItem}>
                <span>{c.name}</span>
                <button
                  className={styles.deleteButton}
                  onClick={() => onRemoveCustom(c.id)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
