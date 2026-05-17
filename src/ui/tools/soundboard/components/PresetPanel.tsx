/*
 * PresetPanel — save, load, and manage scene presets (right column list).
 */

import { useState, useCallback } from 'react';
import type { SoundboardPreset } from '../types';
import styles from '../Soundboard.module.css';

interface PresetPanelProps {
  presets: SoundboardPreset[];
  activePresetId: string | null;
  onLoadPreset: (presetId: string) => void;
  onSavePreset: (name: string) => void;
  onDeletePreset: (presetId: string) => void;
  onOverwritePreset: (presetId: string) => void;
}

export function PresetPanel({
  presets = [],
  activePresetId,
  onLoadPreset,
  onSavePreset,
  onDeletePreset,
  onOverwritePreset,
}: PresetPanelProps) {
  const [newName, setNewName] = useState('');
  const [showSave, setShowSave] = useState(false);
  const [confirmOverwriteId, setConfirmOverwriteId] = useState<string | null>(null);

  const handleSave = useCallback(() => {
    if (!newName.trim()) return;
    onSavePreset(newName.trim());
    setNewName('');
    setShowSave(false);
  }, [newName, onSavePreset]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') setShowSave(false);
  }, [handleSave]);

  const handleOverwrite = useCallback((presetId: string) => {
    if (confirmOverwriteId === presetId) {
      onOverwritePreset(presetId);
      setConfirmOverwriteId(null);
    } else {
      setConfirmOverwriteId(presetId);
    }
  }, [confirmOverwriteId, onOverwritePreset]);

  return (
    <div className={styles.presetPanel}>
      <div className={styles.presetHeader}>
        <span className={styles.presetTitle}>Presets</span>
        {showSave ? (
          <div className={styles.presetSaveRow}>
            <input
              className={styles.presetInput}
              type="text"
              placeholder="Name..."
              value={newName}
              onChange={e => setNewName(e.target.value)}
              onKeyDown={handleKeyDown}
              autoFocus
            />
            <button className={styles.presetSmallBtn} onClick={handleSave} title="Save">
              <span className="material-symbols-outlined">check</span>
            </button>
            <button className={styles.presetSmallBtn} onClick={() => setShowSave(false)} title="Cancel">
              <span className="material-symbols-outlined">close</span>
            </button>
          </div>
        ) : (
          <button className={styles.presetSmallBtn} onClick={() => setShowSave(true)} title="Save new preset">
            <span className="material-symbols-outlined">add</span>
          </button>
        )}
      </div>

      <div className={styles.presetList}>
        {presets.length === 0 && (
          <div className={styles.presetEmpty}>No presets</div>
        )}
        {presets.map(preset => (
          <div key={preset.id} className={`${styles.presetItem} ${activePresetId === preset.id ? styles.presetItemActive : ''}`}>
            <button
              className={styles.presetLoadBtn}
              onClick={() => onLoadPreset(preset.id)}
              title={`Load: ${preset.name}`}
            >
              <span className="material-symbols-outlined">play_arrow</span>
              <span className={styles.presetName}>{preset.name}</span>
            </button>
            <div className={styles.presetActions}>
              <button
                className={`${styles.presetSmallBtn} ${confirmOverwriteId === preset.id ? styles.presetSmallBtnWarn : ''}`}
                onClick={() => handleOverwrite(preset.id)}
                title={confirmOverwriteId === preset.id ? 'Click again to confirm overwrite' : 'Overwrite with current state'}
              >
                <span className="material-symbols-outlined">
                  {confirmOverwriteId === preset.id ? 'warning' : 'save'}
                </span>
              </button>
              <button
                className={styles.presetSmallBtn}
                onClick={() => onDeletePreset(preset.id)}
                title="Delete preset"
              >
                <span className="material-symbols-outlined">delete</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
