/*
 * ReferencePanel — Right panel showing entities mentioned in the current note,
 * backlinks (notes that link TO this note), and map presets.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { NoteItem } from '../types';
import type { GraphData } from '../hooks/useGraphData';
import type { NoteMapPresetRow } from '../../../electron.d';
import { PresetEditorDialog } from './PresetEditorDialog';
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
  onCaptureMapState?: () => string | null;
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
  const [loadedPresetId, setLoadedPresetId] = useState<string | null>(null);
  const loadedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [editorDialogOpen, setEditorDialogOpen] = useState(false);
  const [editingPreset, setEditingPreset] = useState<{ id: string; name: string; mapState: string } | null>(null);

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

  const handleSaveFromEditor = useCallback(async (name: string, mapStateJson: string) => {
    if (!activeNoteId) return;
    const api = window.electronAPI;
    if (!api) return;

    const id = editingPreset?.id ?? crypto.randomUUID();
    const sortOrder = editingPreset ? presets.findIndex(p => p.id === editingPreset.id) : presets.length;

    await api.notePresets.save(id, campaignId, activeNoteId, name, mapStateJson, sortOrder >= 0 ? sortOrder : presets.length);
    await loadPresets(activeNoteId);
    setEditorDialogOpen(false);
    setEditingPreset(null);
  }, [activeNoteId, campaignId, presets, editingPreset]);

  const handleEditPreset = useCallback(async (presetId: string) => {
    const api = window.electronAPI;
    if (!api) return;
    const preset = await api.notePresets.load(presetId);
    if (preset && preset.map_state_json) {
      setEditingPreset({ id: preset.id, name: preset.name, mapState: preset.map_state_json });
      setEditorDialogOpen(true);
    }
  }, []);

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
    if (preset && preset.map_state_json && preset.map_state_json !== '{}') {
      onLoadMapPreset(preset.map_state_json);
      // Flash feedback
      setLoadedPresetId(presetId);
      if (loadedTimerRef.current) clearTimeout(loadedTimerRef.current);
      loadedTimerRef.current = setTimeout(() => setLoadedPresetId(null), 1500);
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
            <p className={styles.presetHint}>
              Saves full map state: image, tokens, fog, viewport &amp; effects.
            </p>
            {presets.map(preset => (
              <div key={preset.id} className={styles.presetItem}>
                <button
                  className={`${styles.presetLoad} ${loadedPresetId === preset.id ? styles.presetLoaded : ''}`}
                  onClick={() => handleLoadPreset(preset.id)}
                  title="Load this preset"
                >
                  {loadedPresetId === preset.id ? '✓ Loaded!' : `🗺️ ${preset.name}`}
                </button>
                <button
                  className={styles.presetEdit}
                  onClick={() => handleEditPreset(preset.id)}
                  title="Edit preset"
                >
                  ✎
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
            <button
              className={styles.addPresetBtn}
              onClick={() => { setEditingPreset(null); setEditorDialogOpen(true); }}
            >
              + Create Map Preset
            </button>

            {editorDialogOpen && (
              <PresetEditorDialog
                campaignId={campaignId}
                initialName={editingPreset?.name}
                initialMapState={editingPreset ? JSON.parse(editingPreset.mapState) : undefined}
                entities={mentionedEntities}
                onSave={handleSaveFromEditor}
                onCancel={() => { setEditorDialogOpen(false); setEditingPreset(null); }}
              />
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
