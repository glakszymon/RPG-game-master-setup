/*
 * TimeClock — sky arc visualization with time controls.
 *
 * Displays a semicircular arc with sun/moon, digital time,
 * and buttons to advance/reverse time. Settings modal for
 * dawn/dusk configuration and custom buttons.
 */

import { useCallback, useState } from 'react';
import { SkyArc } from './SkyArc';
import { useAutoAdvance } from './hooks/useAutoAdvance';
import { Modal } from '../../components/Modal/Modal';
import { Button } from '../../components/Button/Button';
import styles from './TimeClock.module.css';
import type { CampaignTimeState } from '../../canvas/types';

interface TimeClockProps {
  timeState: CampaignTimeState;
  onAdvanceTime: (minutes: number) => void;
  onSetTimeState: (timeState: CampaignTimeState) => void;
}

const FIXED_BUTTONS = [
  { label: '+1min', minutes: 1 },
  { label: '+10min', minutes: 10 },
  { label: '+1h', minutes: 60 },
  { label: '+4h', minutes: 240 },
  { label: '+1 day', minutes: 1440 },
];

const FIXED_REVERSE = [
  { label: '-1min', minutes: -1 },
  { label: '-10min', minutes: -10 },
  { label: '-1h', minutes: -60 },
  { label: '-4h', minutes: -240 },
  { label: '-1 day', minutes: -1440 },
];

function formatTime(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function formatDate(state: CampaignTimeState): string {
  const monthName = state.calendar.months[state.currentMonth]?.name ?? `Month ${state.currentMonth + 1}`;
  return `Day ${state.currentDay}, ${monthName}, Year ${state.currentYear}`;
}

function formatRealTime(realMinutes: number): string {
  if (realMinutes < 1) return '< 1 min';
  if (realMinutes < 60) return `${Math.round(realMinutes)} min`;
  const h = Math.floor(realMinutes / 60);
  const m = Math.round(realMinutes % 60);
  return m > 0 ? `${h}h ${m}min` : `${h}h`;
}

function RatioCalculator({ ratio }: { ratio: number }) {
  const examples = [
    { label: '1 game hour', gameMin: 60 },
    { label: '4h rest', gameMin: 240 },
    { label: '8h long rest', gameMin: 480 },
    { label: '1 full day', gameMin: 1440 },
    { label: '6s combat round', gameMin: 1 },
  ];

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.75rem' }}>
      <thead>
        <tr style={{ color: 'var(--color-text-secondary)' }}>
          <th style={{ textAlign: 'left', padding: '2px 4px', fontWeight: 'normal' }}>In-game</th>
          <th style={{ textAlign: 'right', padding: '2px 4px', fontWeight: 'normal' }}>Real time</th>
        </tr>
      </thead>
      <tbody>
        {examples.map((ex) => (
          <tr key={ex.label} style={{ color: 'var(--color-text-primary)' }}>
            <td style={{ padding: '2px 4px' }}>{ex.label}</td>
            <td style={{ padding: '2px 4px', textAlign: 'right' }}>
              {formatRealTime(ex.gameMin / ratio)}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

export function TimeClock({
  timeState,
  onAdvanceTime,
  onSetTimeState,
}: TimeClockProps) {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const autoAdvance = timeState.autoAdvance ?? { enabled: false, ratio: 10 };
  const [autoPaused, setAutoPaused] = useState(false);
  const [editDawn, setEditDawn] = useState(String(timeState.dawnHour));
  const [editDusk, setEditDusk] = useState(String(timeState.duskHour));
  const [newBtnLabel, setNewBtnLabel] = useState('');
  const [newBtnMinutes, setNewBtnMinutes] = useState('');
  const [editAutoEnabled, setEditAutoEnabled] = useState(autoAdvance.enabled);
  const [editRatio, setEditRatio] = useState(String(autoAdvance.ratio));

  useAutoAdvance({ timeState, onAdvanceTime, paused: autoPaused });

  const handleOpenSettings = useCallback(() => {
    setEditDawn(String(timeState.dawnHour));
    setEditDusk(String(timeState.duskHour));
    setEditAutoEnabled(autoAdvance.enabled);
    setEditRatio(String(autoAdvance.ratio));
    setSettingsOpen(true);
  }, [timeState.dawnHour, timeState.duskHour, autoAdvance.enabled, autoAdvance.ratio]);

  const handleSaveSettings = useCallback(() => {
    const dawn = Math.max(0, Math.min(23, parseInt(editDawn, 10) || 6));
    const dusk = Math.max(dawn + 1, Math.min(24, parseInt(editDusk, 10) || 18));
    const ratio = Math.max(1, Math.min(1440, parseInt(editRatio, 10) || 10));
    onSetTimeState({
      ...timeState,
      dawnHour: dawn,
      duskHour: dusk,
      autoAdvance: { enabled: editAutoEnabled, ratio },
    });
    setSettingsOpen(false);
  }, [editDawn, editDusk, editAutoEnabled, editRatio, timeState, onSetTimeState]);

  const handleAddCustomButton = useCallback(() => {
    const label = newBtnLabel.trim();
    const minutes = parseInt(newBtnMinutes, 10);
    if (!label || isNaN(minutes) || minutes === 0) return;
    onSetTimeState({
      ...timeState,
      customTimeButtons: [...timeState.customTimeButtons, { label, minutes }],
    });
    setNewBtnLabel('');
    setNewBtnMinutes('');
  }, [newBtnLabel, newBtnMinutes, timeState, onSetTimeState]);

  const handleRemoveCustomButton = useCallback((index: number) => {
    onSetTimeState({
      ...timeState,
      customTimeButtons: timeState.customTimeButtons.filter((_, i) => i !== index),
    });
  }, [timeState, onSetTimeState]);

  return (
    <div className={styles.container}>
      {/* Top bar: gear */}
      <div className={styles.topBar}>
        <button className={styles.gearBtn} onClick={handleOpenSettings} title="Settings">
          &#9881;
        </button>
      </div>
      <div className={styles.separator} />

      {/* Sky Arc */}
      <SkyArc
        hour={timeState.currentHour}
        minute={timeState.currentMinute}
        dawn={timeState.dawnHour}
        dusk={timeState.duskHour}
      />

      {/* Digital time */}
      <div className={styles.timeDisplay}>
        {formatTime(timeState.currentHour, timeState.currentMinute)}
      </div>
      <div className={styles.dateDisplay}>
        {formatDate(timeState)}
      </div>

      {/* Auto-advance play/pause (visible only when enabled in settings) */}
      {autoAdvance.enabled && (
        <div className={styles.autoAdvanceRow}>
          <button
            className={`${styles.autoAdvanceBtn} ${!autoPaused ? styles.autoAdvanceActive : ''}`}
            onClick={() => setAutoPaused((p) => !p)}
            title={autoPaused ? 'Resume auto-advance' : 'Pause auto-advance'}
          >
            {autoPaused ? '▶' : '⏸'}
          </button>
          <span className={styles.autoAdvanceLabel}>
            {autoPaused ? 'Paused' : `Auto: 1 real min = ${autoAdvance.ratio} game min`}
          </span>
        </div>
      )}

      {/* Forward buttons */}
      <div className={styles.buttonRow}>
        {FIXED_BUTTONS.map((btn) => (
          <button
            key={btn.label}
            className={styles.timeBtn}
            onClick={() => onAdvanceTime(btn.minutes)}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Reverse buttons */}
      <div className={styles.buttonRow}>
        {FIXED_REVERSE.map((btn) => (
          <button
            key={btn.label}
            className={styles.timeBtnNeg}
            onClick={() => onAdvanceTime(btn.minutes)}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {/* Custom buttons */}
      {timeState.customTimeButtons.length > 0 && (
        <>
          <div className={styles.separator} />
          <div className={styles.buttonRow}>
            {timeState.customTimeButtons.map((btn, i) => (
              <button
                key={`custom-${i}`}
                className={btn.minutes > 0 ? styles.timeBtn : styles.timeBtnNeg}
                onClick={() => onAdvanceTime(btn.minutes)}
              >
                {btn.label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Settings Modal */}
      <Modal
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        title="Clock Settings"
        footer={
          <>
            <Button variant="secondary" onClick={() => setSettingsOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveSettings}>Save</Button>
          </>
        }
      >
        <div className={styles.settingsGrid}>
          {/* Dawn/Dusk */}
          <div className={styles.settingsField}>
            <label className={styles.settingsLabel}>Dawn / Dusk Hours</label>
            <div className={styles.settingsInputRow}>
              <input
                className={styles.settingsInput}
                type="number"
                min="0"
                max="23"
                value={editDawn}
                onChange={(e) => setEditDawn(e.target.value)}
              />
              <span style={{ color: 'var(--color-text-secondary)' }}>to</span>
              <input
                className={styles.settingsInput}
                type="number"
                min="1"
                max="24"
                value={editDusk}
                onChange={(e) => setEditDusk(e.target.value)}
              />
            </div>
          </div>

          {/* Custom Buttons */}
          <div className={styles.settingsField}>
            <label className={styles.settingsLabel}>Custom Time Buttons</label>
            <div className={styles.customButtonsList}>
              {timeState.customTimeButtons.map((btn, i) => (
                <div key={i} className={styles.customButtonRow}>
                  <span style={{ color: 'var(--color-text-primary)', fontSize: '0.85rem' }}>
                    {btn.label} ({btn.minutes > 0 ? '+' : ''}{btn.minutes}min)
                  </span>
                  <button className={styles.removeBtn} onClick={() => handleRemoveCustomButton(i)}>
                    X
                  </button>
                </div>
              ))}
              <div className={styles.customButtonRow}>
                <input
                  className={styles.settingsInput}
                  style={{ width: '80px' }}
                  placeholder="Label"
                  value={newBtnLabel}
                  onChange={(e) => setNewBtnLabel(e.target.value)}
                />
                <input
                  className={styles.settingsInput}
                  type="number"
                  placeholder="Minutes"
                  value={newBtnMinutes}
                  onChange={(e) => setNewBtnMinutes(e.target.value)}
                />
                <button className={styles.addBtn} onClick={handleAddCustomButton}>+ Add</button>
              </div>
            </div>
          </div>

          {/* Auto-Advance */}
          <div className={styles.settingsField}>
            <label className={styles.settingsLabel}>Auto-Advance Time</label>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', margin: '0 0 8px' }}>
              When enabled, in-game time advances automatically based on real time.
            </p>
            <div className={styles.settingsInputRow}>
              <label style={{ color: 'var(--color-text-primary)', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={editAutoEnabled}
                  onChange={(e) => setEditAutoEnabled(e.target.checked)}
                />
                Enable auto-advance
              </label>
            </div>
            {editAutoEnabled && (
              <>
                <div className={styles.settingsInputRow} style={{ marginTop: 8 }}>
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>1 real min =</span>
                  <input
                    className={styles.settingsInput}
                    type="number"
                    min="1"
                    max="1440"
                    value={editRatio}
                    onChange={(e) => setEditRatio(e.target.value)}
                    style={{ width: 60 }}
                  />
                  <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>game min</span>
                </div>
                <div className={styles.ratioCalc}>
                  <RatioCalculator ratio={parseInt(editRatio, 10) || 10} />
                </div>
              </>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
