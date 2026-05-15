/**
 * TimerItem — card-style timer with circular progress ring for countdowns.
 * Supports: pause/resume, restart, inline edit, pin, delete.
 * Real-time timers subscribe to TimerEngine for efficient per-second updates.
 * In-game timers display from elapsedMinutes (updated via reducer).
 *
 * Layout:
 *   Header: [mode label] ........... [✕ delete]
 *   Center: ring/value + name
 *   Footer: [⟳] [▶/❚❚] [✎] [⊞]   (control row)
 *
 * Compact (pinned): horizontal bar with linear progress instead of ring.
 */

import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { useTimerDisplay, timerEngine } from './hooks/useTimerEngine';
import styles from './TimeSessionTimer.module.css';
import type { CustomTimer } from '../../canvas/types';

export interface TimerItemProps {
  timer: CustomTimer;
  onDelete: (id: string) => void;
  onTogglePause: (id: string) => void;
  onExpire: (id: string) => void;
  onRestart: (id: string) => void;
  onEdit: (id: string, patch: Partial<Pick<CustomTimer, 'name' | 'targetMinutes' | 'direction'>>) => void;
  onPin: (id: string) => void;
  /** Whether the card is being dragged (visual feedback) */
  isDragging?: boolean;
  /** Compact mode for pinned overlay (horizontal bar, no pin button) */
  compact?: boolean;
}

const RING_R = 36;
const RING_STROKE = 5;
const RING_SIZE = (RING_R + RING_STROKE) * 2;
const CIRCUMFERENCE = 2 * Math.PI * RING_R;

function formatMs(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

function formatMinutes(minutes: number): string {
  const totalMin = Math.max(0, Math.round(minutes));
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

/** SVG circular progress ring */
function ProgressRing({ progress, expired }: { progress: number; expired: boolean }) {
  const clamped = Math.max(0, Math.min(1, progress));
  const offset = CIRCUMFERENCE * (1 - clamped);
  const cx = RING_R + RING_STROKE;
  const cy = RING_R + RING_STROKE;

  return (
    <svg width={RING_SIZE} height={RING_SIZE} className={styles.ring}>
      <circle cx={cx} cy={cy} r={RING_R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={RING_STROKE} />
      <circle
        cx={cx} cy={cy} r={RING_R} fill="none"
        stroke={expired ? 'rgba(255,80,80,0.8)' : 'rgba(108,142,239,0.7)'}
        strokeWidth={RING_STROKE}
        strokeDasharray={CIRCUMFERENCE}
        strokeDashoffset={offset}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
        className={styles.ringProgress}
      />
    </svg>
  );
}

/** Linear progress bar for compact/pinned view */
function ProgressBar({ progress, expired }: { progress: number; expired: boolean }) {
  const clamped = Math.max(0, Math.min(1, progress));
  return (
    <div className={styles.progressBarTrack}>
      <div
        className={`${styles.progressBarFill} ${expired ? styles.progressBarExpired : ''}`}
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  );
}

/** Inline edit form overlay */
function EditOverlay({
  timer,
  onSave,
  onCancel,
}: {
  timer: CustomTimer;
  onSave: (patch: Partial<Pick<CustomTimer, 'name' | 'targetMinutes' | 'direction'>>) => void;
  onCancel: () => void;
}) {
  const [editName, setEditName] = useState(timer.name);
  const [editDir, setEditDir] = useState(timer.direction);
  const totalSeconds = Math.round(timer.targetMinutes * 60);
  const [editH, setEditH] = useState(String(Math.floor(totalSeconds / 3600)));
  const [editM, setEditM] = useState(String(Math.floor((totalSeconds % 3600) / 60)));
  const [editS, setEditS] = useState(String(totalSeconds % 60));

  const handleSave = useCallback(() => {
    const secs = (parseInt(editH, 10) || 0) * 3600 + (parseInt(editM, 10) || 0) * 60 + (parseInt(editS, 10) || 0);
    const targetMinutes = secs / 60;
    onSave({
      name: editName || timer.name,
      direction: editDir,
      targetMinutes: editDir === 'down' ? Math.max(1 / 60, targetMinutes) : timer.targetMinutes,
    });
  }, [editName, editDir, editH, editM, editS, timer.name, timer.targetMinutes, onSave]);

  return (
    <div className={styles.editOverlay}>
      <input
        className={styles.editInput}
        value={editName}
        onChange={(e) => setEditName(e.target.value)}
        placeholder="Timer name"
        autoFocus
      />
      <select
        className={styles.editSelect}
        value={editDir}
        onChange={(e) => setEditDir(e.target.value as 'up' | 'down')}
      >
        <option value="up">Stopwatch ↑</option>
        <option value="down">Countdown ↓</option>
      </select>
      {editDir === 'down' && (
        <div className={styles.editRow}>
          <input
            className={styles.editInput}
            type="number" min="0"
            value={editH}
            onChange={(e) => setEditH(e.target.value)}
          />
          <span className={styles.editUnit}>h</span>
          <input
            className={styles.editInput}
            type="number" min="0" max="59"
            value={editM}
            onChange={(e) => setEditM(e.target.value)}
          />
          <span className={styles.editUnit}>m</span>
          <input
            className={styles.editInput}
            type="number" min="0" max="59"
            value={editS}
            onChange={(e) => setEditS(e.target.value)}
          />
          <span className={styles.editUnit}>s</span>
        </div>
      )}
      <div className={styles.editActions}>
        <button className={styles.editCancel} onClick={onCancel}>✕</button>
        <button className={styles.editSave} onClick={handleSave}>✓</button>
      </div>
    </div>
  );
}

/** Standard card layout (used in the timer grid window) */
function CardLayout({
  timer,
  displayValue,
  progress,
  isCountdown,
  isRunning,
  editing,
  setEditing,
  onTogglePause,
  onRestart,
  onEdit,
  onPin,
  onDelete,
  compact,
}: {
  timer: CustomTimer;
  displayValue: string;
  progress: number;
  isCountdown: boolean;
  isRunning: boolean;
  editing: boolean;
  setEditing: (v: boolean) => void;
  onTogglePause: (id: string) => void;
  onRestart: (id: string) => void;
  onEdit: (id: string, patch: Partial<Pick<CustomTimer, 'name' | 'targetMinutes' | 'direction'>>) => void;
  onPin: (id: string) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}) {
  const handleEditSave = useCallback((patch: Partial<Pick<CustomTimer, 'name' | 'targetMinutes' | 'direction'>>) => {
    onEdit(timer.id, patch);
    setEditing(false);
  }, [timer.id, onEdit, setEditing]);

  if (editing) {
    return <EditOverlay timer={timer} onSave={handleEditSave} onCancel={() => setEditing(false)} />;
  }

  // Compact/pinned: horizontal bar layout
  if (compact) {
    return (
      <>
        {/* Header: name + unpin */}
        <div className={styles.cardHeader}>
          <span className={styles.cardName}>{timer.name}</span>
          <button
            className={styles.controlBtn}
            onClick={() => onPin(timer.id)}
            title="Unpin"
          ><span className={styles.icon}>keep_off</span></button>
        </div>

        {/* Value */}
        <span className={styles.cardValue}>{displayValue}</span>

        {/* Progress bar for countdown */}
        {isCountdown && <ProgressBar progress={progress} expired={timer.completed} />}

        {/* Controls */}
        <div className={styles.cardControls}>
          <button className={styles.controlBtn} onClick={() => onRestart(timer.id)} title="Restart">
            <span className={styles.icon}>replay</span>
          </button>
          {timer.mode === 'real-time' && (
            <button className={styles.controlBtn} onClick={() => onTogglePause(timer.id)} title={isRunning ? 'Pause' : 'Resume'}>
              <span className={styles.icon}>{isRunning ? 'pause' : 'play_arrow'}</span>
            </button>
          )}
          <button className={styles.controlBtn} onClick={() => setEditing(true)} title="Edit">
            <span className={styles.icon}>edit</span>
          </button>
        </div>
      </>
    );
  }

  // Standard card layout
  return (
    <>
      {/* Header: mode label + delete */}
      <div className={styles.cardHeader}>
        <span className={styles.cardMode}>
          {timer.mode === 'real-time' ? 'Real' : 'In-game'}
          {isCountdown ? ' ↓' : ' ↑'}
        </span>
        <button
          className={`${styles.controlBtn} ${styles.actionDelete}`}
          onClick={() => onDelete(timer.id)}
          title="Delete"
        ><span className={styles.icon}>close</span></button>
      </div>

      {/* Center: ring or value */}
      <div className={styles.cardCenter}>
        {isCountdown ? (
          <div className={styles.ringWrapper}>
            <ProgressRing progress={progress} expired={timer.completed} />
            <span className={styles.ringValue}>{displayValue}</span>
          </div>
        ) : (
          <span className={styles.cardValue}>{displayValue}</span>
        )}
      </div>

      <span className={styles.cardName}>{timer.name}</span>

      {/* Footer: control buttons in a row */}
      <div className={styles.cardControls}>
        <button className={styles.controlBtn} onClick={() => onRestart(timer.id)} title="Restart">
          <span className={styles.icon}>replay</span>
        </button>
        {timer.mode === 'real-time' && (
          <button className={styles.controlBtn} onClick={() => onTogglePause(timer.id)} title={isRunning ? 'Pause' : 'Resume'}>
            <span className={styles.icon}>{isRunning ? 'pause' : 'play_arrow'}</span>
          </button>
        )}
        <button className={styles.controlBtn} onClick={() => setEditing(true)} title="Edit">
          <span className={styles.icon}>edit</span>
        </button>
        <button
          className={`${styles.controlBtn} ${timer.pinned ? styles.pinActive : ''}`}
          onClick={() => onPin(timer.id)}
          title={timer.pinned ? 'Unpin' : 'Pin'}
        ><span className={styles.icon}>{timer.pinned ? 'keep_off' : 'keep'}</span></button>
      </div>
    </>
  );
}

const RealTimeTimerItem = memo(function RealTimeTimerItem({
  timer, onDelete, onTogglePause, onExpire, onRestart, onEdit, onPin,
  isDragging, compact,
}: TimerItemProps) {
  const displayMs = useTimerDisplay(timer.id);
  const expiredRef = useRef(timer.completed);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    timerEngine.register(timer.id, timer.startedAt, timer.accumulatedMs);
    return () => { timerEngine.unregister(timer.id); };
  }, [timer.id, timer.startedAt, timer.accumulatedMs]);

  useEffect(() => {
    if (timer.direction !== 'down' || timer.completed) return;
    const targetMs = timer.targetMinutes * 60 * 1000;
    if (displayMs >= targetMs && !expiredRef.current) {
      expiredRef.current = true;
      onExpire(timer.id);
    }
  }, [displayMs, timer.direction, timer.targetMinutes, timer.completed, timer.id, onExpire]);

  useEffect(() => { expiredRef.current = timer.completed; }, [timer.completed]);

  const isRunning = timer.startedAt !== null;
  const targetMs = timer.targetMinutes * 60 * 1000;
  const isCountdown = timer.direction === 'down';

  let displayValue: string;
  let progress: number;
  if (isCountdown) {
    const remaining = Math.max(0, targetMs - displayMs);
    displayValue = formatMs(remaining);
    progress = targetMs > 0 ? displayMs / targetMs : 1;
  } else {
    displayValue = formatMs(displayMs);
    progress = -1;
  }

  return (
    <div className={`${styles.timerCard} ${compact ? styles.timerCardCompact : ''} ${timer.completed ? styles.expired : ''} ${isDragging ? styles.cardDragging : ''}`}>
      <CardLayout
        timer={timer}
        displayValue={displayValue}
        progress={progress}
        isCountdown={isCountdown}
        isRunning={isRunning}
        editing={editing}
        setEditing={setEditing}
        onTogglePause={onTogglePause}
        onRestart={onRestart}
        onEdit={onEdit}
        onPin={onPin}
        onDelete={onDelete}
        compact={compact}
      />
    </div>
  );
});

const InGameTimerItem = memo(function InGameTimerItem({
  timer, onDelete, onRestart, onEdit, onPin, isDragging, compact,
  onTogglePause,
}: Omit<TimerItemProps, 'onExpire'>) {
  const [editing, setEditing] = useState(false);
  const targetMin = timer.targetMinutes;
  const isCountdown = timer.direction === 'down';

  let displayValue: string;
  let progress: number;
  if (isCountdown) {
    const remaining = Math.max(0, targetMin - timer.elapsedMinutes);
    displayValue = formatMinutes(remaining);
    progress = targetMin > 0 ? timer.elapsedMinutes / targetMin : 1;
  } else {
    displayValue = formatMinutes(timer.elapsedMinutes);
    progress = -1;
  }

  return (
    <div className={`${styles.timerCard} ${compact ? styles.timerCardCompact : ''} ${timer.completed ? styles.expired : ''} ${isDragging ? styles.cardDragging : ''}`}>
      <CardLayout
        timer={timer}
        displayValue={displayValue}
        progress={progress}
        isCountdown={isCountdown}
        isRunning={false}
        editing={editing}
        setEditing={setEditing}
        onTogglePause={onTogglePause}
        onRestart={onRestart}
        onEdit={onEdit}
        onPin={onPin}
        onDelete={onDelete}
        compact={compact}
      />
    </div>
  );
});

export const TimerItem = memo(function TimerItem(props: TimerItemProps) {
  if (props.timer.mode === 'real-time') {
    return <RealTimeTimerItem {...props} />;
  }
  return <InGameTimerItem
    timer={props.timer}
    onDelete={props.onDelete}
    onTogglePause={props.onTogglePause}
    onRestart={props.onRestart}
    onEdit={props.onEdit}
    onPin={props.onPin}
    isDragging={props.isDragging}
    compact={props.compact}
  />;
});
