/*
 * InstanceForm — full creature editor for a specific instance.
 * Uses the same dynamic field system as CreatureForm (FieldStructure + FieldInput).
 * Pre-filled with resolved data (template fieldValues + overrides merged).
 * Edits are saved as fieldValues overrides on the instance.
 */

import { useCallback, useMemo, useState } from 'react';
import { FieldInput } from '../../../components/dynamic-fields';
import { getXpFromCr, getProficiencyBonus, formatXp } from '../crUtilities';
import type { FieldStructure, FieldValue, FieldDefinition, SectionDefinition } from '../../../components/dynamic-fields';
import type { CreatureInstance } from '../types';
import styles from '../Bestiary.module.css';

interface InstanceFormProps {
  instance: CreatureInstance;
  /** Resolved fieldValues: template values merged with instance overrides */
  fieldValues: Record<string, FieldValue>;
  /** Resolved name (instanceName ?? template name) */
  resolvedName: string;
  /** Resolved avatar path */
  avatarPath: string | null;
  structure: FieldStructure;
  onFieldChange: (fieldId: string, value: FieldValue) => void;
  onNameChange: (name: string) => void;
  onDelete: (id: string) => void;
}

/* ── Section accent colors by ID ── */
const SECTION_ACCENTS: Record<string, string> = {
  combat: '#f87171',
  abilities: '#60a5fa',
  skills: '#a78bfa',
  defenses: '#4ade80',
  senses: '#fbbf24',
  info: '#9ca3af',
  traits: '#c9b06b',
  actions: '#f87171',
  bonus_actions: '#fb923c',
  reactions: '#38bdf8',
  legendary: '#e879f9',
};

export function InstanceForm({
  instance,
  fieldValues,
  resolvedName,
  avatarPath,
  structure,
  onFieldChange,
  onNameChange,
  onDelete,
}: InstanceFormProps) {
  const shortId = instance.id.slice(0, 6);

  const { headerSections, leftSections, rightSections } = useMemo(() => {
    const header: SectionDefinition[] = [];
    const left: SectionDefinition[] = [];
    const right: SectionDefinition[] = [];

    for (const s of structure.sections ?? []) {
      if (s.column === 'header') header.push(s);
      else if (s.column === 'right') right.push(s);
      else left.push(s);
    }

    left.sort((a, b) => a.sortOrder - b.sortOrder);
    right.sort((a, b) => a.sortOrder - b.sortOrder);

    return { headerSections: header, leftSections: left, rightSections: right };
  }, [structure.sections]);

  const fieldsBySection = useMemo(() => {
    const map: Record<string, FieldDefinition[]> = {};
    for (const f of structure.fields) {
      const sid = f.sectionId ?? '_unsectioned';
      if (!map[sid]) map[sid] = [];
      map[sid].push(f);
    }
    for (const key of Object.keys(map)) {
      map[key].sort((a, b) => a.sortOrder - b.sortOrder);
    }
    return map;
  }, [structure.fields]);

  // CR-derived values
  const crValue = fieldValues['cr'];
  const crText = crValue?.type === 'number' ? String(crValue.value) : crValue?.type === 'text-field' ? crValue.value : null;
  const xp = getXpFromCr(crText);
  const pb = getProficiencyBonus(crText);

  // Header fields
  const headerFields = useMemo(() =>
    headerSections.flatMap(s => fieldsBySection[s.id] ?? []),
    [headerSections, fieldsBySection]
  );

  return (
    <div className={styles.creatureFormRoot}>
      {/* ── Sticky Header ── */}
      <div className={styles.formStickyHeader}>
        <div className={styles.avatarPreview}>
          {avatarPath ? (
            <img src={avatarPath} alt={resolvedName} />
          ) : (
            <span className="material-symbols-outlined" style={{ fontSize: '32px', opacity: 0.5 }}>category</span>
          )}
        </div>
        <div className={styles.formHeaderContent}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              className={styles.formInput}
              style={{ flex: 1, fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)' }}
              value={instance.instanceName ?? resolvedName}
              onChange={(e) => onNameChange(e.target.value)}
              placeholder={resolvedName}
            />
            <span className={styles.instanceFormId}>{shortId}</span>
          </div>
          <div className={styles.formHeaderFields}>
            {headerFields.map(field => (
              <DynamicField
                key={field.id}
                field={field}
                value={fieldValues[field.id] ?? null}
                onChange={onFieldChange}
              />
            ))}
            {crText && (
              <span className={styles.crDerivedItem}>
                CR {crText} (XP {formatXp(xp ?? 0)}; PB +{pb})
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Two-Column Body ── */}
      <div className={styles.formColumns}>
        <div className={styles.formColumnLeft}>
          {leftSections.map(section => (
            <FormSection
              key={section.id}
              section={section}
              fields={fieldsBySection[section.id] ?? []}
              fieldValues={fieldValues}
              onFieldChange={onFieldChange}
            />
          ))}
        </div>
        <div className={styles.formColumnRight}>
          {rightSections.map(section => (
            <FormSection
              key={section.id}
              section={section}
              fields={fieldsBySection[section.id] ?? []}
              fieldValues={fieldValues}
              onFieldChange={onFieldChange}
            />
          ))}
        </div>
      </div>

      {/* ── Delete ── */}
      <div className={styles.deleteSection}>
        <button className={styles.deleteBtn} onClick={() => onDelete(instance.id)}>
          <span className="material-symbols-outlined" style={{ fontSize: '16px' }}>delete</span> Remove Instance
        </button>
      </div>
    </div>
  );
}

/* ── Form Section (collapsible) ── */

function FormSection({ section, fields, fieldValues, onFieldChange }: {
  section: SectionDefinition;
  fields: FieldDefinition[];
  fieldValues: Record<string, FieldValue>;
  onFieldChange: (fieldId: string, value: FieldValue) => void;
}) {
  const [collapsed, setCollapsed] = useState(false);

  if (fields.length === 0) return null;

  const accent = SECTION_ACCENTS[section.id];

  return (
    <div
      className={styles.formSection}
      style={accent ? { '--section-accent': accent } as React.CSSProperties : undefined}
    >
      <div
        className={styles.formSectionHeader}
        onClick={() => setCollapsed(!collapsed)}
        style={{ cursor: 'pointer', userSelect: 'none' }}
      >
        <span className={styles.formSectionTitle}>{section.title}</span>
        <span className={`${styles.formSectionChevron} ${!collapsed ? styles.formSectionChevronOpen : ''}`}>&#9654;</span>
      </div>
      {!collapsed && (
        <div className={styles.dynamicFieldsGrid}>
          {fields.map(field => (
            <DynamicField
              key={field.id}
              field={field}
              value={fieldValues[field.id] ?? null}
              onChange={onFieldChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Dynamic Field ── */

function DynamicField({ field, value, onChange }: {
  field: FieldDefinition;
  value: FieldValue | null;
  onChange: (fieldId: string, value: FieldValue) => void;
}) {
  const widthStyle = field.width === '1/3' ? '32%'
    : field.width === '1/2' ? '49%'
    : field.width === '2/3' ? '66%'
    : '100%';

  const handleChange = useCallback((newValue: FieldValue) => {
    onChange(field.id, newValue);
  }, [field.id, onChange]);

  return (
    <div className={styles.dynamicField} style={{ width: widthStyle }}>
      <label className={styles.formLabel}>{field.title}</label>
      <FieldInput
        field={field}
        value={value ?? undefined}
        onChange={handleChange}
      />
    </div>
  );
}
