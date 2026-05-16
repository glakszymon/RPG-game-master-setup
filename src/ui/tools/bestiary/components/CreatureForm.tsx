/*
 * CreatureForm — dynamic sectioned form for editing a creature template.
 * Renders fields based on CreatureStructure (FieldDefinition + SectionDefinition).
 * Uses shared FieldInput components from dynamic-fields.
 */

import { useState, useCallback, useMemo } from 'react';
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
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (sectionId: string) => {
    setCollapsed(prev => ({ ...prev, [sectionId]: !prev[sectionId] }));
  };

  const sortedSections = useMemo(() =>
    [...(structure.sections ?? [])].sort((a, b) => a.sortOrder - b.sortOrder),
    [structure.sections]
  );

  // CR-derived values
  const crValue = fieldValues['cr'];
  const crText = crValue?.type === 'text-field' ? crValue.value : null;
  const xp = getXpFromCr(crText);
  const pb = getProficiencyBonus(crText);

  return (
    <div>
      {/* ── Avatar + Name ── */}
      <div className={styles.avatarSection}>
        <div className={styles.avatarPreview} onClick={onAvatarUpload} style={{ cursor: 'pointer' }}>
          {avatarPath ? (
            <img src={avatarPath} alt={name} />
          ) : (
            <span className={styles.icon}>category</span>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <input
            className={styles.formInput}
            style={{ width: '100%', fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)' }}
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="Creature name"
          />
        </div>
      </div>

      {/* ── CR-derived info ── */}
      {crText && (
        <div className={styles.crDerived}>
          {xp != null && <span className={styles.crDerivedItem}>XP: {formatXp(xp)}</span>}
          <span className={styles.crDerivedItem}>PB: +{pb}</span>
        </div>
      )}

      {/* ── Dynamic sections ── */}
      {sortedSections.map(section => (
        <DynamicSection
          key={section.id}
          section={section}
          fields={structure.fields.filter(f => f.sectionId === section.id).sort((a, b) => a.sortOrder - b.sortOrder)}
          fieldValues={fieldValues}
          collapsed={!!collapsed[section.id]}
          onToggle={() => toggle(section.id)}
          onFieldChange={onFieldChange}
        />
      ))}

      {/* ── Delete ── */}
      <div className={styles.deleteSection}>
        <button className={styles.deleteBtn} onClick={onDelete}>
          <span className={styles.iconSm}>delete</span> Delete Creature
        </button>
      </div>
    </div>
  );
}

/* ── Dynamic Section ── */

function DynamicSection({ section, fields, fieldValues, collapsed, onToggle, onFieldChange }: {
  section: SectionDefinition;
  fields: FieldDefinition[];
  fieldValues: Record<string, FieldValue>;
  collapsed: boolean;
  onToggle: () => void;
  onFieldChange: (fieldId: string, value: FieldValue) => void;
}) {
  if (fields.length === 0) return null;

  return (
    <div className={styles.formSection}>
      <div className={styles.formSectionHeader} onClick={onToggle}>
        <span className={styles.formSectionTitle}>{section.title}</span>
        <span className={`${styles.formSectionChevron} ${!collapsed ? styles.formSectionChevronOpen : ''}`}>
          <span className={styles.iconSm}>chevron_right</span>
        </span>
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
