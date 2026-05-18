/*
 * ReferencePanel — Right panel showing entities mentioned in the current note,
 * backlinks (notes that link TO this note), and map presets.
 */

import { useCallback, useEffect, useState } from 'react';
import type { NoteItem } from '../types';
import type { GraphData } from '../hooks/useGraphData';
import type { NoteMapPresetRow } from '../../../electron.d';
import styles from './ReferencePanel.module.css';

export interface MentionedEntity {
  id: string;
  name: string;
  type: string; // 'character' | 'creature'
}

interface ReferencePanelProps {
  activeNoteId: string | null;
  notes: NoteItem[];
  graphData: GraphData;
  mentionedEntities: MentionedEntity[];
  campaignId: string;
  onSelectNote: (noteId: string) => void;
  onCollapse: () => void;
  onLoadMapPreset: (mapStateJson: string) => void;
}

export function ReferencePanel({
  activeNoteId,
  notes,
  graphData,
  mentionedEntities,
  campaignId,
  onSelectNote,
  onCollapse,
  onLoadMapPreset,
}: ReferencePanelProps) {
  const [presets, setPresets] = useState<NoteMapPresetRow[]>([]);
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [presetName, setPresetName] = useState('');

  // Load presets when active note changes
  useEffect(() => {
    if (!activeNoteId) {
      setPresets([]); // eslint-disable-line react-hooks/set-state-in-effect
      return;
    }
    loadPresets(activeNoteId);
  }, [activeNoteId]);

  async function loadPresets(noteId: string) {
    const api = window.electronAPI;
    if (!api) return;
    const rows = await api.notePresets.list(noteId);
    setPresets(rows);
  }

  const handleSavePreset = useCallback(async () => {
    if (!activeNoteId || !presetName.trim()) return;
    const api = window.electronAPI;
    if (!api) return;

    // Capture current map state from any open map window
    // The map state JSON is passed as empty object — the parent component
    // will need to supply the actual map state. For now we use a snapshot approach:
    // The notepad dispatches an event to request current map state.
    const id = crypto.randomUUID();
    const sortOrder = presets.length;

    // We save a placeholder — the actual map state capture happens via onCaptureMapState
    await api.notePresets.save(id, campaignId, activeNoteId, presetName.trim(), '{}', sortOrder);
    await loadPresets(activeNoteId);
    setPresetName('');
    setShowSaveInput(false);
  }, [activeNoteId, campaignId, presetName, presets.length]);

  const handleDeletePreset = useCallback(async (presetId: string) => {
    const api = window.electronAPI;
    if (!api) return;
    await api.notePresets.delete(presetId);
    if (activeNoteId) {
      await loadPresets(activeNoteId);
    }
  }, [activeNoteId]);

  const handleLoadPreset = useCallback(async (presetId: string) => {
    const api = window.electronAPI;
    if (!api) return;
    const preset = await api.notePresets.load(presetId);
    if (preset && preset.map_state_json !== '{}') {
      onLoadMapPreset(preset.map_state_json);
    }
  }, [onLoadMapPreset]);

  // Compute backlinks: notes that link TO the active note
  const backlinks = activeNoteId
    ? graphData.edges
        .filter(e => e.target === activeNoteId)
        .map(e => notes.find(n => n.id === e.source))
        .filter(Boolean) as NoteItem[]
    : [];

  // Compute forward links: notes this note links TO
  const forwardLinks = activeNoteId
    ? graphData.edges
        .filter(e => e.source === activeNoteId)
        .map(e => notes.find(n => n.id === e.target))
        .filter(Boolean) as NoteItem[]
    : [];

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <span className={styles.title}>References</span>
        <button className={styles.collapseBtn} onClick={onCollapse} title="Hide panel">
          ✕
        </button>
      </div>

      {!activeNoteId ? (
        <div className={styles.empty}>Select a note to see references</div>
      ) : (
        <div className={styles.content}>
          {/* Map Presets */}
          <section className={styles.section}>
            <h4 className={styles.sectionTitle}>Map Presets</h4>
            {presets.map(preset => (
              <div key={preset.id} className={styles.presetItem}>
                <button
                  className={styles.presetLoad}
                  onClick={() => handleLoadPreset(preset.id)}
                  title="Load this preset"
                >
                  🗺️ {preset.name}
                </button>
                <button
                  className={styles.presetDelete}
                  onClick={() => handleDeletePreset(preset.id)}
                  title="Delete preset"
                >
                  ✕
                </button>
              </div>
            ))}
            {showSaveInput ? (
              <div className={styles.presetSaveForm}>
                <input
                  type="text"
                  value={presetName}
                  onChange={e => setPresetName(e.target.value)}
                  placeholder="Preset name..."
                  className={styles.presetInput}
                  autoFocus
                  onKeyDown={e => {
                    if (e.key === 'Enter') handleSavePreset();
                    if (e.key === 'Escape') setShowSaveInput(false);
                  }}
                />
                <button className={styles.presetSaveBtn} onClick={handleSavePreset}>
                  Save
                </button>
              </div>
            ) : (
              <button
                className={styles.addPresetBtn}
                onClick={() => setShowSaveInput(true)}
              >
                + Save Map Preset
              </button>
            )}
          </section>

          {/* Mentioned Entities */}
          {mentionedEntities.length > 0 && (
            <section className={styles.section}>
              <h4 className={styles.sectionTitle}>Entities</h4>
              {mentionedEntities.map(entity => (
                <div key={entity.id} className={styles.entityCard}>
                  <span className={styles.entityIcon}>
                    {entity.type === 'creature' ? '🐉' : '👤'}
                  </span>
                  <span className={styles.entityName}>{entity.name}</span>
                </div>
              ))}
            </section>
          )}

          {/* Forward Links */}
          {forwardLinks.length > 0 && (
            <section className={styles.section}>
              <h4 className={styles.sectionTitle}>Links to</h4>
              {forwardLinks.map(note => (
                <button
                  key={note.id}
                  className={styles.linkItem}
                  onClick={() => onSelectNote(note.id)}
                >
                  📄 {note.title}
                </button>
              ))}
            </section>
          )}

          {/* Backlinks */}
          {backlinks.length > 0 && (
            <section className={styles.section}>
              <h4 className={styles.sectionTitle}>Linked from</h4>
              {backlinks.map(note => (
                <button
                  key={note.id}
                  className={styles.linkItem}
                  onClick={() => onSelectNote(note.id)}
                >
                  📄 {note.title}
                </button>
              ))}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
