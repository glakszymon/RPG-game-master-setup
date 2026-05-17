/*
 * CreatureForm — two-column form for editing a creature template.
 * Layout: sticky header (name, avatar, alignment, CR) + two columns (left: numbers, right: text/actions).
 * Renders fields dynamically from FieldStructure with column assignment via SectionDefinition.column.
 */

import { useCallback, useMemo, useState } from 'react';
import { FieldInput } from '../../../components/dynamic-fields';
import { getXpFromCr, getProficiencyBonus, formatXp } from '../crUtilities';
import type { FieldStructure, FieldValue, FieldDefinition, SectionDefinition } from '../../../components/dynamic-fields';
import styles from '../Bestiary.module.css';

interface CreatureFormProps {
  name: string;
  avatarPath: string | null;
  fieldValues: Record<string, FieldValue>;
  structure: FieldStructure;
  onNameChange: (name: string) => void;
  onFieldChange: (fieldId: string, value: FieldValue) => void;
  onAvatarUpload: () => void;
  onDelete: () => void;
}

export function CreatureForm({
  name,
  avatarPath,
  fieldValues,
  structure,
  onNameChange,
  onFieldChange,
  onAvatarUpload,
  onDelete,
}: CreatureFormProps) {
  const { headerSections, leftSections, rightSections } = useMemo(() => {
    const sections = [...(structure.sections ?? [])];
    const header: SectionDefinition[] = [];
    const left: SectionDefinition[] = [];
    const right: SectionDefinition[] = [];

    for (const s of sections) {
      if (s.column === 'header') header.push(s);
      else if (s.column === 'right') right.push(s);
      else left.push(s); // default to left
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
    // Sort fields within each section
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

  // Header fields (from header sections)
  const headerFields = useMemo(() =>
    headerSections.flatMap(s => fieldsBySection[s.id] ?? []),
    [headerSections, fieldsBySection]
  );

  return (
    <div className={styles.creatureFormRoot}>
      {/* ── Sticky Header ── */}
      <div className={styles.formStickyHeader}>
        <div className={styles.avatarPreview} onClick={onAvatarUpload} style={{ cursor: 'pointer' }}>
          {avatarPath ? (
            <img src={avatarPath} alt={name} />
          ) : (
            <span className={styles.icon}>category</span>
          )}
        </div>
        <div className={styles.formHeaderContent}>
          <input
            className={styles.formInput}
            style={{ width: '100%', fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)' }}
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Creature name"
          />
          <div className={styles.formHeaderFields}>
            {headerFields.map(field => (
              <DynamicField
                key={field.id}
                field={field}
                value={fieldValues[field.id] ?? null}
                onChange={onFieldChange}
              />
            ))}
            {/* CR-derived info */}
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
        <button className={styles.deleteBtn} onClick={onDelete}>
          <span className={styles.iconSm}>delete</span> Delete Creature
        </button>
      </div>
    </div>
  );
}

/* ── Section accent colors by ID ── */
const SECTION_ACCENTS: Record<string, string> = {
  combat: '#f87171',      // red
  abilities: '#60a5fa',   // blue
  skills: '#a78bfa',      // purple
  defenses: '#4ade80',    // green
  senses: '#fbbf24',      // amber
  info: '#9ca3af',        // gray
  traits: '#c9b06b',      // gold
  actions: '#f87171',     // red
  bonus_actions: '#fb923c', // orange
  reactions: '#38bdf8',   // sky
  legendary: '#e879f9',   // fuchsia
};

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
