/**
 * PresetEditorDialog — Full-screen modal with an embedded MapDisplay editor
 * for creating/editing map presets from scratch, with an entity sidebar for
 * quick token drag-and-drop.
 */

import { useCallback, useState } from 'react';
import { MapDisplay } from '../../map-display/MapDisplay';
import { DEFAULT_MAP_STATE } from '../../map-display/types';
import styles from './PresetEditorDialog.module.css';
import type { MapDisplayState } from '../../map-display/types';
import type { MentionedEntity } from './ReferencePanel';

interface PresetEditorDialogProps {
  campaignId: string;
  /** If provided, dialog is in edit mode with pre-filled data */
  initialName?: string;
  initialMapState?: MapDisplayState;
  entities?: MentionedEntity[];
  onSave: (name: string, mapStateJson: string) => void;
  onCancel: () => void;
}

export function PresetEditorDialog({
  campaignId,
  initialName = '',
  initialMapState,
  entities = [],
  onSave,
  onCancel,
}: PresetEditorDialogProps) {
  const [mapState, setMapState] = useState<MapDisplayState>(
    initialMapState ?? { ...DEFAULT_MAP_STATE }
  );
  const [presetName, setPresetName] = useState(initialName);

  const handleToolStateChange = useCallback((newState: MapDisplayState) => {
    setMapState(newState);
  }, []);

  const handleSave = useCallback(() => {
    if (!presetName.trim()) return;
    const json = JSON.stringify(mapState);
    onSave(presetName.trim(), json);
  }, [presetName, mapState, onSave]);

  const handleEntityDragStart = useCallback((e: React.DragEvent, entity: MentionedEntity) => {
    const payload = {
      type: 'preset-template',
      id: entity.id,
      name: entity.name,
      portraitPath: entity.portraitPath || null,
    };
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'copy';
  }, []);

  const isEditMode = Boolean(initialMapState);

  return (
    <div className={styles.overlay}>
      <div className={styles.dialog}>
        <div className={styles.header}>
          <h3 className={styles.title}>
            {isEditMode ? 'Edit Map Preset' : 'Create Map Preset'}
          </h3>
          <div className={styles.headerRight}>
            <input
              type="text"
              value={presetName}
              onChange={e => setPresetName(e.target.value)}
              placeholder="Preset name..."
              className={styles.nameInput}
              onKeyDown={e => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') onCancel();
              }}
            />
            <button
              className={styles.saveBtn}
              onClick={handleSave}
              disabled={!presetName.trim()}
            >
              {isEditMode ? 'Update Preset' : 'Save Preset'}
            </button>
            <button className={styles.cancelBtn} onClick={onCancel}>
              ✕
            </button>
          </div>
        </div>
        <div className={styles.body}>
          {entities.length > 0 && (
            <div className={styles.entitySidebar}>
              <h4 className={styles.entitySidebarTitle}>Characters</h4>
              <p className={styles.entitySidebarHint}>Drag onto map to add token</p>
              {entities.map(entity => (
                <div
                  key={entity.id}
                  className={styles.entityDragItem}
                  draggable
                  onDragStart={e => handleEntityDragStart(e, entity)}
                >
                  <span className={styles.entityDragIcon}>
                    {entity.type === 'creature' ? '🐉' : '👤'}
                  </span>
                  <span className={styles.entityDragName}>{entity.name}</span>
                </div>
              ))}
            </div>
          )}
          <div className={styles.editorArea}>
            <MapDisplay
              toolState={mapState}
              onToolStateChange={handleToolStateChange}
              campaignId={campaignId}
            />
          </div>
        </div>
        <div className={styles.footer}>
          <span className={styles.footerHint}>
            Set up the map fully — image, tokens, fog of war, effects. Then name it and save.
          </span>
        </div>
      </div>
    </div>
  );
}
