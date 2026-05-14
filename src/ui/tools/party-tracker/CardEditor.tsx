/*
 * CardEditor — modal overlay for editing the card field structure.
 * Two columns: left = live preview, right = field list editor.
 * Shared structure for all characters in a campaign.
 */

import { useState, useCallback } from 'react';
import type {
  CardStructure,
  FieldDefinition,
  FieldType,
  FieldWidth,
  Alignment,
  NumberFieldSettings,
  BubblesFieldSettings,
  RadioFieldSettings,
} from './types';
import styles from './CardEditor.module.css';

interface CardEditorProps {
  structure: CardStructure;
  onSave: (structure: CardStructure) => void;
  onCancel: () => void;
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

function createDefaultField(type: FieldType): FieldDefinition {
  const base: FieldDefinition = {
    id: uid(),
    type,
    title: type.charAt(0).toUpperCase() + type.slice(1).replace('-', ' '),
    width: 'full',
    textAlign: 'left',
    positionAlign: 'left',
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

export function CardEditor({ structure, onSave, onCancel }: CardEditorProps) {
  const [fields, setFields] = useState<FieldDefinition[]>([...structure.fields]);
  const [dragIdx, setDragIdx] = useState<number | null>(null);

  const addField = useCallback((type: FieldType) => {
    setFields((prev) => [...prev, createDefaultField(type)]);
  }, []);

  const removeField = useCallback((id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const updateField = useCallback((id: string, updates: Partial<FieldDefinition>) => {
    setFields((prev) =>
      prev.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    );
  }, []);

  const handleDragStart = useCallback((idx: number) => {
    setDragIdx(idx);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (dragIdx === null || dragIdx === idx) return;
    setFields((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIdx, 1);
      next.splice(idx, 0, moved);
      return next;
    });
    setDragIdx(idx);
  }, [dragIdx]);

  const handleDragEnd = useCallback(() => {
    setDragIdx(null);
  }, []);

  const handleSave = useCallback(() => {
    onSave({ fields });
  }, [fields, onSave]);

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <h2 className={styles.title}>Card Editor</h2>
          <p className={styles.subtitle}>Structure shared for all characters</p>
        </div>

        <div className={styles.columns}>
          {/* Left: Live Preview */}
          <div className={styles.previewCol}>
            <h3 className={styles.colTitle}>Preview</h3>
            <div className={styles.previewCard}>
              <div className={styles.previewPortrait}>Portrait</div>
              <div className={styles.previewName}>Character Name</div>
              <div className={styles.previewFields}>
                {fields.map((field) => {
                  const widthPercent =
                    field.width === '1/3' ? '33.333%' :
                    field.width === '1/2' ? '50%' :
                    field.width === '2/3' ? '66.666%' :
                    '100%';
                  return (
                    <div
                      key={field.id}
                      className={styles.previewField}
                      style={{
                        width: widthPercent,
                        textAlign: field.textAlign,
                      }}
                    >
                      <span className={styles.previewFieldLabel}>{field.title}</span>
                      <span className={styles.previewFieldType}>{field.type}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right: Field Editor */}
          <div className={styles.editorCol}>
            <h3 className={styles.colTitle}>Fields</h3>

            <div className={styles.fieldList}>
              {fields.map((field, idx) => (
                <div
                  key={field.id}
                  className={`${styles.fieldItem} ${dragIdx === idx ? styles.fieldItemDragging : ''}`}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                >
                  <div className={styles.fieldDragHandle}>&#9776;</div>
                  <div className={styles.fieldConfig}>
                    {/* Title */}
                    <input
                      className={styles.fieldTitleInput}
                      value={field.title}
                      onChange={(e) => updateField(field.id, { title: e.target.value })}
                      placeholder="Field title"
                    />

                    {/* Row: width + text-align + position-align */}
                    <div className={styles.fieldRow}>
                      <select
                        className={styles.fieldSelect}
                        value={field.width}
                        onChange={(e) => updateField(field.id, { width: e.target.value as FieldWidth })}
                      >
                        {WIDTH_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>

                      <div className={styles.alignGroup}>
                        <span className={styles.alignLabel}>Text:</span>
                        {ALIGN_OPTIONS.map((a) => (
                          <button
                            key={a.value}
                            className={`${styles.alignBtn} ${field.textAlign === a.value ? styles.alignActive : ''}`}
                            onClick={() => updateField(field.id, { textAlign: a.value })}
                          >
                            {a.label}
                          </button>
                        ))}
                      </div>

                      <div className={styles.alignGroup}>
                        <span className={styles.alignLabel}>Pos:</span>
                        {ALIGN_OPTIONS.map((a) => (
                          <button
                            key={a.value}
                            className={`${styles.alignBtn} ${field.positionAlign === a.value ? styles.alignActive : ''}`}
                            onClick={() => updateField(field.id, { positionAlign: a.value })}
                          >
                            {a.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Type-specific settings */}
                    <FieldSettings field={field} onUpdate={updateField} />
                  </div>

                  <button
                    className={styles.fieldRemoveBtn}
                    onClick={() => removeField(field.id)}
                    title="Remove field"
                  >
                    &times;
                  </button>
                </div>
              ))}
            </div>

            {/* Add field buttons */}
            <div className={styles.addFieldRow}>
              {FIELD_TYPES.map((ft) => (
                <button
                  key={ft.value}
                  className={styles.addFieldBtn}
                  onClick={() => addField(ft.value)}
                >
                  + {ft.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className={styles.footer}>
          <button className={styles.cancelBtn} onClick={onCancel}>Cancel</button>
          <button className={styles.saveBtn} onClick={handleSave}>Save</button>
        </div>
      </div>
    </div>
  );
}

/* ─── Type-specific field settings ─── */

function FieldSettings({
  field,
  onUpdate,
}: {
  field: FieldDefinition;
  onUpdate: (id: string, updates: Partial<FieldDefinition>) => void;
}) {
  switch (field.type) {
    case 'number': {
      const settings = (field.settings as NumberFieldSettings) ?? { sliderEnabled: false };
      return (
        <div className={styles.typeSettings}>
          <label className={styles.checkLabel}>
            <input
              type="checkbox"
              checked={settings.sliderEnabled}
              onChange={(e) =>
                onUpdate(field.id, {
                  settings: { ...settings, sliderEnabled: e.target.checked },
                })
              }
            />
            Slider
          </label>
          {settings.sliderEnabled && (
            <div className={styles.minMaxRow}>
              <input
                type="number"
                className={styles.minMaxInput}
                placeholder="Min"
                value={settings.min ?? ''}
                onChange={(e) =>
                  onUpdate(field.id, {
                    settings: { ...settings, min: e.target.value ? Number(e.target.value) : undefined },
                  })
                }
              />
              <input
                type="number"
                className={styles.minMaxInput}
                placeholder="Max"
                value={settings.max ?? ''}
                onChange={(e) =>
                  onUpdate(field.id, {
                    settings: { ...settings, max: e.target.value ? Number(e.target.value) : undefined },
                  })
                }
              />
            </div>
          )}
        </div>
      );
    }

    case 'bubbles': {
      const settings = (field.settings as BubblesFieldSettings) ?? { count: 5 };
      return (
        <div className={styles.typeSettings}>
          <label className={styles.checkLabel}>
            Count:
            <input
              type="number"
              className={styles.minMaxInput}
              min={1}
              max={20}
              value={settings.count}
              onChange={(e) =>
                onUpdate(field.id, {
                  settings: { count: Math.max(1, Number(e.target.value)) },
                })
              }
            />
          </label>
        </div>
      );
    }

    case 'radio': {
      const settings = (field.settings as RadioFieldSettings) ?? { options: [] };
      return (
        <div className={styles.typeSettings}>
          <span className={styles.checkLabel}>Options:</span>
          {settings.options.map((opt, i) => (
            <div key={i} className={styles.radioOptionRow}>
              <input
                type="text"
                className={styles.radioOptionInput}
                value={opt}
                onChange={(e) => {
                  const newOpts = [...settings.options];
                  newOpts[i] = e.target.value;
                  onUpdate(field.id, { settings: { options: newOpts } });
                }}
              />
              <button
                className={styles.radioOptionRemove}
                onClick={() => {
                  const newOpts = settings.options.filter((_, j) => j !== i);
                  onUpdate(field.id, { settings: { options: newOpts } });
                }}
              >
                &times;
              </button>
            </div>
          ))}
          <button
            className={styles.addFieldBtn}
            onClick={() =>
              onUpdate(field.id, {
                settings: { options: [...settings.options, `Option ${settings.options.length + 1}`] },
              })
            }
          >
            + Option
          </button>
        </div>
      );
    }

    default:
      return null;
  }
}
