/*
 * PartyTrackerSettingsTab — card size + inline card structure editor
 * styled like CreatureFormTab (sections with expandable field lists).
 */

import { useState, useCallback } from 'react';
import styles from './CampaignSettings.module.css';
import cfStyles from './CreatureFormTab.module.css';
import type {
  PartyTrackerState,
  CardSizePreset,
  CardStructure,
  FieldDefinition,
  FieldType,
  FieldWidth,
  Alignment,
  NumberFieldSettings,
  BubblesFieldSettings,
  RadioFieldSettings,
} from '../../tools/party-tracker/types';
import { DEFAULT_CARD_STRUCTURE } from '../../tools/party-tracker/types';

interface PartyTrackerSettingsTabProps {
  partyState: PartyTrackerState | undefined;
  onPartyStateChange: (state: PartyTrackerState) => void;
}

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'number', label: 'Number' },
  { value: 'bubbles', label: 'Bubbles' },
  { value: 'text-field', label: 'Text Field' },
  { value: 'text-box', label: 'Text Box' },
  { value: 'radio', label: 'Radio' },
  { value: 'checkbox', label: 'Checkbox' },
];

const WIDTH_OPTIONS: { value: FieldWidth; label: string }[] = [
  { value: '1/3', label: '1/3' },
  { value: '1/2', label: '1/2' },
  { value: '2/3', label: '2/3' },
  { value: 'full', label: 'Full' },
];

const ALIGN_OPTIONS: { value: Alignment; label: string }[] = [
  { value: 'left', label: 'L' },
  { value: 'center', label: 'C' },
  { value: 'right', label: 'R' },
];

function uid(): string {
  return crypto.randomUUID();
}

function createDefaultField(type: FieldType, sortOrder: number): FieldDefinition {
  const base: FieldDefinition = {
    id: uid(),
    type,
    title: type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' '),
    width: 'full',
    textAlign: 'left',
    positionAlign: 'left',
    sortOrder,
  };

  switch (type) {
    case 'number':
      base.settings = { sliderEnabled: false } as NumberFieldSettings;
      break;
    case 'bubbles':
      base.settings = { count: 5 } as BubblesFieldSettings;
      break;
    case 'radio':
      base.settings = { options: ['Option 1', 'Option 2'] } as RadioFieldSettings;
      break;
  }

  return base;
}

function PartyTrackerSettingsTab({ partyState, onPartyStateChange }: PartyTrackerSettingsTabProps) {
  const cardSize: CardSizePreset = partyState?.cardSize ?? 'M';
  const cardStructure: CardStructure = partyState?.cardStructure ?? DEFAULT_CARD_STRUCTURE;

  const [fields, setFields] = useState<FieldDefinition[]>([...cardStructure.fields]);
  const [editingField, setEditingField] = useState<string | null>(null);

  const updateState = useCallback(
    (updates: Partial<PartyTrackerState>) => {
      onPartyStateChange({
        cardSize: partyState?.cardSize ?? 'M',
        characters: partyState?.characters ?? [],
        cardStructure: partyState?.cardStructure ?? DEFAULT_CARD_STRUCTURE,
        ...updates,
      });
    },
    [partyState, onPartyStateChange],
  );

  const setCardSize = useCallback(
    (size: CardSizePreset) => updateState({ cardSize: size }),
    [updateState],
  );

  // Persist fields to state
  const saveFields = useCallback((updated: FieldDefinition[]) => {
    setFields(updated);
    updateState({ cardStructure: { fields: updated } });
  }, [updateState]);

  const addField = useCallback((type: FieldType) => {
    const maxSort = fields.reduce((m, f) => Math.max(m, f.sortOrder), -1);
    saveFields([...fields, createDefaultField(type, maxSort + 1)]);
  }, [fields, saveFields]);

  const removeField = useCallback((id: string) => {
    saveFields(fields.filter((f) => f.id !== id));
    if (editingField === id) setEditingField(null);
  }, [fields, saveFields, editingField]);

  const updateField = useCallback((id: string, updates: Partial<FieldDefinition>) => {
    const updated = fields.map((f) => (f.id === id ? { ...f, ...updates } : f));
    saveFields(updated);
  }, [fields, saveFields]);

  const moveField = useCallback((id: string, direction: -1 | 1) => {
    const sorted = [...fields].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex((f) => f.id === id);
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;

    const updated = sorted.map((f, i) => {
      if (i === idx) return { ...f, sortOrder: targetIdx };
      if (i === targetIdx) return { ...f, sortOrder: idx };
      return f;
    });
    saveFields(updated);
  }, [fields, saveFields]);

  const resetToDefaults = useCallback(() => {
    saveFields([...DEFAULT_CARD_STRUCTURE.fields]);
  }, [saveFields]);

  const sortedFields = [...fields].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className={cfStyles.container}>
      {/* Builder Panel (left) */}
      <div className={cfStyles.builderPanel}>
        <div className={cfStyles.builderHeader}>
          <h3 className={cfStyles.title}>Card Structure Editor</h3>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className={cfStyles.resetBtn} onClick={resetToDefaults} title="Reset to defaults">
              <span className="material-symbols-outlined">restart_alt</span>
            </button>
          </div>
        </div>

        {/* Card Size */}
        <fieldset className={styles.fieldset} style={{ margin: '0 0 12px' }}>
          <legend className={styles.legend}>Card Size</legend>
          <div className={styles.iconGrid}>
            {(['S', 'M', 'L'] as CardSizePreset[]).map((size) => (
              <button
                key={size}
                type="button"
                className={`${styles.iconBtn} ${cardSize === size ? styles.iconBtnActive : ''}`}
                onClick={() => setCardSize(size)}
              >
                {size}
              </button>
            ))}
          </div>
        </fieldset>

        {/* Field list */}
        <div className={cfStyles.sectionList}>
          <div className={cfStyles.section}>
            <div className={cfStyles.fieldList}>
              {sortedFields.map((field, fIdx) => (
                <div key={field.id} className={cfStyles.fieldRow}>
                  <div className={cfStyles.fieldLeft}>
                    <button
                      className={cfStyles.toggleBtnSmall}
                      onClick={() => setEditingField(editingField === field.id ? null : field.id)}
                      title="Configure field"
                    >
                      <span className="material-symbols-outlined">
                        {editingField === field.id ? 'expand_less' : 'settings'}
                      </span>
                    </button>
                    <span className={cfStyles.fieldTypeBadge}>{field.type}</span>
                    <span className={cfStyles.fieldLabel}>{field.title}</span>
                  </div>
                  <div className={cfStyles.fieldRight}>
                    <button className={cfStyles.arrowBtnSmall} onClick={() => moveField(field.id, -1)} disabled={fIdx === 0}>
                      <span className="material-symbols-outlined">keyboard_arrow_up</span>
                    </button>
                    <button className={cfStyles.arrowBtnSmall} onClick={() => moveField(field.id, 1)} disabled={fIdx === sortedFields.length - 1}>
                      <span className="material-symbols-outlined">keyboard_arrow_down</span>
                    </button>
                    <button className={cfStyles.arrowBtnSmall} onClick={() => removeField(field.id)} title="Remove field">
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                  {editingField === field.id && (
                    <FieldConfigPanel field={field} onUpdate={updateField} />
                  )}
                </div>
              ))}

              {/* Add field dropdown */}
              <AddFieldRow onAdd={addField} />
            </div>
          </div>
        </div>
      </div>

      {/* Preview Panel (right) */}
      <div className={cfStyles.previewPanel}>
        <div className={cfStyles.previewHeader}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>visibility</span>
          <span className={cfStyles.previewTitle}>Preview</span>
        </div>
        <div className={cfStyles.previewBody}>
          <CardPreview fields={sortedFields} />
        </div>
      </div>
    </div>
  );
}

/* ── Add Field Row ── */

function AddFieldRow({ onAdd }: { onAdd: (type: FieldType) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cfStyles.addFieldContainer}>
      <button className={cfStyles.addFieldToggle} onClick={() => setOpen(!open)}>
        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
        Add field
      </button>
      {open && (
        <div className={cfStyles.addFieldMenu}>
          {FIELD_TYPES.map((ft) => (
            <button
              key={ft.value}
              className={cfStyles.addFieldOption}
              onClick={() => { onAdd(ft.value); setOpen(false); }}
            >
              {ft.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Field Config Panel ── */

function FieldConfigPanel({ field, onUpdate }: { field: FieldDefinition; onUpdate: (id: string, updates: Partial<FieldDefinition>) => void }) {
  return (
    <div className={cfStyles.fieldConfigPanel}>
      <div className={cfStyles.configRow}>
        <label className={cfStyles.configLabel}>Title</label>
        <input
          className={cfStyles.configInput}
          value={field.title}
          onChange={(e) => onUpdate(field.id, { title: e.target.value })}
        />
      </div>

      <div className={cfStyles.configRow}>
        <label className={cfStyles.configLabel}>Width</label>
        <select
          className={cfStyles.configSelect}
          value={field.width}
          onChange={(e) => onUpdate(field.id, { width: e.target.value as FieldWidth })}
        >
          {WIDTH_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <label className={cfStyles.configLabel}>Txt</label>
        <div className={cfStyles.alignGroup}>
          {ALIGN_OPTIONS.map((a) => (
            <button
              key={a.value}
              className={`${cfStyles.alignBtn} ${field.textAlign === a.value ? cfStyles.alignActive : ''}`}
              onClick={() => onUpdate(field.id, { textAlign: a.value })}
            >
              {a.label}
            </button>
          ))}
        </div>

        <label className={cfStyles.configLabel}>Pos</label>
        <div className={cfStyles.alignGroup}>
          {ALIGN_OPTIONS.map((a) => (
            <button
              key={a.value}
              className={`${cfStyles.alignBtn} ${field.positionAlign === a.value ? cfStyles.alignActive : ''}`}
              onClick={() => onUpdate(field.id, { positionAlign: a.value })}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      <FieldTypeSettings field={field} onUpdate={onUpdate} />
    </div>
  );
}

/* ── Type-specific settings ── */

function FieldTypeSettings({ field, onUpdate }: { field: FieldDefinition; onUpdate: (id: string, updates: Partial<FieldDefinition>) => void }) {
  switch (field.type) {
    case 'number': {
      const settings = (field.settings as NumberFieldSettings) ?? { sliderEnabled: false };
      return (
        <div className={cfStyles.configRow}>
          <label className={cfStyles.checkLabel}>
            <input type="checkbox" checked={settings.sliderEnabled} onChange={(e) =>
              onUpdate(field.id, { settings: { ...settings, sliderEnabled: e.target.checked } })
            } />
            Slider
          </label>
          {settings.sliderEnabled && (
            <>
              <input type="number" className={cfStyles.configInputSmall} placeholder="Min" value={settings.min ?? ''} onChange={(e) =>
                onUpdate(field.id, { settings: { ...settings, min: e.target.value ? Number(e.target.value) : undefined } })
              } />
              <input type="number" className={cfStyles.configInputSmall} placeholder="Max" value={settings.max ?? ''} onChange={(e) =>
                onUpdate(field.id, { settings: { ...settings, max: e.target.value ? Number(e.target.value) : undefined } })
              } />
            </>
          )}
        </div>
      );
    }
    case 'bubbles': {
      const settings = (field.settings as BubblesFieldSettings) ?? { count: 5 };
      return (
        <div className={cfStyles.configRow}>
          <label className={cfStyles.configLabel}>Count</label>
          <input type="number" className={cfStyles.configInputSmall} min={1} max={20} value={settings.count} onChange={(e) =>
            onUpdate(field.id, { settings: { count: Math.max(1, Number(e.target.value)) } })
          } />
        </div>
      );
    }
    case 'radio': {
      const settings = (field.settings as RadioFieldSettings) ?? { options: [] };
      return (
        <div className={cfStyles.configColumn}>
          <span className={cfStyles.configLabel}>Options:</span>
          {settings.options.map((opt, i) => (
            <div key={i} className={cfStyles.optionRow}>
              <input className={cfStyles.configInput} value={opt} onChange={(e) => {
                const newOpts = [...settings.options];
                newOpts[i] = e.target.value;
                onUpdate(field.id, { settings: { options: newOpts } });
              }} />
              <button className={cfStyles.arrowBtnSmall} onClick={() => {
                onUpdate(field.id, { settings: { options: settings.options.filter((_, j) => j !== i) } });
              }}><span className="material-symbols-outlined">close</span></button>
            </div>
          ))}
          <button className={cfStyles.addFieldToggle} onClick={() =>
            onUpdate(field.id, { settings: { options: [...settings.options, `Option ${settings.options.length + 1}`] } })
          }>+ Option</button>
        </div>
      );
    }
    default:
      return null;
  }
}

/* ── Card Preview ── */

function CardPreview({ fields }: { fields: FieldDefinition[] }) {
  return (
    <div className={cfStyles.preview}>
      <div className={cfStyles.pvAvatarRow}>
        <div className={cfStyles.pvAvatar}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--color-text-muted)' }}>person</span>
        </div>
        <div className={cfStyles.pvNameInput}>Character Name</div>
      </div>

      <div className={cfStyles.pvFieldsGrid}>
        {fields.map((field) => {
          const width = field.width === '1/3' ? '32%'
            : field.width === '1/2' ? '49%'
            : field.width === '2/3' ? '66%'
            : '100%';

          return (
            <div key={field.id} className={cfStyles.pvField} style={{ width }}>
              <span className={cfStyles.pvFieldLabel}>{field.title}</span>
              <FieldMock type={field.type} settings={field.settings} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FieldMock({ type, settings }: { type: string; settings?: unknown }) {
  switch (type) {
    case 'text-field':
    case 'number':
      return <div className={cfStyles.pvInput} />;
    case 'text-box':
      return <div className={cfStyles.pvTextarea} />;
    case 'bubbles': {
      const count = (settings as BubblesFieldSettings)?.count ?? 5;
      return (
        <div className={cfStyles.pvBubbles}>
          {Array.from({ length: count }).map((_, i) => (
            <div key={i} className={cfStyles.pvBubble} />
          ))}
        </div>
      );
    }
    case 'radio':
      return (
        <div className={cfStyles.pvRadioRow}>
          <div className={cfStyles.pvRadioDot} />
          <div className={cfStyles.pvRadioDot} />
        </div>
      );
    case 'checkbox':
      return <div className={cfStyles.pvInput} style={{ width: 16, height: 16 }} />;
    default:
      return <div className={cfStyles.pvInput} />;
  }
}

export { PartyTrackerSettingsTab };
