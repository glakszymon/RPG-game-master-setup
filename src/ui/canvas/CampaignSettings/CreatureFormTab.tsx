/*
 * CreatureFormTab — Structure Editor for bestiary creature fields.
 * Allows adding/removing/reordering sections and fields within sections.
 * Uses useCreatureStructure hook (campaign_settings persistence).
 */

import { useState, useCallback } from 'react';
import { useCreatureStructure } from '../../tools/bestiary/hooks/useCreatureStructure';
import { DEFAULT_CREATURE_STRUCTURE } from '../../tools/bestiary/defaultCreatureStructure';
import type {
  FieldStructure,
  FieldDefinition,
  FieldType,
  FieldWidth,
  Alignment,
  SectionDefinition,
  NumberFieldSettings,
  BubblesFieldSettings,
  RadioFieldSettings,
  TagListFieldSettings,
  ActionListFieldSettings,
} from '../../components/dynamic-fields';
import styles from './CreatureFormTab.module.css';

interface CreatureFormTabProps {
  campaignId: string;
}

const FIELD_TYPES: { value: FieldType; label: string }[] = [
  { value: 'number', label: 'Number' },
  { value: 'bubbles', label: 'Bubbles' },
  { value: 'text-field', label: 'Text Field' },
  { value: 'text-box', label: 'Text Box' },
  { value: 'radio', label: 'Radio' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'action-list', label: 'Action List' },
  { value: 'tag-list', label: 'Tag List' },
  { value: 'stat-block', label: 'Stat Block' },
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

function createDefaultField(type: FieldType, sectionId: string, sortOrder: number): FieldDefinition {
  const base: FieldDefinition = {
    id: uid(),
    type,
    title: type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, ' '),
    sectionId,
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
    case 'tag-list':
      base.settings = { predefinedOptions: [] } as TagListFieldSettings;
      break;
    case 'action-list':
      base.settings = { showCombatFields: true } as ActionListFieldSettings;
      break;
  }

  return base;
}

export function CreatureFormTab({ campaignId }: CreatureFormTabProps) {
  const { structure, setStructure, loading } = useCreatureStructure(campaignId);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [editingField, setEditingField] = useState<string | null>(null);

  const toggleExpanded = useCallback((sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  }, []);

  const resetToDefaults = useCallback(() => {
    setStructure(DEFAULT_CREATURE_STRUCTURE);
  }, [setStructure]);

  /* ── Section operations ── */

  const addSection = useCallback(() => {
    const sections = structure.sections ?? [];
    const newSection: SectionDefinition = {
      id: uid(),
      title: 'New Section',
      sortOrder: sections.length,
    };
    setStructure({ ...structure, sections: [...sections, newSection] });
  }, [structure, setStructure]);

  const removeSection = useCallback((sectionId: string) => {
    const sections = (structure.sections ?? []).filter(s => s.id !== sectionId);
    // Fields in removed section become orphaned (kept in structure.fields but won't render)
    const fields = structure.fields.filter(f => f.sectionId !== sectionId);
    setStructure({ ...structure, sections, fields });
  }, [structure, setStructure]);

  const renameSection = useCallback((sectionId: string, title: string) => {
    const sections = (structure.sections ?? []).map(s =>
      s.id === sectionId ? { ...s, title } : s
    );
    setStructure({ ...structure, sections });
  }, [structure, setStructure]);

  const moveSection = useCallback((sectionId: string, direction: -1 | 1) => {
    const sorted = [...(structure.sections ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sorted.findIndex(s => s.id === sectionId);
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= sorted.length) return;

    const updated = sorted.map((s, i) => {
      if (i === idx) return { ...s, sortOrder: targetIdx };
      if (i === targetIdx) return { ...s, sortOrder: idx };
      return s;
    });
    setStructure({ ...structure, sections: updated });
  }, [structure, setStructure]);

  /* ── Field operations ── */

  const addField = useCallback((sectionId: string, type: FieldType) => {
    const fieldsInSection = structure.fields.filter(f => f.sectionId === sectionId);
    const maxSort = fieldsInSection.reduce((m, f) => Math.max(m, f.sortOrder), -1);
    const newField = createDefaultField(type, sectionId, maxSort + 1);
    setStructure({ ...structure, fields: [...structure.fields, newField] });
  }, [structure, setStructure]);

  const removeField = useCallback((fieldId: string) => {
    setStructure({ ...structure, fields: structure.fields.filter(f => f.id !== fieldId) });
    if (editingField === fieldId) setEditingField(null);
  }, [structure, setStructure, editingField]);

  const updateField = useCallback((fieldId: string, updates: Partial<FieldDefinition>) => {
    setStructure({
      ...structure,
      fields: structure.fields.map(f => f.id === fieldId ? { ...f, ...updates } : f),
    });
  }, [structure, setStructure]);

  const moveField = useCallback((fieldId: string, direction: -1 | 1) => {
    const field = structure.fields.find(f => f.id === fieldId);
    if (!field) return;
    const sectionFields = structure.fields
      .filter(f => f.sectionId === field.sectionId)
      .sort((a, b) => a.sortOrder - b.sortOrder);
    const idx = sectionFields.findIndex(f => f.id === fieldId);
    const targetIdx = idx + direction;
    if (targetIdx < 0 || targetIdx >= sectionFields.length) return;

    const swapId = sectionFields[targetIdx].id;
    const swapSort = sectionFields[targetIdx].sortOrder;
    const currentSort = field.sortOrder;

    setStructure({
      ...structure,
      fields: structure.fields.map(f => {
        if (f.id === fieldId) return { ...f, sortOrder: swapSort };
        if (f.id === swapId) return { ...f, sortOrder: currentSort };
        return f;
      }),
    });
  }, [structure, setStructure]);

  if (loading) {
    return <div className={styles.loading}>Loading configuration...</div>;
  }

  const sortedSections = [...(structure.sections ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className={styles.container}>
      {/* ── Builder Panel ── */}
      <div className={styles.builderPanel}>
        <div className={styles.builderHeader}>
          <h3 className={styles.title}>Creature Structure Editor</h3>
          <div style={{ display: 'flex', gap: '4px' }}>
            <button className={styles.resetBtn} onClick={addSection} title="Add section">
              <span className="material-symbols-outlined">add</span>
            </button>
            <button className={styles.resetBtn} onClick={resetToDefaults} title="Reset to D&D 2024 defaults">
              <span className="material-symbols-outlined">restart_alt</span>
            </button>
          </div>
        </div>

        <div className={styles.sectionList}>
          {sortedSections.map((section, sIdx) => {
            const sectionFields = structure.fields
              .filter(f => f.sectionId === section.id)
              .sort((a, b) => a.sortOrder - b.sortOrder);
            const isExpanded = expandedSections.has(section.id);

            return (
              <div key={section.id} className={styles.section}>
                <div className={styles.sectionHeader}>
                  <div className={styles.sectionLeft}>
                    <button
                      className={styles.toggleBtn}
                      onClick={() => toggleExpanded(section.id)}
                      title={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      <span className="material-symbols-outlined">
                        {isExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>
                    <input
                      className={styles.sectionTitleInput}
                      value={section.title}
                      onChange={(e) => renameSection(section.id, e.target.value)}
                    />
                    <span className={styles.fieldCount}>({sectionFields.length})</span>
                  </div>
                  <div className={styles.sectionRight}>
                    <button className={styles.arrowBtn} onClick={() => moveSection(section.id, -1)} disabled={sIdx === 0} title="Move up">
                      <span className="material-symbols-outlined">keyboard_arrow_up</span>
                    </button>
                    <button className={styles.arrowBtn} onClick={() => moveSection(section.id, 1)} disabled={sIdx === sortedSections.length - 1} title="Move down">
                      <span className="material-symbols-outlined">keyboard_arrow_down</span>
                    </button>
                    <button className={styles.arrowBtn} onClick={() => removeSection(section.id)} title="Remove section">
                      <span className="material-symbols-outlined">close</span>
                    </button>
                  </div>
                </div>

                {isExpanded && (
                  <div className={styles.fieldList}>
                    {sectionFields.map((field, fIdx) => (
                      <div key={field.id} className={styles.fieldRow}>
                        <div className={styles.fieldLeft}>
                          <button
                            className={styles.toggleBtnSmall}
                            onClick={() => setEditingField(editingField === field.id ? null : field.id)}
                            title="Configure field"
                          >
                            <span className="material-symbols-outlined">
                              {editingField === field.id ? 'expand_less' : 'settings'}
                            </span>
                          </button>
                          <span className={styles.fieldTypeBadge}>{field.type}</span>
                          <span className={styles.fieldLabel}>{field.title}</span>
                        </div>
                        <div className={styles.fieldRight}>
                          <button className={styles.arrowBtnSmall} onClick={() => moveField(field.id, -1)} disabled={fIdx === 0}>
                            <span className="material-symbols-outlined">keyboard_arrow_up</span>
                          </button>
                          <button className={styles.arrowBtnSmall} onClick={() => moveField(field.id, 1)} disabled={fIdx === sectionFields.length - 1}>
                            <span className="material-symbols-outlined">keyboard_arrow_down</span>
                          </button>
                          <button className={styles.arrowBtnSmall} onClick={() => removeField(field.id)} title="Remove field">
                            <span className="material-symbols-outlined">close</span>
                          </button>
                        </div>
                        {editingField === field.id && (
                          <FieldConfigPanel field={field} onUpdate={updateField} />
                        )}
                      </div>
                    ))}

                    {/* Add field dropdown */}
                    <AddFieldRow sectionId={section.id} onAdd={addField} />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Preview Panel (right) ── */}
      <div className={styles.previewPanel}>
        <div className={styles.previewHeader}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>visibility</span>
          <span className={styles.previewTitle}>Preview</span>
        </div>
        <div className={styles.previewBody}>
          <StructurePreview structure={structure} />
        </div>
      </div>
    </div>
  );
}

/* ── Add Field Row ── */

function AddFieldRow({ sectionId, onAdd }: { sectionId: string; onAdd: (sectionId: string, type: FieldType) => void }) {
  const [open, setOpen] = useState(false);

  return (
    <div className={styles.addFieldContainer}>
      <button className={styles.addFieldToggle} onClick={() => setOpen(!open)}>
        <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>add</span>
        Add field
      </button>
      {open && (
        <div className={styles.addFieldMenu}>
          {FIELD_TYPES.map(ft => (
            <button
              key={ft.value}
              className={styles.addFieldOption}
              onClick={() => { onAdd(sectionId, ft.value); setOpen(false); }}
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
    <div className={styles.fieldConfigPanel}>
      {/* Title */}
      <div className={styles.configRow}>
        <label className={styles.configLabel}>Title</label>
        <input
          className={styles.configInput}
          value={field.title}
          onChange={(e) => onUpdate(field.id, { title: e.target.value })}
        />
      </div>

      {/* Width + Alignment */}
      <div className={styles.configRow}>
        <label className={styles.configLabel}>Width</label>
        <select
          className={styles.configSelect}
          value={field.width}
          onChange={(e) => onUpdate(field.id, { width: e.target.value as FieldWidth })}
        >
          {WIDTH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>

        <label className={styles.configLabel}>Txt</label>
        <div className={styles.alignGroup}>
          {ALIGN_OPTIONS.map(a => (
            <button
              key={a.value}
              className={`${styles.alignBtn} ${field.textAlign === a.value ? styles.alignActive : ''}`}
              onClick={() => onUpdate(field.id, { textAlign: a.value })}
            >
              {a.label}
            </button>
          ))}
        </div>

        <label className={styles.configLabel}>Pos</label>
        <div className={styles.alignGroup}>
          {ALIGN_OPTIONS.map(a => (
            <button
              key={a.value}
              className={`${styles.alignBtn} ${field.positionAlign === a.value ? styles.alignActive : ''}`}
              onClick={() => onUpdate(field.id, { positionAlign: a.value })}
            >
              {a.label}
            </button>
          ))}
        </div>
      </div>

      {/* Type-specific settings */}
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
        <div className={styles.configRow}>
          <label className={styles.checkLabel}>
            <input type="checkbox" checked={settings.sliderEnabled} onChange={(e) =>
              onUpdate(field.id, { settings: { ...settings, sliderEnabled: e.target.checked } })
            } />
            Slider
          </label>
          {settings.sliderEnabled && (
            <>
              <input type="number" className={styles.configInputSmall} placeholder="Min" value={settings.min ?? ''} onChange={(e) =>
                onUpdate(field.id, { settings: { ...settings, min: e.target.value ? Number(e.target.value) : undefined } })
              } />
              <input type="number" className={styles.configInputSmall} placeholder="Max" value={settings.max ?? ''} onChange={(e) =>
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
        <div className={styles.configRow}>
          <label className={styles.configLabel}>Count</label>
          <input type="number" className={styles.configInputSmall} min={1} max={20} value={settings.count} onChange={(e) =>
            onUpdate(field.id, { settings: { count: Math.max(1, Number(e.target.value)) } })
          } />
        </div>
      );
    }
    case 'radio': {
      const settings = (field.settings as RadioFieldSettings) ?? { options: [] };
      return (
        <div className={styles.configColumn}>
          <span className={styles.configLabel}>Options:</span>
          {settings.options.map((opt, i) => (
            <div key={i} className={styles.optionRow}>
              <input className={styles.configInput} value={opt} onChange={(e) => {
                const newOpts = [...settings.options];
                newOpts[i] = e.target.value;
                onUpdate(field.id, { settings: { options: newOpts } });
              }} />
              <button className={styles.arrowBtnSmall} onClick={() => {
                onUpdate(field.id, { settings: { options: settings.options.filter((_, j) => j !== i) } });
              }}><span className="material-symbols-outlined">close</span></button>
            </div>
          ))}
          <button className={styles.addFieldToggle} onClick={() =>
            onUpdate(field.id, { settings: { options: [...settings.options, `Option ${settings.options.length + 1}`] } })
          }>+ Option</button>
        </div>
      );
    }
    case 'tag-list': {
      const settings = (field.settings as TagListFieldSettings) ?? { predefinedOptions: [] };
      const options = settings.predefinedOptions ?? [];
      return (
        <div className={styles.configColumn}>
          <span className={styles.configLabel}>Predefined options (comma-separated):</span>
          <input
            className={styles.configInput}
            value={options.join(', ')}
            onChange={(e) => {
              const newOpts = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
              onUpdate(field.id, { settings: { predefinedOptions: newOpts } });
            }}
          />
        </div>
      );
    }
    case 'action-list': {
      const settings = (field.settings as ActionListFieldSettings) ?? { showCombatFields: true };
      return (
        <div className={styles.configRow}>
          <label className={styles.checkLabel}>
            <input type="checkbox" checked={settings.showCombatFields ?? true} onChange={(e) =>
              onUpdate(field.id, { settings: { showCombatFields: e.target.checked } })
            } />
            Show combat fields (to-hit, damage, reach)
          </label>
        </div>
      );
    }
    default:
      return null;
  }
}

/* ── Structure Preview (1:1 replica of CreatureForm layout) ── */

function StructurePreview({ structure }: { structure: FieldStructure }) {
  const sortedSections = [...(structure.sections ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className={styles.preview}>
      {/* Avatar + Name (always present) */}
      <div className={styles.pvAvatarRow}>
        <div className={styles.pvAvatar}>
          <span className="material-symbols-outlined" style={{ fontSize: '20px', color: 'var(--color-text-muted)' }}>category</span>
        </div>
        <div className={styles.pvNameInput}>Creature Name</div>
      </div>

      {/* CR-derived info mock */}
      <div className={styles.pvCrDerived}>
        <span className={styles.pvCrBadge}>XP: 450</span>
        <span className={styles.pvCrBadge}>PB: +2</span>
      </div>

      {/* Sections */}
      {sortedSections.map(section => {
        const fields = structure.fields
          .filter(f => f.sectionId === section.id)
          .sort((a, b) => a.sortOrder - b.sortOrder);

        if (fields.length === 0) return null;

        return (
          <div key={section.id} className={styles.pvSection}>
            <div className={styles.pvSectionHeader}>
              <span className={styles.pvSectionTitle}>{section.title}</span>
              <span className={styles.pvChevron}>
                <span className="material-symbols-outlined" style={{ fontSize: '14px' }}>chevron_right</span>
              </span>
            </div>
            <div className={styles.pvFieldsGrid}>
              {fields.map(field => {
                const width = field.width === '1/3' ? '32%'
                  : field.width === '1/2' ? '49%'
                  : field.width === '2/3' ? '66%'
                  : '100%';

                return (
                  <div key={field.id} className={styles.pvField} style={{ width }}>
                    <span className={styles.pvFieldLabel}>{field.title}</span>
                    <FieldMock type={field.type} />
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/** Mock field input that mimics the real FieldInput appearance */
function FieldMock({ type }: { type: string }) {
  switch (type) {
    case 'text-field':
    case 'number':
      return <div className={styles.pvInput} />;
    case 'textarea':
      return <div className={styles.pvTextarea} />;
    case 'bubbles':
      return (
        <div className={styles.pvBubbles}>
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className={styles.pvBubble} />
          ))}
        </div>
      );
    case 'radio':
      return (
        <div className={styles.pvRadioRow}>
          <div className={styles.pvRadioDot} />
          <div className={styles.pvRadioDot} />
          <div className={styles.pvRadioDot} />
        </div>
      );
    case 'tag-list':
      return (
        <div className={styles.pvTags}>
          <span className={styles.pvTag}>tag</span>
          <span className={styles.pvTag}>tag</span>
        </div>
      );
    case 'action-list':
      return (
        <div className={styles.pvActionList}>
          <div className={styles.pvActionItem} />
          <div className={styles.pvActionItem} />
        </div>
      );
    case 'stat-block':
      return (
        <div className={styles.pvStatBlock}>
          {['S', 'D', 'C', 'I', 'W', 'Ch'].map(s => (
            <div key={s} className={styles.pvStatCell}>
              <span className={styles.pvStatLabel}>{s}</span>
              <div className={styles.pvStatValue} />
            </div>
          ))}
        </div>
      );
    default:
      return <div className={styles.pvInput} />;
  }
}
