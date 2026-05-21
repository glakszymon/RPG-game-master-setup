/*
 * TimeClockSettingsTab — clock settings (dawn/dusk, custom buttons, auto-advance)
 * embedded within Campaign Settings modal. Same UI as TimeClock's settings modal.
 */

import { useState, useCallback } from 'react';
import { Button } from '../../components/Button/Button';
import styles from './CampaignSettings.module.css';
import clockStyles from '../../tools/time-clock/TimeClock.module.css';
import type { CampaignTimeState } from '../../canvas/types';

interface TimeClockSettingsTabProps {
  timeState: CampaignTimeState;
  onSetTimeState: (timeState: CampaignTimeState) => void;
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

function TimeClockSettingsTab({ timeState, onSetTimeState }: TimeClockSettingsTabProps) {
  const autoAdvance = timeState.autoAdvance ?? { enabled: false, ratio: 10 };

  // Dawn/Dusk stored as fractional hours (e.g. 6.5 = 6:30), edit as h:m
  const [editDawnH, setEditDawnH] = useState(String(Math.floor(timeState.dawnHour)));
  const [editDawnM, setEditDawnM] = useState(String(Math.round((timeState.dawnHour % 1) * 60)));
  const [editDuskH, setEditDuskH] = useState(String(Math.floor(timeState.duskHour)));
  const [editDuskM, setEditDuskM] = useState(String(Math.round((timeState.duskHour % 1) * 60)));
  const [newBtnLabel, setNewBtnLabel] = useState('');
  const [newBtnMinutes, setNewBtnMinutes] = useState('');
  const [editAutoEnabled, setEditAutoEnabled] = useState(autoAdvance.enabled);
  const [editRatio, setEditRatio] = useState(String(autoAdvance.ratio));
  const [saved, setSaved] = useState(false);

  const handleSave = useCallback(() => {
    const dawnH = Math.max(0, Math.min(23, parseInt(editDawnH, 10) || 6));
    const dawnM = Math.max(0, Math.min(59, parseInt(editDawnM, 10) || 0));
    const duskH = Math.max(0, Math.min(23, parseInt(editDuskH, 10) || 18));
    const duskM = Math.max(0, Math.min(59, parseInt(editDuskM, 10) || 0));
    const dawn = dawnH + dawnM / 60;
    const dusk = Math.max(dawn + 0.5, duskH + duskM / 60);
    const ratio = Math.max(1, Math.min(1440, parseInt(editRatio, 10) || 10));
    onSetTimeState({
      ...timeState,
      dawnHour: dawn,
      duskHour: dusk,
      autoAdvance: { enabled: editAutoEnabled, ratio },
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }, [editDawnH, editDawnM, editDuskH, editDuskM, editAutoEnabled, editRatio, timeState, onSetTimeState]);

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
    <div className={styles.mainTab}>
      <div className={clockStyles.settingsGrid}>
        {/* Dawn/Dusk */}
        <div className={clockStyles.settingsField}>
          <label className={clockStyles.settingsLabel}>Dawn</label>
          <div className={clockStyles.settingsInputRow}>
            <input
              className={clockStyles.settingsInput}
              type="number"
              min="0"
              max="23"
              style={{ width: 50 }}
              value={editDawnH}
              onChange={(e) => setEditDawnH(e.target.value)}
            />
            <span style={{ color: 'var(--color-text-secondary)' }}>:</span>
            <input
              className={clockStyles.settingsInput}
              type="number"
              min="0"
              max="59"
              style={{ width: 50 }}
              value={editDawnM}
              onChange={(e) => setEditDawnM(e.target.value)}
            />
          </div>
          <label className={clockStyles.settingsLabel} style={{ marginTop: 8 }}>Dusk</label>
          <div className={clockStyles.settingsInputRow}>
            <input
              className={clockStyles.settingsInput}
              type="number"
              min="0"
              max="23"
              style={{ width: 50 }}
              value={editDuskH}
              onChange={(e) => setEditDuskH(e.target.value)}
            />
            <span style={{ color: 'var(--color-text-secondary)' }}>:</span>
            <input
              className={clockStyles.settingsInput}
              type="number"
              min="0"
              max="59"
              style={{ width: 50 }}
              value={editDuskM}
              onChange={(e) => setEditDuskM(e.target.value)}
            />
          </div>
        </div>

        {/* Custom Buttons */}
        <div className={clockStyles.settingsField}>
          <label className={clockStyles.settingsLabel}>Custom Time Buttons</label>
          <div className={clockStyles.customButtonsList}>
            {timeState.customTimeButtons.map((btn, i) => (
              <div key={i} className={clockStyles.customButtonRow}>
                <span style={{ color: 'var(--color-text-primary)', fontSize: '0.85rem' }}>
                  {btn.label} ({btn.minutes > 0 ? '+' : ''}{btn.minutes}min)
                </span>
                <button className={clockStyles.removeBtn} onClick={() => handleRemoveCustomButton(i)}>
                  X
                </button>
              </div>
            ))}
            <div className={clockStyles.customButtonRow}>
              <input
                className={clockStyles.settingsInput}
                style={{ width: '80px' }}
                placeholder="Label"
                value={newBtnLabel}
                onChange={(e) => setNewBtnLabel(e.target.value)}
              />
              <input
                className={clockStyles.settingsInput}
                type="number"
                placeholder="Minutes"
                value={newBtnMinutes}
                onChange={(e) => setNewBtnMinutes(e.target.value)}
              />
              <button className={clockStyles.addBtn} onClick={handleAddCustomButton}>+ Add</button>
            </div>
          </div>
        </div>

        {/* Auto-Advance */}
        <div className={clockStyles.settingsField}>
          <label className={clockStyles.settingsLabel}>Auto-Advance Time</label>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.75rem', margin: '0 0 8px' }}>
            When enabled, in-game time advances automatically based on real time.
          </p>
          <div className={clockStyles.settingsInputRow}>
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
              <div className={clockStyles.settingsInputRow} style={{ marginTop: 8 }}>
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>1 real min =</span>
                <input
                  className={clockStyles.settingsInput}
                  type="number"
                  min="1"
                  max="1440"
                  value={editRatio}
                  onChange={(e) => setEditRatio(e.target.value)}
                  style={{ width: 60 }}
                />
                <span style={{ color: 'var(--color-text-secondary)', fontSize: '0.8rem' }}>game min</span>
              </div>
              <div className={clockStyles.ratioCalc}>
                <RatioCalculator ratio={parseInt(editRatio, 10) || 10} />
              </div>
            </>
          )}
        </div>
      </div>

      <div className={styles.actions}>
        <Button onClick={handleSave}>Save</Button>
        {saved && <span className={styles.savedMsg}>Saved!</span>}
      </div>
    </div>
  );
}

export { TimeClockSettingsTab };
