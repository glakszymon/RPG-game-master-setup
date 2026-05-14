/*
 * PartyTracker — main tool component rendered inside a CanvasWindow.
 *
 * Displays character cards in a flex-wrap row layout.
 * Inline editing of field values directly on cards.
 */

import { useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import type {
  Character,
  CardStructure,
  CardSizePreset,
  FieldValue,
  PartyTrackerState,
  RadioFieldSettings,
} from './types';
import { DEFAULT_CARD_STRUCTURE } from './types';
import { CharacterCard } from './CharacterCard';
import { CardEditor } from './CardEditor';
import styles from './PartyTracker.module.css';

interface PartyTrackerProps {
  toolState: PartyTrackerState | undefined;
  onToolStateChange: (state: PartyTrackerState) => void;
  campaignId: string;
}

/** Generate a unique ID */
function uid(): string {
  return crypto.randomUUID();
}

/** Create default field values for a given card structure */
function createDefaultFieldValues(structure: CardStructure): Record<string, FieldValue> {
  const values: Record<string, FieldValue> = {};
  for (const field of structure.fields) {
    switch (field.type) {
      case 'number':
        values[field.id] = { type: 'number', value: 0 };
        break;
      case 'bubbles':
        values[field.id] = { type: 'bubbles', filled: 0 };
        break;
      case 'text-field':
        values[field.id] = { type: 'text-field', value: '' };
        break;
      case 'text-box':
        values[field.id] = { type: 'text-box', value: '' };
        break;
      case 'radio': {
        const opts = (field.settings as RadioFieldSettings)?.options ?? [];
        values[field.id] = { type: 'radio', selected: opts[0] ?? '' };
        break;
      }
      case 'checkbox':
        values[field.id] = { type: 'checkbox', checked: false };
        break;
    }
  }
  return values;
}

export function PartyTracker({ toolState, onToolStateChange, campaignId: _campaignId }: PartyTrackerProps) {
  const cardSize: CardSizePreset = toolState?.cardSize ?? 'M';
  const characters: Character[] = toolState?.characters ?? [];
  const cardStructure: CardStructure = toolState?.cardStructure ?? DEFAULT_CARD_STRUCTURE;

  const [gearOpen, setGearOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [removePanelOpen, setRemovePanelOpen] = useState(false);
  const [dragCharId, setDragCharId] = useState<string | null>(null);
  const gearRef = useRef<HTMLDivElement>(null);

  /** Helper to persist state changes */
  const updateState = useCallback(
    (updates: Partial<PartyTrackerState>) => {
      onToolStateChange({
        cardSize: toolState?.cardSize ?? 'M',
        characters: toolState?.characters ?? [],
        cardStructure: toolState?.cardStructure ?? DEFAULT_CARD_STRUCTURE,
        ...updates,
      });
    },
    [toolState, onToolStateChange],
  );

  const addCharacter = useCallback(() => {
    const newChar: Character = {
      id: uid(),
      name: 'New Character',
      portraitPath: null,
      fieldValues: createDefaultFieldValues(cardStructure),
      order: characters.length,
    };
    updateState({ characters: [...characters, newChar] });
  }, [characters, cardStructure, updateState]);

  const removeCharacter = useCallback((id: string) => {
    updateState({ characters: characters.filter((c) => c.id !== id) });
  }, [characters, updateState]);

  const updateCharacter = useCallback((id: string, updates: Partial<Character>) => {
    updateState({
      characters: characters.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    });
  }, [characters, updateState]);

  const updateFieldValue = useCallback((charId: string, fieldId: string, value: FieldValue) => {
    updateState({
      characters: characters.map((c) =>
        c.id === charId
          ? { ...c, fieldValues: { ...c.fieldValues, [fieldId]: value } }
          : c,
      ),
    });
  }, [characters, updateState]);

  const setCardSize = useCallback(
    (size: CardSizePreset) => {
      updateState({ cardSize: size });
    },
    [updateState],
  );

  const handleCardDragStart = useCallback((id: string) => {
    setDragCharId(id);
  }, []);

  const handleCardDragOver = useCallback((e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    if (dragCharId === null || dragCharId === targetId) return;
    const fromIdx = characters.findIndex((c) => c.id === dragCharId);
    const toIdx = characters.findIndex((c) => c.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const next = [...characters];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    updateState({ characters: next });
  }, [dragCharId, characters, updateState]);

  const handleCardDragEnd = useCallback(() => {
    setDragCharId(null);
  }, []);

  return (
    <div className={styles.container} onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      {/* Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.sizePresets}>
          {(['S', 'M', 'L'] as CardSizePreset[]).map((size) => (
            <button
              key={size}
              className={`${styles.presetBtn} ${cardSize === size ? styles.presetActive : ''}`}
              onClick={() => setCardSize(size)}
              title={`Card size: ${size}`}
            >
              {size}
            </button>
          ))}
        </div>

        {/* Gear menu */}
        <div className={styles.gearWrapper} ref={gearRef}>
          <button
            className={styles.gearBtn}
            title="Settings"
            onClick={() => setGearOpen((o) => !o)}
          >
            &#9881;
          </button>
          {gearOpen && (
            <div className={styles.gearMenu}>
              <button
                className={styles.gearMenuItem}
                onClick={() => {
                  setGearOpen(false);
                  addCharacter();
                }}
              >
                + Add Character
              </button>
              <button
                className={`${styles.gearMenuItem} ${styles.gearMenuDanger}`}
                onClick={() => {
                  setGearOpen(false);
                  setRemovePanelOpen(true);
                }}
                disabled={characters.length === 0}
              >
                &minus; Remove Character
              </button>
              <div className={styles.gearMenuDivider} />
              <button
                className={styles.gearMenuItem}
                onClick={() => {
                  setGearOpen(false);
                  setEditorOpen(true);
                }}
              >
                Edit Card Structure
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Cards */}
      <div className={styles.cardGrid} data-size={cardSize}>
        {characters.map((char) => (
          <CharacterCard
            key={char.id}
            character={char}
            structure={cardStructure}
            size={cardSize}
            onUpdateCharacter={updateCharacter}
            onUpdateFieldValue={updateFieldValue}
            onDragStart={handleCardDragStart}
            onDragOver={handleCardDragOver}
            onDragEnd={handleCardDragEnd}
            isDragging={dragCharId === char.id}
          />
        ))}
      </div>

      {/* Click-away to close gear menu */}
      {gearOpen && (
        <div className={styles.backdrop} onClick={() => setGearOpen(false)} />
      )}

      {/* Card Editor Modal */}
      {editorOpen && (
        <CardEditor
          structure={cardStructure}
          onSave={(newStructure) => {
            updateState({ cardStructure: newStructure });
            setEditorOpen(false);
          }}
          onCancel={() => setEditorOpen(false)}
        />
      )}

      {/* Remove Character Panel */}
      {removePanelOpen && (
        <RemoveCharacterPanel
          characters={characters}
          onRemove={(id) => {
            removeCharacter(id);
            setRemovePanelOpen(false);
          }}
          onCancel={() => setRemovePanelOpen(false)}
        />
      )}
    </div>
  );
}

/* ─── Remove Character Panel ─── */

function RemoveCharacterPanel({
  characters,
  onRemove,
  onCancel,
}: {
  characters: Character[];
  onRemove: (id: string) => void;
  onCancel: () => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmStep, setConfirmStep] = useState(0); // 0 = select, 1 = first confirm, 2 = final confirm

  const selected = characters.find((c) => c.id === selectedId);

  return createPortal(
    <div className={styles.removeOverlay} onPointerDown={(e) => e.stopPropagation()} onKeyDown={(e) => e.stopPropagation()}>
      <div className={styles.removePanel}>
        <h3 className={styles.removePanelTitle}>Remove Character</h3>

        {confirmStep === 0 && (
          <>
            <p className={styles.removePanelText}>Select a character to remove:</p>
            <div className={styles.removeCharList}>
              {characters.map((c) => (
                <button
                  key={c.id}
                  className={`${styles.removeCharItem} ${selectedId === c.id ? styles.removeCharItemSelected : ''}`}
                  onClick={() => setSelectedId(c.id)}
                >
                  {c.portraitPath && <img src={c.portraitPath} className={styles.removeCharPortrait} alt="" />}
                  <span>{c.name}</span>
                </button>
              ))}
            </div>
            <div className={styles.removePanelActions}>
              <button className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
              <button
                className={styles.dangerBtn}
                disabled={!selectedId}
                onClick={() => setConfirmStep(1)}
              >
                Continue
              </button>
            </div>
          </>
        )}

        {confirmStep === 1 && selected && (
          <>
            <p className={styles.removePanelText}>
              Are you sure you want to remove <strong>{selected.name}</strong>?
            </p>
            <div className={styles.removePanelActions}>
              <button className={styles.cancelBtn} onClick={() => setConfirmStep(0)}>Back</button>
              <button className={styles.dangerBtn} onClick={() => setConfirmStep(2)}>
                Yes, remove
              </button>
            </div>
          </>
        )}

        {confirmStep === 2 && selected && (
          <>
            <p className={styles.removePanelText}>
              This action is <strong>irreversible</strong>. All data for <strong>{selected.name}</strong> will be lost.
            </p>
            <div className={styles.removePanelActions}>
              <button className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
              <button className={styles.dangerBtnFinal} onClick={() => onRemove(selected.id)}>
                Confirm removal
              </button>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
