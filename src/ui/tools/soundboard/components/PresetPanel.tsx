/*
 * PresetPanel — save, load, and manage scene presets.
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
  presets,
  activePresetId,
  onLoadPreset,
  onSavePreset,
  onDeletePreset,
  onOverwritePreset,
}: PresetPanelProps) {
  const [newName, setNewName] = useState('');
  const [showSave, setShowSave] = useState(false);

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

  return (
    <div className={styles.presetPanel}>
      <div className={styles.presetList}>
        {presets.map(preset => (
          <div key={preset.id} className={styles.presetItem}>
            <button
              className={`${styles.presetBtn} ${activePresetId === preset.id ? styles.presetBtnActive : ''}`}
              onClick={() => onLoadPreset(preset.id)}
              title={`Load: ${preset.name}`}
            >
              {preset.name}
            </button>
            <button
              className={styles.presetSmallBtn}
              onClick={() => onOverwritePreset(preset.id)}
              title="Overwrite with current state"
            >
              💾
            </button>
            <button
              className={styles.presetSmallBtn}
              onClick={() => onDeletePreset(preset.id)}
              title="Delete preset"
            >
              🗑️
            </button>
          </div>
        ))}
      </div>

      {showSave ? (
        <div className={styles.presetSaveRow}>
          <input
            className={styles.presetInput}
            type="text"
            placeholder="Preset name..."
            value={newName}
            onChange={e => setNewName(e.target.value)}
            onKeyDown={handleKeyDown}
            autoFocus
          />
          <button className={styles.presetBtn} onClick={handleSave}>Save</button>
          <button className={styles.presetBtn} onClick={() => setShowSave(false)}>Cancel</button>
        </div>
      ) : (
        <button className={styles.addBtn} onClick={() => setShowSave(true)}>
          + Save Preset
        </button>
      )}
    </div>
  );
}
