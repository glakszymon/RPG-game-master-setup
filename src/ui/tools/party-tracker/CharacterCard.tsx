/*
 * CharacterCard — displays a single character's card with portrait, name, and fields.
 * Supports inline editing of all values.
 */

import { useState, useCallback, useRef } from 'react';
import { FieldRenderer } from '../../components/dynamic-fields';
import type {
  Character,
  CardStructure,
  CardSizePreset,
  FieldValue,
  InventoryItem,
} from './types';
import styles from './PartyTracker.module.css';

interface CharacterCardProps {
  character: Character;
  structure: CardStructure;
  size: CardSizePreset;
  onUpdateCharacter: (id: string, updates: Partial<Character>) => void;
  onUpdateFieldValue: (charId: string, fieldId: string, value: FieldValue) => void;
  onAddInventoryItem: (charId: string, item: InventoryItem) => void;
  onRemoveInventoryItem: (charId: string, itemId: string) => void;
  onDragStart: (id: string) => void;
  onDragOver: (e: React.DragEvent, id: string) => void;
  onDragEnd: () => void;
  isDragging: boolean;
}

export function CharacterCard({
  character,
  structure,
  size,
  onUpdateCharacter,
  onUpdateFieldValue,
  onAddInventoryItem,
  onRemoveInventoryItem,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
}: CharacterCardProps) {
  const fieldValues = character.fieldValues ?? {};
  const inventory = character.inventory ?? [];
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(character.name);
  const [dropOver, setDropOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePortraitClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        onUpdateCharacter(character.id, { portraitPath: reader.result as string });
      };
      reader.readAsDataURL(file);
    },
    [character.id, onUpdateCharacter],
  );

  const handleNameDoubleClick = useCallback(() => {
    setNameValue(character.name);
    setEditingName(true);
  }, [character.name]);

  const handleNameSubmit = useCallback(() => {
    setEditingName(false);
    if (nameValue.trim() && nameValue !== character.name) {
      onUpdateCharacter(character.id, { name: nameValue.trim() });
    }
  }, [nameValue, character.id, character.name, onUpdateCharacter]);

  const handleNameKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter') handleNameSubmit();
      if (e.key === 'Escape') {
        setEditingName(false);
        setNameValue(character.name);
      }
    },
    [handleNameSubmit, character.name],
  );

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDropOver(false);
    try {
      const data = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.type === 'library-entry') {
        onAddInventoryItem(character.id, {
          id: crypto.randomUUID(),
          entryId: data.entryId,
          name: data.name,
          category: data.category,
        });
      }
    } catch { /* ignore non-JSON drops */ }
  }, [character.id, onAddInventoryItem]);

  const handleDropOver = useCallback((e: React.DragEvent) => {
    // Accept library-entry drops
    e.preventDefault();
    setDropOver(true);
  }, []);

  const handleDropLeave = useCallback(() => {
    setDropOver(false);
  }, []);

  return (
    <div
      className={`${styles.card} ${isDragging ? styles.cardDragging : ''} ${dropOver ? styles.cardDropTarget : ''}`}
      data-size={size}
      draggable
      onDragStart={(e) => {
        const hpField = fieldValues['hp'];
        const armorField = fieldValues['armor'];
        const initField = fieldValues['initiative'];
        const hp = hpField?.type === 'number' ? hpField.value : undefined;
        const armor = armorField?.type === 'number' ? armorField.value : 0;
        const initiative = initField?.type === 'number' ? initField.value : 0;
        e.dataTransfer.setData('application/json', JSON.stringify({
          type: 'party-character',
          id: character.id,
          name: character.name,
          portraitPath: character.portraitPath,
          hp,
          maxHp: hp,
          armor,
          initiativeModifier: initiative,
        }));
        onDragStart(character.id);
      }}
      onDragOver={(e) => {
        handleDropOver(e);
        onDragOver(e, character.id);
      }}
      onDragLeave={handleDropLeave}
      onDrop={handleDrop}
      onDragEnd={onDragEnd}
    >
      {/* Portrait */}
      <div className={styles.portrait} onClick={handlePortraitClick}>
        {character.portraitPath ? (
          <img src={character.portraitPath} alt={character.name} />
        ) : (
          <div className={styles.portraitPlaceholder}>
            <span>+</span>
          </div>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          style={{ display: 'none' }}
          onChange={handleFileChange}
        />
      </div>

      {/* Name */}
      <div className={styles.name} onDoubleClick={handleNameDoubleClick}>
        {editingName ? (
          <input
            className={styles.nameInput}
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={handleNameSubmit}
            onKeyDown={handleNameKeyDown}
            autoFocus
          />
        ) : (
          <span className={styles.nameText}>{character.name}</span>
        )}
      </div>

      {/* Fields */}
      <div className={styles.fields}>
        {structure.fields.map((field) => (
          <FieldRenderer
            key={field.id}
            field={field}
            value={fieldValues[field.id]}
            onChange={(val) => onUpdateFieldValue(character.id, field.id, val)}
          />
        ))}
      </div>

      {/* Inventory */}
      {inventory.length > 0 && (
        <div className={styles.inventory}>
          {inventory.map((item) => (
            <div key={item.id} className={styles.inventoryItem} title={item.name}>
              <span className={styles.inventoryName}>{item.name}</span>
              <button
                className={styles.inventoryRemove}
                onClick={() => onRemoveInventoryItem(character.id, item.id)}
                title="Remove"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


