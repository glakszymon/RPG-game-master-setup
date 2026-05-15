/*
 * InstanceForm — full creature editor for a specific instance.
 * Pre-filled with resolved data (template + overrides merged).
 * Edits are saved as overrides on the instance, not on the base template.
 */

import { useState, useCallback, useMemo } from 'react';
import type {
  CreatureTemplate, CreatureInstance, CreatureType,
  AbilityScores, CreatureAction, CreatureTrait, CustomField,
} from '../types';
import { CREATURE_TYPE_ICON } from '../types';
import styles from '../Bestiary.module.css';

const CREATURE_TYPES: CreatureType[] = [
  'aberration', 'beast', 'celestial', 'construct', 'dragon',
  'elemental', 'fey', 'fiend', 'giant', 'humanoid',
  'monstrosity', 'ooze', 'plant', 'undead', 'swarm',
];

const ABILITY_KEYS: (keyof AbilityScores)[] = ['str', 'dex', 'con', 'int', 'wis', 'cha'];

interface InstanceFormProps {
  instance: CreatureInstance;
  resolved: CreatureTemplate;
  onUpdate: (instance: CreatureInstance) => void;
  onDelete: (id: string) => void;
}

function uid(): string {
  return crypto.randomUUID();
}

export function InstanceForm({ instance, resolved, onUpdate, onDelete }: InstanceFormProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const toggle = (section: string) => {
    setCollapsed(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const shortId = instance.id.slice(0, 6);

  /** Apply a partial override. Merges into instance.overrides and saves. */
  const patch = useCallback((fields: Partial<CreatureTemplate>) => {
    const overrides = { ...instance.overrides, ...fields };
    onUpdate({ ...instance, overrides });
  }, [instance, onUpdate]);

  /** Update instance name (stored directly, not in overrides). */
  const setName = useCallback((name: string) => {
    onUpdate({ ...instance, instanceName: name || null });
  }, [instance, onUpdate]);

  // Current effective values (resolved = template + existing overrides)
  const iconName = resolved.creatureType ? CREATURE_TYPE_ICON[resolved.creatureType] : 'category';
  const abilities = resolved.abilityScores ?? { str: 10, dex: 10, con: 10, int: 10, wis: 10, cha: 10 };

  const setAbility = (key: keyof AbilityScores, val: number) => {
    patch({ abilityScores: { ...abilities, [key]: val } });
  };

  // ── Actions ──
  const actions = useMemo(() => resolved.actions ?? [], [resolved.actions]);
  const addAction = () => {
    const action: CreatureAction = { id: uid(), name: '', description: '' };
    patch({ actions: [...actions, action] });
  };
  const updateAction = (id: string, fields: Partial<CreatureAction>) => {
    patch({ actions: actions.map(a => a.id === id ? { ...a, ...fields } : a) });
  };
  const removeAction = (id: string) => {
    patch({ actions: actions.filter(a => a.id !== id) });
  };

  // ── Traits ──
  const traits = useMemo(() => resolved.traits ?? [], [resolved.traits]);
  const addTrait = () => {
    const trait: CreatureTrait = { id: uid(), name: '', description: '' };
    patch({ traits: [...traits, trait] });
  };
  const updateTrait = (id: string, fields: Partial<CreatureTrait>) => {
    patch({ traits: traits.map(t => t.id === id ? { ...t, ...fields } : t) });
  };
  const removeTrait = (id: string) => {
    patch({ traits: traits.filter(t => t.id !== id) });
  };

  // ── Custom fields ──
  const customFields = useMemo(() => resolved.customFields ?? [], [resolved.customFields]);
  const addCustomField = () => {
    patch({ customFields: [...customFields, { key: '', value: '' }] });
  };
  const updateCustomField = (idx: number, fields: Partial<CustomField>) => {
    const next = [...customFields];
    next[idx] = { ...next[idx], ...fields };
    patch({ customFields: next });
  };
  const removeCustomField = (idx: number) => {
    patch({ customFields: customFields.filter((_, i) => i !== idx) });
  };

  // ── Tags ──
  const tags = useMemo(() => resolved.tags ?? [], [resolved.tags]);
  const [tagInput, setTagInput] = useState('');
  const addTag = () => {
    const tag = tagInput.trim();
    if (tag && !tags.includes(tag)) {
      patch({ tags: [...tags, tag] });
    }
    setTagInput('');
  };
  const removeTag = (tag: string) => {
    patch({ tags: tags.filter(t => t !== tag) });
  };

  const actionsMode = resolved.actionsMode ?? 'structured';

  return (
    <div>
      {/* ── Header: avatar + name + ID ── */}
      <div className={styles.avatarSection}>
        <div className={styles.avatarPreview}>
          {resolved.avatarPath ? (
            <img src={resolved.avatarPath} alt={resolved.name} />
          ) : (
            <span className={styles.icon}>{iconName}</span>
          )}
        </div>
        <div style={{ flex: 1 }}>
          <input
            className={styles.formInput}
            style={{ width: '100%', fontSize: 'var(--text-md)', fontWeight: 'var(--font-semibold)' }}
            value={instance.instanceName ?? resolved.name}
            onChange={(e) => setName(e.target.value)}
            placeholder={resolved.name}
          />
          <div className={styles.instanceFormMeta}>
            <span className={styles.instanceFormId}>{shortId}</span>
            {resolved.creatureType && (
              <span className={styles.instanceFormType}>
                <span className={styles.iconSm}>{iconName}</span>
                {resolved.creatureType}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── Basic Section ── */}
      <Section title="Basic" collapsed={collapsed['basic']} onToggle={() => toggle('basic')}>
        <div className={styles.formRow}>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Type</label>
            <select
              className={styles.formSelect}
              value={resolved.creatureType ?? ''}
              onChange={(e) => patch({ creatureType: (e.target.value || null) as CreatureType | null })}
            >
              <option value="">-- None --</option>
              {CREATURE_TYPES.map(ct => (
                <option key={ct} value={ct}>{ct}</option>
              ))}
            </select>
          </div>
          <div className={styles.formField}>
            <label className={styles.formLabel}>CR</label>
            <input
              className={styles.formInput}
              value={resolved.cr ?? ''}
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
              value={resolved.hpDefault ?? ''}
              onChange={(e) => patch({ hpDefault: e.target.value ? Number(e.target.value) : null })}
              placeholder="Hit points"
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.formLabel}>HP Formula</label>
            <input
              className={styles.formInput}
              value={resolved.hpFormula ?? ''}
              onChange={(e) => patch({ hpFormula: e.target.value || null })}
              placeholder="e.g. 4d8+4"
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.formLabel}>AC</label>
            <input
              className={styles.formInput}
              type="number"
              value={resolved.ac ?? ''}
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
              value={resolved.speed?.walk ?? ''}
              onChange={(e) => patch({ speed: { ...resolved.speed, walk: Number(e.target.value) || 0 } })}
              placeholder="30"
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Speed (fly)</label>
            <input
              className={styles.formInput}
              type="number"
              value={resolved.speed?.fly ?? ''}
              onChange={(e) => {
                const val = Number(e.target.value);
                const speed = { ...resolved.speed };
                if (val > 0) speed.fly = val; else delete speed.fly;
                patch({ speed });
              }}
              placeholder="--"
            />
          </div>
          <div className={styles.formField}>
            <label className={styles.formLabel}>Speed (swim)</label>
            <input
              className={styles.formInput}
              type="number"
              value={resolved.speed?.swim ?? ''}
              onChange={(e) => {
                const val = Number(e.target.value);
                const speed = { ...resolved.speed };
                if (val > 0) speed.swim = val; else delete speed.swim;
                patch({ speed });
              }}
              placeholder="--"
            />
          </div>
        </div>

        {/* Tags */}
        <div className={styles.formField}>
          <label className={styles.formLabel}>Tags</label>
          <div className={styles.tagsContainer}>
            {tags.map(tag => (
              <span key={tag} className={styles.tag}>
                {tag}
                <span className={styles.tagRemove} onClick={() => removeTag(tag)}>x</span>
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
            className={`${styles.modeBtn} ${actionsMode === 'structured' ? styles.modeBtnActive : ''}`}
            onClick={() => patch({ actionsMode: 'structured' })}
          >Structured</button>
          <button
            className={`${styles.modeBtn} ${actionsMode === 'freetext' ? styles.modeBtnActive : ''}`}
            onClick={() => patch({ actionsMode: 'freetext' })}
          >Free Text</button>
        </div>

        {actionsMode === 'structured' ? (
          <>
            {actions.map(action => (
              <div key={action.id} className={styles.actionItem}>
                <div className={styles.actionHeader}>
                  <input
                    className={styles.formInput}
                    value={action.name}
                    onChange={(e) => updateAction(action.id, { name: e.target.value })}
                    placeholder="Action name"
                    style={{ flex: 1 }}
                  />
                  <button className={styles.actionRemoveBtn} onClick={() => removeAction(action.id)}>x</button>
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
            value={resolved.actionsText ?? ''}
            onChange={(e) => patch({ actionsText: e.target.value })}
            placeholder="Describe actions in free text..."
            style={{ minHeight: '120px' }}
          />
        )}
      </Section>

      {/* ── Traits Section ── */}
      <Section title="Traits" collapsed={collapsed['traits']} onToggle={() => toggle('traits')}>
        {traits.map(trait => (
          <div key={trait.id} className={styles.actionItem}>
            <div className={styles.actionHeader}>
              <input
                className={styles.formInput}
                value={trait.name}
                onChange={(e) => updateTrait(trait.id, { name: e.target.value })}
                placeholder="Trait name"
                style={{ flex: 1 }}
              />
              <button className={styles.actionRemoveBtn} onClick={() => removeTrait(trait.id)}>x</button>
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
        {customFields.map((cf, idx) => (
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
            <button className={styles.customFieldRemove} onClick={() => removeCustomField(idx)}>x</button>
          </div>
        ))}
        <button className={styles.iconBtn} onClick={addCustomField}>
          <span className={styles.iconSm}>add</span> Add Field
        </button>
      </Section>

      {/* ── Delete ── */}
      <div className={styles.deleteSection}>
        <button className={styles.deleteBtn} onClick={() => onDelete(instance.id)}>
          <span className={styles.iconSm}>delete</span> Remove Instance
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
