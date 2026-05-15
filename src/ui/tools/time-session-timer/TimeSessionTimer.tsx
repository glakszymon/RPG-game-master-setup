/**
 * TimeSessionTimer — grid of stopwatch/countdown timer cards
 * with drag-and-drop reordering (party-tracker pattern: live reorder on dragOver).
 *
 * Supports: restart, inline edit, pin to overlay.
 */

import { useCallback, useState } from 'react';
import { useChimePlayer } from './hooks/useChimePlayer';
import { useExpirationBatcher } from './hooks/useExpirationBatcher';
import { TimerItem } from './TimerItem';
import styles from './TimeSessionTimer.module.css';
import type { CampaignTimeState, CustomTimer } from '../../canvas/types';
import type { NewTimerForm } from './types';
import { EMPTY_FORM } from './types';

interface TimeSessionTimerProps {
  timeState: CampaignTimeState;
  onAdvanceTime: (minutes: number) => void;
  onSetTimeState: (timeState: CampaignTimeState) => void;
}

export function TimeSessionTimer({
  timeState,
  onSetTimeState,
}: TimeSessionTimerProps) {
  const { customTimers } = timeState;
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<NewTimerForm>(EMPTY_FORM);
  const [dragId, setDragId] = useState<string | null>(null);

  const playChime = useChimePlayer();

  // ── Expiration batching ──
  const handleBatch = useCallback((ids: string[]) => {
    if (ids.length === 0) return;
    void playChime();
    onSetTimeState({
      ...timeState,
      customTimers: timeState.customTimers.map((t) =>
        ids.includes(t.id) ? { ...t, completed: true } : t,
      ),
    });
  }, [playChime, timeState, onSetTimeState]);

  const reportExpiration = useExpirationBatcher(handleBatch);

  // ── Timer CRUD ──
  const handleAddTimer = useCallback(() => {
    const name = form.name.trim() || 'Timer';
    const totalSeconds = (parseInt(form.targetHours, 10) || 0) * 3600
      + (parseInt(form.targetMinutes, 10) || 0) * 60
      + (parseInt(form.targetSeconds, 10) || 0);
    const targetMinutes = totalSeconds / 60;
    const newTimer: CustomTimer = {
      id: `timer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name,
      mode: form.mode,
      direction: form.direction,
      targetMinutes: form.direction === 'down' ? Math.max(1 / 60, targetMinutes) : 0,
      elapsedMinutes: 0,
      startedAt: form.mode === 'real-time' ? Date.now() : null,
      accumulatedMs: 0,
      soundEnabled: true,
      paused: false,
      completed: false,
      pinned: false,
    };
    onSetTimeState({
      ...timeState,
      customTimers: [...timeState.customTimers, newTimer],
    });
    setForm(EMPTY_FORM);
    setFormOpen(false);
  }, [form, timeState, onSetTimeState]);

  const handleDeleteTimer = useCallback((id: string) => {
    onSetTimeState({
      ...timeState,
      customTimers: timeState.customTimers.filter((t) => t.id !== id),
    });
  }, [timeState, onSetTimeState]);

  const handleTogglePause = useCallback((id: string) => {
    onSetTimeState({
      ...timeState,
      customTimers: timeState.customTimers.map((t) => {
        if (t.id !== id) return t;
        if (t.mode === 'real-time') {
          if (t.startedAt !== null) {
            const elapsed = Date.now() - t.startedAt;
            return { ...t, startedAt: null, accumulatedMs: t.accumulatedMs + elapsed };
          }
          return { ...t, startedAt: Date.now() };
        }
        // in-game mode: toggle paused
        return { ...t, paused: !t.paused };
      }),
    });
  }, [timeState, onSetTimeState]);

  const handleRestart = useCallback((id: string) => {
    onSetTimeState({
      ...timeState,
      customTimers: timeState.customTimers.map((t) => {
        if (t.id !== id) return t;
        return {
          ...t,
          elapsedMinutes: 0,
          accumulatedMs: 0,
          startedAt: t.mode === 'real-time' ? Date.now() : null,
          paused: false,
          completed: false,
        };
      }),
    });
  }, [timeState, onSetTimeState]);

  const handleEdit = useCallback((id: string, patch: Partial<Pick<CustomTimer, 'name' | 'targetMinutes' | 'direction'>>) => {
    onSetTimeState({
      ...timeState,
      customTimers: timeState.customTimers.map((t) =>
        t.id === id ? { ...t, ...patch } : t,
      ),
    });
  }, [timeState, onSetTimeState]);

  const handlePin = useCallback((id: string) => {
    onSetTimeState({
      ...timeState,
      customTimers: timeState.customTimers.map((t) =>
        t.id === id ? { ...t, pinned: !t.pinned } : t,
      ),
    });
  }, [timeState, onSetTimeState]);

  // ── Drag & drop reorder (party-tracker pattern: live reorder on dragOver) ──
  const handleDragStart = useCallback((id: string) => {
    setDragId(id);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (dragId === null || dragId === targetId) return;
    const fromIdx = customTimers.findIndex((t) => t.id === dragId);
    const toIdx = customTimers.findIndex((t) => t.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const next = [...customTimers];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    onSetTimeState({ ...timeState, customTimers: next });
  }, [dragId, customTimers, timeState, onSetTimeState]);

  const handleDragEnd = useCallback(() => {
    setDragId(null);
  }, []);

  return (
    <div className={styles.container}>
      {/* Timer Grid */}
      <div className={styles.timerGrid}>
        {customTimers.map((t) => (
          <div
            key={t.id}
            className={`${styles.gridCell} ${dragId === t.id ? styles.dragging : ''}`}
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', t.id);
              e.dataTransfer.effectAllowed = 'move';
              handleDragStart(t.id);
            }}
            onDragOver={(e) => handleDragOver(e, t.id)}
            onDragEnd={handleDragEnd}
          >
            <TimerItem
              timer={t}
              onDelete={handleDeleteTimer}
              onTogglePause={handleTogglePause}
              onExpire={reportExpiration}
              onRestart={handleRestart}
              onEdit={handleEdit}
              onPin={handlePin}
              isDragging={dragId === t.id}
            />
          </div>
        ))}
      </div>

      {/* Add Timer */}
      {!formOpen ? (
        <button className={styles.addBtn} onClick={() => setFormOpen(true)}>
          + Add Timer
        </button>
      ) : (
        <div className={styles.addForm}>
          <input
            className={styles.formInput}
            placeholder="Timer name (spaces allowed)"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <div className={styles.formRow}>
            <select
              className={styles.formSelect}
              value={form.mode}
              onChange={(e) => setForm({ ...form, mode: e.target.value as 'real-time' | 'in-game' })}
            >
              <option value="real-time">Real-time</option>
              <option value="in-game">In-game</option>
            </select>
            <select
              className={styles.formSelect}
              value={form.direction}
              onChange={(e) => setForm({ ...form, direction: e.target.value as 'up' | 'down' })}
            >
              <option value="up">Stopwatch ↑</option>
              <option value="down">Countdown ↓</option>
            </select>
          </div>
          {form.direction === 'down' && (
            <div className={styles.formRow}>
              <input
                className={styles.formInput}
                type="number"
                min="0"
                placeholder="H"
                value={form.targetHours}
                onChange={(e) => setForm({ ...form, targetHours: e.target.value })}
              />
              <span className={styles.formUnit}>h</span>
              <input
                className={styles.formInput}
                type="number"
                min="0"
                max="59"
                placeholder="M"
                value={form.targetMinutes}
                onChange={(e) => setForm({ ...form, targetMinutes: e.target.value })}
              />
              <span className={styles.formUnit}>m</span>
              <input
                className={styles.formInput}
                type="number"
                min="0"
                max="59"
                placeholder="S"
                value={form.targetSeconds}
                onChange={(e) => setForm({ ...form, targetSeconds: e.target.value })}
              />
              <span className={styles.formUnit}>s</span>
            </div>
          )}
          <div className={styles.formActions}>
            <button className={styles.formCancel} onClick={() => { setFormOpen(false); setForm(EMPTY_FORM); }}>
              Cancel
            </button>
            <button className={styles.formAdd} onClick={handleAddTimer}>Add</button>
          </div>
        </div>
      )}
    </div>
  );
}
