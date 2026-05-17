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
  SelectFieldSettings,
  SpeedListFieldSettings,
  SkillListFieldSettings,
  AbilityScores,
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
    case 'select':
      return <SelectField field={field} value={value} onChange={onChange} />;
    case 'speed-list':
      return <SpeedListField field={field} value={value} onChange={onChange} />;
    case 'skill-list':
      return <SkillListField field={field} value={value} onChange={onChange} />;
    case 'item-list':
      return <ItemListField value={value} onChange={onChange} />;
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

/* ── SignedNumberInput (displays +/- prefix when not editing) ── */

function SignedNumberInput({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(String(value));

  const formatSigned = (v: number) => v >= 0 ? `+${v}` : `${v}`;

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    setEditing(true);
    setText(String(value));
    e.target.select();
  };

  const handleBlur = () => {
    setEditing(false);
    // Support "+1", "-1", "1" → parse correctly
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
      value={editing ? text : formatSigned(value)}
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
  const predefinedOptions = useMemo(() =>
    (field.settings as TagListFieldSettings | undefined)?.predefinedOptions ?? [],
    [field.settings]
  );

  const availableOptions = useMemo(() =>
    predefinedOptions.filter((opt) => !tags.includes(opt)),
    [predefinedOptions, tags]
  );

  const addTag = useCallback((tag?: string) => {
    const trimmed = (tag ?? input).trim();
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
      {predefinedOptions.length > 0 ? (
        <div className={styles.tagAddRow}>
          {availableOptions.length > 0 && (
            <select
              className={styles.speedAddSelect}
              value=""
              onChange={(e) => { if (e.target.value) addTag(e.target.value); }}
            >
              <option value="">+ Pick...</option>
              {availableOptions.map((opt) => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          )}
          <input
            className={styles.tagInput}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => addTag()}
            placeholder="Custom..."
          />
        </div>
      ) : (
        <input
          className={styles.tagInput}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => addTag()}
          placeholder="+"
        />
      )}
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

function StatBlockField({ value, onChange }: Pick<FieldInputProps, 'value' | 'onChange'>) {
  const scores = useMemo(() => {
    const DEFAULT_SCORES: AbilityScores = { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
    return value?.type === 'stat-block' && value.scores?.str != null ? value.scores : DEFAULT_SCORES;
  }, [value]);
  const modifiers = useMemo(() =>
    value?.type === 'stat-block' ? (value.modifiers ?? {}) : {},
    [value]
  );
  const saves = useMemo(() =>
    value?.type === 'stat-block' ? (value.saves ?? {}) : {},
    [value]
  );

  const update = useCallback((
    newScores: AbilityScores,
    newMods: Partial<AbilityScores>,
    newSaves: Partial<AbilityScores>
  ) => {
    onChange({ type: 'stat-block', scores: newScores, modifiers: newMods, saves: newSaves });
  }, [onChange]);

  return (
    <div className={styles.statBlock}>
      <div className={styles.statHeaderRow}>
        <span className={styles.statHeaderLabel}></span>
        <span className={styles.statHeaderCol}>Score</span>
        <span className={styles.statHeaderCol}>MOD</span>
        <span className={styles.statHeaderCol}>SAVE</span>
      </div>
      <div className={styles.statRows}>
        {ABILITY_KEYS.map((key, i) => (
          <div key={key} className={styles.statRow}>
            <span className={styles.statLabel}>{ABILITY_LABELS[i]}</span>
            <NumberInput
              value={scores[key]}
              onChange={(v) => update({ ...scores, [key]: v }, modifiers, saves)}
            />
            <SignedNumberInput
              value={modifiers[key] ?? Math.floor((scores[key] - 10) / 2)}
              onChange={(v) => update(scores, { ...modifiers, [key]: v }, saves)}
            />
            <SignedNumberInput
              value={saves[key] ?? 0}
              onChange={(v) => update(scores, modifiers, { ...saves, [key]: v })}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Select Field ── */

function SelectField({ field, value, onChange }: FieldInputProps) {
  const selected = value?.type === 'select' ? value.selected : '';
  const options = (field.settings as SelectFieldSettings)?.options ?? [];
  return (
    <select
      className={styles.selectInput}
      value={selected}
      onChange={(e) => onChange({ type: 'select', selected: e.target.value })}
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>{opt}</option>
      ))}
    </select>
  );
}

/* ── Speed List Field ── */

function SpeedListField({ field, value, onChange }: FieldInputProps) {
  const settings = field.settings as SpeedListFieldSettings | undefined;
  const entries = useMemo(() => settings?.entries ?? [], [settings]);
  const allowCustom = settings?.allowCustom ?? false;
  const values = useMemo(() =>
    value?.type === 'speed-list' ? value.values : {},
    [value]
  );

  const visibleKeys = useMemo(() => {
    const always = entries.filter((e) => e.alwaysVisible).map((e) => e.key);
    const active = Object.keys(values).filter((k) => values[k] != null);
    return [...new Set([...always, ...active])];
  }, [entries, values]);

  const availableToAdd = useMemo(() =>
    entries.filter((e) => !visibleKeys.includes(e.key)),
    [entries, visibleKeys]
  );

  const updateValue = useCallback((key: string, val: number) => {
    onChange({ type: 'speed-list', values: { ...values, [key]: val } });
  }, [values, onChange]);

  const addEntry = useCallback((key: string) => {
    onChange({ type: 'speed-list', values: { ...values, [key]: 30 } });
  }, [values, onChange]);

  const removeEntry = useCallback((key: string) => {
    const next = { ...values };
    delete next[key];
    onChange({ type: 'speed-list', values: next });
  }, [values, onChange]);

  const labelFor = useCallback((key: string) =>
    entries.find((e) => e.key === key)?.label ?? key,
    [entries]
  );

  const isAlwaysVisible = useCallback((key: string) =>
    entries.find((e) => e.key === key)?.alwaysVisible ?? false,
    [entries]
  );

  const [customName, setCustomName] = useState('');
  const addCustom = useCallback(() => {
    const key = customName.trim().toLowerCase().replace(/\s+/g, '_');
    if (!key || values[key] != null) return;
    onChange({ type: 'speed-list', values: { ...values, [key]: 30 } });
    setCustomName('');
  }, [customName, values, onChange]);

  return (
    <div className={styles.speedList}>
      {visibleKeys.map((key) => (
        <div key={key} className={styles.speedEntry}>
          <span className={styles.speedLabel}>{labelFor(key)}</span>
          <NumberInput value={values[key] ?? 0} onChange={(v) => updateValue(key, v)} />
          <span className={styles.speedUnit}>ft</span>
          {!isAlwaysVisible(key) && (
            <button className={styles.tagRemove} onClick={() => removeEntry(key)}>&times;</button>
          )}
        </div>
      ))}
      {availableToAdd.length > 0 && (
        <select
          className={styles.speedAddSelect}
          value=""
          onChange={(e) => { if (e.target.value) addEntry(e.target.value); }}
        >
          <option value="">+ Add...</option>
          {availableToAdd.map((e) => (
            <option key={e.key} value={e.key}>{e.label}</option>
          ))}
        </select>
      )}
      {allowCustom && (
        <div className={styles.speedEntry}>
          <input
            className={styles.textInput}
            style={{ minWidth: 70, flex: 1 }}
            placeholder="Custom..."
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
          />
          <button className={styles.tagRemove} onClick={addCustom} style={{ color: 'var(--color-accent)' }}>+</button>
        </div>
      )}
    </div>
  );
}

/* ── Skill List Field ── */

function SkillListField({ field, value, onChange }: FieldInputProps) {
  const options = useMemo(() =>
    (field.settings as SkillListFieldSettings | undefined)?.options ?? [],
    [field.settings]
  );
  const skills = useMemo(() =>
    value?.type === 'skill-list' ? value.skills : [],
    [value]
  );

  const availableOptions = useMemo(() =>
    options.filter((opt) => !skills.some((s) => s.name === opt)),
    [options, skills]
  );

  const addSkill = useCallback((name: string) => {
    onChange({ type: 'skill-list', skills: [...skills, { name, bonus: 0 }] });
  }, [skills, onChange]);

  const updateBonus = useCallback((name: string, bonus: number) => {
    onChange({
      type: 'skill-list',
      skills: skills.map((s) => s.name === name ? { ...s, bonus } : s),
    });
  }, [skills, onChange]);

  const removeSkill = useCallback((name: string) => {
    onChange({ type: 'skill-list', skills: skills.filter((s) => s.name !== name) });
  }, [skills, onChange]);

  return (
    <div className={styles.skillList}>
      {skills.map((skill) => (
        <div key={skill.name} className={styles.skillEntry}>
          <span className={styles.skillName}>{skill.name}</span>
          <NumberInput value={skill.bonus} onChange={(v) => updateBonus(skill.name, v)} />
          <button className={styles.tagRemove} onClick={() => removeSkill(skill.name)}>&times;</button>
        </div>
      ))}
      {availableOptions.length > 0 && (
        <select
          className={styles.speedAddSelect}
          value=""
          onChange={(e) => { if (e.target.value) addSkill(e.target.value); }}
        >
          <option value="">+ Add...</option>
          {availableOptions.map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      )}
    </div>
  );
}

/* ── Item List Field ── */

function ItemListField({ value, onChange }: Pick<FieldInputProps, 'value' | 'onChange'>) {
  const items = useMemo(() =>
    value?.type === 'item-list' ? value.items : [],
    [value]
  );

  const addItem = useCallback(() => {
    onChange({ type: 'item-list', items: [...items, { name: '', quantity: 1 }] });
  }, [items, onChange]);

  const updateItem = useCallback((idx: number, patch: Partial<{ name: string; quantity: number }>) => {
    onChange({
      type: 'item-list',
      items: items.map((item, i) => i === idx ? { ...item, ...patch } : item),
    });
  }, [items, onChange]);

  const removeItem = useCallback((idx: number) => {
    onChange({ type: 'item-list', items: items.filter((_, i) => i !== idx) });
  }, [items, onChange]);

  return (
    <div className={styles.itemList}>
      {items.map((item, idx) => (
        <div key={idx} className={styles.itemEntry}>
          <input
            className={styles.textInput}
            value={item.name}
            onChange={(e) => updateItem(idx, { name: e.target.value })}
            placeholder="Item name"
          />
          <NumberInput value={item.quantity} onChange={(v) => updateItem(idx, { quantity: v })} />
          <button className={styles.tagRemove} onClick={() => removeItem(idx)}>&times;</button>
        </div>
      ))}
      <button className={styles.actionAdd} onClick={addItem}>+ Add</button>
    </div>
  );
}
