/*
 * PartyTracker — main tool component rendered inside a CanvasWindow.
 *
 * Displays character cards in a flex-wrap row layout.
 * Inline editing of field values directly on cards.
 */

import { useState, useCallback } from 'react';
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

  // TODO: Replace with SQLite persistence
  const [characters, setCharacters] = useState<Character[]>([]);
  const [cardStructure] = useState<CardStructure>(DEFAULT_CARD_STRUCTURE);

  const addCharacter = useCallback(() => {
    const newChar: Character = {
      id: uid(),
      name: 'New Character',
      portraitPath: null,
      fieldValues: createDefaultFieldValues(cardStructure),
      order: characters.length,
    };
    setCharacters((prev) => [...prev, newChar]);
  }, [characters.length, cardStructure]);

  const updateCharacter = useCallback((id: string, updates: Partial<Character>) => {
    setCharacters((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    );
  }, []);

  const updateFieldValue = useCallback((charId: string, fieldId: string, value: FieldValue) => {
    setCharacters((prev) =>
      prev.map((c) =>
        c.id === charId
          ? { ...c, fieldValues: { ...c.fieldValues, [fieldId]: value } }
          : c,
      ),
    );
  }, []);

  const setCardSize = useCallback(
    (size: CardSizePreset) => {
      onToolStateChange({ ...toolState, cardSize: size });
    },
    [toolState, onToolStateChange],
  );

  return (
    <div className={styles.container}>
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
        <button className={styles.gearBtn} title="Settings">
          &#9881;
        </button>
      </div>

      <div className={styles.cardGrid} data-size={cardSize}>
        {characters.map((char) => (
          <CharacterCard
            key={char.id}
            character={char}
            structure={cardStructure}
            size={cardSize}
            onUpdateCharacter={updateCharacter}
            onUpdateFieldValue={updateFieldValue}
          />
        ))}

        <button className={styles.addBtn} onClick={addCharacter} title="Add character">
          +
        </button>
      </div>
    </div>
  );
}
