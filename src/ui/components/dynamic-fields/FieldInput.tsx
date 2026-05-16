/*
 * Dynamic Fields — FieldInput component
 *
 * Renders the appropriate input widget for a given field type.
 * Extracted from party-tracker/CharacterCard.tsx for shared use.
 */

import { useState, useCallback, useMemo } from 'react';
import type {
  FieldDefinition,
  FieldValue,
  NumberFieldSettings,
  BubblesFieldSettings,
  RadioFieldSettings,
  ActionEntry,
  ActionListFieldSettings,
  TagListFieldSettings,
} from './types';
import styles from './DynamicFields.module.css';

/* ── Public Props ── */

export interface FieldInputProps {
  field: FieldDefinition;
  value: FieldValue | undefined;
  onChange: (value: FieldValue) => void;
}

/* ── Main Switch ── */

export function FieldInput({ field, value, onChange }: FieldInputProps) {
  switch (field.type) {
    case 'number':
      return <NumberField field={field} value={value} onChange={onChange} />;
    case 'bubbles':
      return <BubblesField field={field} value={value} onChange={onChange} />;
    case 'text-field':
      return <TextField value={value} onChange={onChange} />;
    case 'text-box':
      return <TextBoxField value={value} onChange={onChange} />;
    case 'radio':
      return <RadioField field={field} value={value} onChange={onChange} />;
    case 'checkbox':
      return <CheckboxField value={value} onChange={onChange} />;
    case 'tag-list':
      return <TagListField field={field} value={value} onChange={onChange} />;
    case 'action-list':
      return <ActionListField field={field} value={value} onChange={onChange} />;
    case 'stat-block':
      return <StatBlockField value={value} onChange={onChange} />;
    default:
      return null;
  }
}

/* ── FieldRenderer (label + input wrapper) ── */

export interface FieldRendererProps {
  field: FieldDefinition;
  value: FieldValue | undefined;
  onChange: (value: FieldValue) => void;
}

export function FieldRenderer({ field, value, onChange }: FieldRendererProps) {
  const widthClass = `fieldWidth_${field.width.replace('/', '_')}`;
  const justifyMap = { left: 'flex-start', center: 'center', right: 'flex-end' } as const;

  return (
    <div
      className={`${styles.field} ${styles[widthClass] ?? ''}`}
      style={{ textAlign: field.textAlign }}
    >
      <label className={styles.fieldLabel}>{field.title}</label>
      <div className={styles.fieldValue} style={{ justifyContent: justifyMap[field.positionAlign ?? 'left'] }}>
        <FieldInput field={field} value={value} onChange={onChange} />
      </div>
    </div>
  );
}

/* ── NumberInput (select-all on focus, overwrite behavior) ── */

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
    if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
    if (e.key === 'Escape') { setText(String(value)); setEditing(false); }
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

/* ── Number Field ── */

function NumberField({ field, value, onChange }: FieldInputProps) {
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
  return <NumberInput value={numVal} onChange={(v) => onChange({ type: 'number', value: v })} />;
}

/* ── Bubbles Field ── */

function BubblesField({ field, value, onChange }: FieldInputProps) {
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

/* ── Text Field ── */

function TextField({ value, onChange }: Pick<FieldInputProps, 'value' | 'onChange'>) {
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

/* ── Text Box ── */

function TextBoxField({ value, onChange }: Pick<FieldInputProps, 'value' | 'onChange'>) {
  const boxVal = value?.type === 'text-box' ? value.value : '';
  return (
    <textarea
      className={styles.textBox}
      value={boxVal}
      onChange={(e) => onChange({ type: 'text-box', value: e.target.value })}
    />
  );
}

/* ── Radio Field ── */

function RadioField({ field, value, onChange }: FieldInputProps) {
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

/* ── Checkbox Field ── */

function CheckboxField({ value, onChange }: Pick<FieldInputProps, 'value' | 'onChange'>) {
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

/* ── Tag List Field ── */

function TagListField({ field, value, onChange }: FieldInputProps) {
  const tags = useMemo(() => value?.type === 'tag-list' ? value.tags : [], [value]);
  const [input, setInput] = useState('');
  void (field.settings as TagListFieldSettings | undefined)?.predefinedOptions;

  const addTag = useCallback(() => {
    const trimmed = input.trim();
    if (trimmed && !tags.includes(trimmed)) {
      onChange({ type: 'tag-list', tags: [...tags, trimmed] });
    }
    setInput('');
  }, [input, tags, onChange]);

  const removeTag = useCallback((tag: string) => {
    onChange({ type: 'tag-list', tags: tags.filter((t) => t !== tag) });
  }, [tags, onChange]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag();
    }
    if (e.key === 'Backspace' && !input && tags.length > 0) {
      onChange({ type: 'tag-list', tags: tags.slice(0, -1) });
    }
  };

  return (
    <div className={styles.tagList}>
      {tags.map((tag) => (
        <span key={tag} className={styles.tag}>
          {tag}
          <button className={styles.tagRemove} onClick={() => removeTag(tag)}>&times;</button>
        </span>
      ))}
      <input
        className={styles.tagInput}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
        placeholder="+"
      />
    </div>
  );
}

/* ── Action List Field ── */

function ActionListField({ field, value, onChange }: FieldInputProps) {
  const actions = useMemo(() => value?.type === 'action-list' ? value.actions : [], [value]);
  const showCombat = (field.settings as ActionListFieldSettings)?.showCombatFields ?? true;

  const updateAction = useCallback((id: string, patch: Partial<ActionEntry>) => {
    onChange({
      type: 'action-list',
      actions: actions.map((a) => a.id === id ? { ...a, ...patch } : a),
    });
  }, [actions, onChange]);

  const removeAction = useCallback((id: string) => {
    onChange({ type: 'action-list', actions: actions.filter((a) => a.id !== id) });
  }, [actions, onChange]);

  const addAction = useCallback(() => {
    const newAction: ActionEntry = {
      id: crypto.randomUUID(),
      name: '',
      description: '',
    };
    onChange({ type: 'action-list', actions: [...actions, newAction] });
  }, [actions, onChange]);

  return (
    <div className={styles.actionList}>
      {actions.map((action) => (
        <ActionEntryEditor
          key={action.id}
          action={action}
          showCombat={showCombat}
          onUpdate={(patch) => updateAction(action.id, patch)}
          onRemove={() => removeAction(action.id)}
        />
      ))}
      <button className={styles.actionAdd} onClick={addAction}>+ Add</button>
    </div>
  );
}

/* ── Action Entry Editor ── */

function ActionEntryEditor({
  action,
  showCombat,
  onUpdate,
  onRemove,
}: {
  action: ActionEntry;
  showCombat: boolean;
  onUpdate: (patch: Partial<ActionEntry>) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className={styles.actionEntry}>
      <div className={styles.actionHeader}>
        <input
          className={styles.actionName}
          value={action.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          placeholder="Action name"
        />
        <button className={styles.actionToggle} onClick={() => setExpanded(!expanded)}>
          {expanded ? '▾' : '▸'}
        </button>
        <button className={styles.actionRemove} onClick={onRemove}>&times;</button>
      </div>
      {expanded && (
        <div className={styles.actionBody}>
          <textarea
            className={styles.actionDesc}
            value={action.description}
            onChange={(e) => onUpdate({ description: e.target.value })}
            placeholder="Description..."
          />
          {showCombat && (
            <div className={styles.actionCombatRow}>
              <CombatField label="To Hit" value={action.toHit != null ? String(action.toHit) : ''} onChange={(v) => onUpdate({ toHit: v ? Number(v) : undefined })} />
              <CombatField label="Damage" value={action.damage ?? ''} onChange={(v) => onUpdate({ damage: v || undefined })} />
              <CombatField label="Reach" value={action.reach ?? ''} onChange={(v) => onUpdate({ reach: v || undefined })} />
              <CombatField label="Save DC" value={action.saveDC != null ? String(action.saveDC) : ''} onChange={(v) => onUpdate({ saveDC: v ? Number(v) : undefined })} />
              <CombatField label="Usage" value={action.usageLimit ?? ''} onChange={(v) => onUpdate({ usageLimit: v || undefined })} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CombatField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className={styles.actionCombatField}>
      <span className={styles.actionCombatLabel}>{label}</span>
      <input className={styles.actionCombatInput} value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

/* ── Stat Block Field ── */

const ABILITY_KEYS = ['str', 'dex', 'con', 'int', 'wis', 'cha'] as const;
const ABILITY_LABELS = ['STR', 'DEX', 'CON', 'INT', 'WIS', 'CHA'] as const;

function abilityMod(score: number): string {
  const mod = Math.floor((score - 10) / 2);
  return mod >= 0 ? `+${mod}` : String(mod);
}

function StatBlockField({ value, onChange }: Pick<FieldInputProps, 'value' | 'onChange'>) {
  const DEFAULT_SCORES = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  const raw = value?.type === 'stat-block' ? value.scores : null;
  const scores = useMemo(() => {
    if (!raw || raw.str == null) return DEFAULT_SCORES;
    return raw;
  }, [raw]);
  const saves = useMemo(() =>
    value?.type === 'stat-block' ? value.saves : {},
    [value]
  );

  const updateScore = useCallback((key: typeof ABILITY_KEYS[number], val: number) => {
    onChange({ type: 'stat-block', scores: { ...scores, [key]: val }, saves });
  }, [scores, saves, onChange]);

  return (
    <div className={styles.statBlock}>
      {ABILITY_KEYS.map((key, i) => (
        <div key={key} className={styles.statCell}>
          <span className={styles.statLabel}>{ABILITY_LABELS[i]}</span>
          <input
            className={styles.statScore}
            value={scores[key]}
            onChange={(e) => {
              const n = Number(e.target.value);
              if (!isNaN(n)) updateScore(key, n);
            }}
          />
          <span className={styles.statMod}>{abilityMod(scores[key])}</span>
          {saves[key] != null && <span className={styles.statSave}>Save: {saves[key]! >= 0 ? '+' : ''}{saves[key]}</span>}
        </div>
      ))}
    </div>
  );
}
