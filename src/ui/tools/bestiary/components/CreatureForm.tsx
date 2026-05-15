/*
 * CreatureForm — sectioned scrollable form for editing a creature template.
 * Sections: Basic, Abilities, Actions, Traits, Custom Fields.
 */

import { useState, useCallback } from 'react';
import type { CreatureTemplate, CreatureType, AbilityScores, CreatureAction, CreatureTrait, CustomField } from '../types';
import { CREATURE_TYPE_ICON } from '../types';
import styles from '../Bestiary.module.css';

const CREATURE_TYPES: CreatureType[] = [
  'aberration', 'beast', 'celestial', 'construct', 'dragon',
  'elemental', 'fey', 'fiend', 'giant', 'humanoid',
  'monstrosity', 'ooze', 'plant', 'undead', 'swarm',
];

const ABILITY_KEYS: (keyof AbilityScores)[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

interface CreatureFormProps {
  template: CreatureTemplate;
  onChange: (updated: CreatureTemplate) => void;
  onDelete: () => void;
  onAvatarUpload: () => void;
}

function uid(): string {
  return crypto.randomUUID();
}

export function CreatureForm({ template, onChange, onDelete, onAvatarUpload }: CreatureFormProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (section: string) => {
    setCollapsed(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const patch = useCallback((fields: Partial<CreatureTemplate>) => {
    onChange({ ...template, ...fields, updatedAt: new Date().toISOString() });
  }, [template, onChange]);

  const iconName = template.creatureType ? CREATURE_TYPE_ICON[template.creatureType] : 'category';

  // ── Ability score helpers ──
  const abilities = template.abilityScores ?? { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };
  const setAbility = (key: keyof AbilityScores, val: number) => {
    patch({ abilityScores: { ...abilities, [key]: val } });
  };

  // ── Action helpers ──
  const addAction = () => {
    const action: CreatureAction = { id: uid(), name: '', description: '', toHit: undefined, damage: undefined };
    patch({ actions: [...template.actions, action] });
  };
  const updateAction = (id: string, fields: Partial<CreatureAction>) => {
    patch({ actions: template.actions.map(a => a.id === id ? { ...a, ...fields } : a) });
  };
  const removeAction = (id: string) => {
    patch({ actions: template.actions.filter(a => a.id !== id) });
  };

  // ── Trait helpers ──
  const addTrait = () => {
    const trait: CreatureTrait = { id: uid(), name: '', description: '' };
    patch({ traits: [...template.traits, trait] });
  };
  const updateTrait = (id: string, fields: Partial<CreatureTrait>) => {
    patch({ traits: template.traits.map(t => t.id === id ? { ...t, ...fields } : t) });
  };
  const removeTrait = (id: string) => {
    patch({ traits: template.traits.filter(t => t.id !== id) });
  };

  // ── Custom field helpers ──
  const addCustomField = () => {
    patch({ customFields: [...template.customFields, { key: '', value: '' }] });
  };
  const updateCustomField = (idx: number, fields: Partial<CustomField>) => {
    const next = [...template.customFields];
    next[idx] = { ...next[idx], ...fields };
    patch({ customFields: next });
  };
  const removeCustomField = (idx: number) => {
    patch({ customFields: template.customFields.filter((_, i) => i !== idx) });
  };

  // ── Tag helpers ──
  const [tagInput, setTagInput] = useState('');
  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !template.tags.includes(tag)) {
      patch({ tags: [...template.tags, tag] });
    }
    setTagInput('');
  };
  const removeTag = (tag: string) => {
    patch({ tags: template.tags.filter(t => t !== tag) });
  };

  return (
    <div>
      {/* ── Avatar + Name ── */}
      <div className={styles.avatarSection}>
        <div className={styles.avatarPreview} onClick={onAvatarUpload} style={{ cursor: 'pointer' }}>
          {template.avatarPath ? (
            <img src={template.avatarPath} alt={template.name} />
          ) : (
            <span className={styles.icon}>{iconName}</span>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <input
            className={styles.formInput}
            style={{ width: '100%', fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)' }}
            value={template.name}
            onChange={(e) => patch({ name: e.target.value })}
            placeholder="Creature name"
          />
        </div>
      </div>

      {/* ── Basic Section ── */}
      <Section title="Basic" collapsed={collapsed['basic']} onToggle={() => toggle('basic')}>
        <div className={styles.formRow}>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Type</label>
            <select
              className={styles.formSelect}
              value={template.creatureType ?? ''}
              onChange={(e) => patch({ creatureType: (e.target.value || null) as CreatureType | null })}
            >
              <option value="">— None —</option>
              {CREATURE_TYPES.map(ct => (
                <option key={ct} value={ct}>{ct}</option>
              ))}
            </select>
          </div>
          <div className={styles.formField}>
            <label className={styles.formLabel}>CR</label>
            <input
              className={styles.formInput}
              value={template.cr ?? ''}
              onChange={(e) => patch({ cr: e.target.value || null })}
              placeholder="e.g. 1/4, 5"
            />
          </div>
        </div>
        <div className={styles.formRow}>
          <div className={styles.formField}>
            <label className={styles.formLabel}>HP</label>
            <input
              className={styles.formInput}
              type="number"
              value={template.hpDefault ?? ''}
              onChange={(e) => patch({ hpDefault: e.target.value ? Number(e.target.value) : null })}
              placeholder="Hit points"
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.formLabel}>HP Formula</label>
            <input
              className={styles.formInput}
              value={template.hpFormula ?? ''}
              onChange={(e) => patch({ hpFormula: e.target.value || null })}
              placeholder="e.g. 4d8+4"
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.formLabel}>AC</label>
            <input
              className={styles.formInput}
              type="number"
              value={template.ac ?? ''}
              onChange={(e) => patch({ ac: e.target.value ? Number(e.target.value) : null })}
              placeholder="Armor class"
            />
          </div>
        </div>
        <div className={styles.formRow}>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Speed (walk)</label>
            <input
              className={styles.formInput}
              type="number"
              value={template.speed.walk ?? ''}
              onChange={(e) => patch({ speed: { ...template.speed, walk: Number(e.target.value) || 0 } })}
              placeholder="30"
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Speed (fly)</label>
            <input
              className={styles.formInput}
              type="number"
              value={template.speed.fly ?? ''}
              onChange={(e) => {
                const val = Number(e.target.value);
                const speed = { ...template.speed };
                if (val > 0) speed.fly = val; else delete speed.fly;
                patch({ speed });
              }}
              placeholder="—"
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Speed (swim)</label>
            <input
              className={styles.formInput}
              type="number"
              value={template.speed.swim ?? ''}
              onChange={(e) => {
                const val = Number(e.target.value);
                const speed = { ...template.speed };
                if (val > 0) speed.swim = val; else delete speed.swim;
                patch({ speed });
              }}
              placeholder="—"
            />
          </div>
        </div>

        {/* Tags */}
        <div className={styles.formField}>
          <label className={styles.formLabel}>Tags</label>
          <div className={styles.tagsContainer}>
            {template.tags.map(tag => (
              <span key={tag} className={styles.tag}>
                {tag}
                <span className={styles.tagRemove} onClick={() => removeTag(tag)}>×</span>
              </span>
            ))}
          </div>
          <div className={styles.formRow}>
            <input
              className={styles.formInput}
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
              placeholder="Add tag + Enter"
              style={{ flex: 1 }}
            />
          </div>
        </div>
      </Section>

      {/* ── Abilities Section ── */}
      <Section title="Ability Scores" collapsed={collapsed['abilities']} onToggle={() => toggle('abilities')}>
        <div className={styles.abilityGrid}>
          {ABILITY_KEYS.map(key => (
            <div key={key} className={styles.abilityCell}>
              <span className={styles.abilityLabel}>{key}</span>
              <input
                className={styles.abilityInput}
                type="number"
                value={abilities[key]}
                onChange={(e) => setAbility(key, Number(e.target.value) || 0)}
              />
            </div>
          ))}
        </div>
      </Section>

      {/* ── Actions Section ── */}
      <Section title="Actions" collapsed={collapsed['actions']} onToggle={() => toggle('actions')}>
        <div className={styles.modeToggle}>
          <button
            className={`${styles.modeBtn} ${template.actionsMode === 'structured' ? styles.modeBtnActive : ''}`}
            onClick={() => patch({ actionsMode: 'structured' })}
          >Structured</button>
          <button
            className={`${styles.modeBtn} ${template.actionsMode === 'freetext' ? styles.modeBtnActive : ''}`}
            onClick={() => patch({ actionsMode: 'freetext' })}
          >Free Text</button>
        </div>

        {template.actionsMode === 'structured' ? (
          <>
            {template.actions.map(action => (
              <div key={action.id} className={styles.actionItem}>
                <div className={styles.actionHeader}>
                  <input
                    className={styles.formInput}
                    value={action.name}
                    onChange={(e) => updateAction(action.id, { name: e.target.value })}
                    placeholder="Action name"
                    style={{ flex: 1 }}
                  />
                  <button className={styles.actionRemoveBtn} onClick={() => removeAction(action.id)}>×</button>
                </div>
                <div className={styles.formRow}>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>To Hit</label>
                    <input
                      className={styles.formInput}
                      type="number"
                      value={action.toHit ?? ''}
                      onChange={(e) => updateAction(action.id, { toHit: e.target.value ? Number(e.target.value) : undefined })}
                      placeholder="+5"
                    />
                  </div>
                  <div className={styles.formField}>
                    <label className={styles.formLabel}>Damage</label>
                    <input
                      className={styles.formInput}
                      value={action.damage ?? ''}
                      onChange={(e) => updateAction(action.id, { damage: e.target.value || undefined })}
                      placeholder="2d6+3"
                    />
                  </div>
                </div>
                <div className={styles.formField}>
                  <label className={styles.formLabel}>Description</label>
                  <textarea
                    className={styles.formTextarea}
                    value={action.description}
                    onChange={(e) => updateAction(action.id, { description: e.target.value })}
                    placeholder="Action description..."
                    style={{ minHeight: '48px' }}
                  />
                </div>
              </div>
            ))}
            <button className={styles.iconBtn} onClick={addAction}>
              <span className={styles.iconSm}>add</span> Add Action
            </button>
          </>
        ) : (
          <textarea
            className={styles.formTextarea}
            value={template.actionsText}
            onChange={(e) => patch({ actionsText: e.target.value })}
            placeholder="Describe actions in free text..."
            style={{ minHeight: '120px' }}
          />
        )}
      </Section>

      {/* ── Traits Section ── */}
      <Section title="Traits" collapsed={collapsed['traits']} onToggle={() => toggle('traits')}>
        {template.traits.map(trait => (
          <div key={trait.id} className={styles.actionItem}>
            <div className={styles.actionHeader}>
              <input
                className={styles.formInput}
                value={trait.name}
                onChange={(e) => updateTrait(trait.id, { name: e.target.value })}
                placeholder="Trait name"
                style={{ flex: 1 }}
              />
              <button className={styles.actionRemoveBtn} onClick={() => removeTrait(trait.id)}>×</button>
            </div>
            <textarea
              className={styles.formTextarea}
              value={trait.description}
              onChange={(e) => updateTrait(trait.id, { description: e.target.value })}
              placeholder="Trait description..."
              style={{ minHeight: '48px' }}
            />
          </div>
        ))}
        <button className={styles.iconBtn} onClick={addTrait}>
          <span className={styles.iconSm}>add</span> Add Trait
        </button>
      </Section>

      {/* ── Custom Fields Section ── */}
      <Section title="Custom Fields" collapsed={collapsed['custom']} onToggle={() => toggle('custom')}>
        {template.customFields.map((cf, idx) => (
          <div key={idx} className={styles.customFieldRow}>
            <input
              className={styles.formInput}
              value={cf.key}
              onChange={(e) => updateCustomField(idx, { key: e.target.value })}
              placeholder="Key"
              style={{ width: '120px' }}
            />
            <input
              className={styles.formInput}
              value={cf.value}
              onChange={(e) => updateCustomField(idx, { value: e.target.value })}
              placeholder="Value"
              style={{ flex: 1 }}
            />
            <button className={styles.customFieldRemove} onClick={() => removeCustomField(idx)}>×</button>
          </div>
        ))}
        <button className={styles.iconBtn} onClick={addCustomField}>
          <span className={styles.iconSm}>add</span> Add Field
        </button>
      </Section>

      {/* ── Delete ── */}
      <div className={styles.deleteSection}>
        <button className={styles.deleteBtn} onClick={onDelete}>
          <span className={styles.iconSm}>delete</span> Delete Creature
        </button>
      </div>
    </div>
  );
}

/** Collapsible section wrapper */
function Section({ title, collapsed, onToggle, children }: {
  title: string;
  collapsed: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.formSection}>
      <div className={styles.formSectionHeader} onClick={onToggle}>
        <span className={styles.formSectionTitle}>{title}</span>
        <span className={`${styles.formSectionChevron} ${!collapsed ? styles.formSectionChevronOpen : ''}`}>
          <span className={styles.iconSm}>chevron_right</span>
        </span>
      </div>
      {!collapsed && children}
    </div>
  );
}
