/*
 * CharacterCard — displays a single character's card with portrait, name, and fields.
 * Supports inline editing of all values.
 */

import { useState, useCallback, useRef } from 'react';
import type {
  Character,
  CardStructure,
  CardSizePreset,
  FieldValue,
  FieldDefinition,
  BubblesFieldSettings,
  RadioFieldSettings,
  NumberFieldSettings,
} from './types';
import styles from './PartyTracker.module.css';

interface CharacterCardProps {
  character: Character;
  structure: CardStructure;
  size: CardSizePreset;
  onUpdateCharacter: (id: string, updates: Partial<Character>) => void;
  onUpdateFieldValue: (charId: string, fieldId: string, value: FieldValue) => void;
}

export function CharacterCard({
  character,
  structure,
  size,
  onUpdateCharacter,
  onUpdateFieldValue,
}: CharacterCardProps) {
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState(character.name);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePortraitClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      // Create a local URL for preview (in production, save to disk via IPC)
      const url = URL.createObjectURL(file);
      onUpdateCharacter(character.id, { portraitPath: url });
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

  return (
    <div className={styles.card} data-size={size}>
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
            value={character.fieldValues[field.id]}
            onChange={(val) => onUpdateFieldValue(character.id, field.id, val)}
          />
        ))}
      </div>
    </div>
  );
}

/* ─── Field Renderer ────────────────────────────── */

interface FieldRendererProps {
  field: FieldDefinition;
  value: FieldValue | undefined;
  onChange: (value: FieldValue) => void;
}

function FieldRenderer({ field, value, onChange }: FieldRendererProps) {
  const widthClass = `fieldWidth_${field.width.replace('/', '_')}`;

  return (
    <div
      className={`${styles.field} ${styles[widthClass] ?? ''}`}
      style={{ textAlign: field.textAlign }}
    >
      <label className={styles.fieldLabel}>{field.title}</label>
      <div className={styles.fieldValue}>
        <FieldInput field={field} value={value} onChange={onChange} />
      </div>
    </div>
  );
}

/* ─── NumberInput (select-all on focus, overwrite behavior) ─── */

function NumberInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(String(value));

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setEditing(true);
    setText(String(value));
    e.target.select();
  };

  const handleBlur = () => {
    setEditing(false);
    const parsed = Number(text);
    onChange(isNaN(parsed) ? 0 : parsed);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
    if (e.key === 'Escape') {
      setText(String(value));
      setEditing(false);
    }
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      className={styles.numberInput}
      value={editing ? text : String(value)}
      onChange={(e) => setText(e.target.value)}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    />
  );
}

/* ─── Field Input (inline editing) ──────────────── */

interface FieldInputProps {
  field: FieldDefinition;
  value: FieldValue | undefined;
  onChange: (value: FieldValue) => void;
}

function FieldInput({ field, value, onChange }: FieldInputProps) {
  switch (field.type) {
    case 'number': {
      const numVal = value?.type === 'number' ? value.value : 0;
      const settings = field.settings as NumberFieldSettings | undefined;
      if (settings?.sliderEnabled && settings.min != null && settings.max != null) {
        return (
          <input
            type="range"
            className={styles.slider}
            min={settings.min}
            max={settings.max}
            value={numVal}
            onChange={(e) => onChange({ type: 'number', value: Number(e.target.value) })}
          />
        );
      }
      return (
        <NumberInput value={numVal} onChange={(v) => onChange({ type: 'number', value: v })} />
      );
    }

    case 'bubbles': {
      const filled = value?.type === 'bubbles' ? value.filled : 0;
      const count = (field.settings as BubblesFieldSettings)?.count ?? 5;
      return (
        <div className={styles.bubbles}>
          {Array.from({ length: count }, (_, i) => (
            <button
              key={i}
              className={`${styles.bubble} ${i < filled ? styles.bubbleFilled : ''}`}
              onClick={() => onChange({ type: 'bubbles', filled: i < filled ? i : i + 1 })}
            />
          ))}
        </div>
      );
    }

    case 'text-field': {
      const textVal = value?.type === 'text-field' ? value.value : '';
      return (
        <input
          type="text"
          className={styles.textInput}
          value={textVal}
          onChange={(e) => onChange({ type: 'text-field', value: e.target.value })}
        />
      );
    }

    case 'text-box': {
      const boxVal = value?.type === 'text-box' ? value.value : '';
      return (
        <textarea
          className={styles.textBox}
          value={boxVal}
          onChange={(e) => onChange({ type: 'text-box', value: e.target.value })}
        />
      );
    }

    case 'radio': {
      const selected = value?.type === 'radio' ? value.selected : '';
      const options = (field.settings as RadioFieldSettings)?.options ?? [];
      return (
        <div className={styles.radioGroup}>
          {options.map((opt) => (
            <label key={opt} className={styles.radioLabel}>
              <input
                type="radio"
                name={`${field.id}-radio`}
                value={opt}
                checked={selected === opt}
                onChange={() => onChange({ type: 'radio', selected: opt })}
              />
              {opt}
            </label>
          ))}
        </div>
      );
    }

    case 'checkbox': {
      const checked = value?.type === 'checkbox' ? value.checked : false;
      return (
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={checked}
          onChange={(e) => onChange({ type: 'checkbox', checked: e.target.checked })}
        />
      );
    }

    default:
      return null;
  }
}
