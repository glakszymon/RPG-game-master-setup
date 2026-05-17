/*
 * templateConversion — converts between old CreatureTemplate (hardcoded fields)
 * and new fieldValues (Record<string, FieldValue>) format.
 *
 * Used as a bridge until Phase 6 migration replaces the DB schema.
 */

import type { CreatureTemplate } from './types';
import type { FieldValue } from '../../components/dynamic-fields';

/** Convert old CreatureTemplate fields to dynamic fieldValues */
export function templateToFieldValues(t: CreatureTemplate): Record<string, FieldValue> {
  const vals: Record<string, FieldValue> = {};

  // Basic
  if (t.creatureType) {
    vals['creature_type'] = { type: 'radio', selected: t.creatureType };
  }
  if (t.tags.length > 0) {
    vals['descriptive_tags'] = { type: 'tag-list', tags: t.tags };
  }

  // Combat
  if (t.ac != null) {
    vals['ac'] = { type: 'number', value: t.ac };
  }
  if (t.hpDefault != null) {
    vals['hp_default'] = { type: 'number', value: t.hpDefault };
  }
  if (t.hpFormula) {
    vals['hp_formula'] = { type: 'text-field', value: t.hpFormula };
  }
  if (Object.keys(t.speed).length > 0) {
    const speedTags = Object.entries(t.speed).map(([mode, val]) =>
      mode === 'walk' ? `${val} ft.` : `${mode} ${val} ft.`
    );
    vals['speed'] = { type: 'tag-list', tags: speedTags };
  }

  // Abilities
  if (t.abilityScores) {
    vals['ability_scores'] = {
      type: 'stat-block',
      scores: { ...t.abilityScores },
      modifiers: {},
      saves: t.savingThrows ? { ...t.savingThrows } : {},
    };
  }

  // CR
  if (t.cr) {
    vals['cr'] = { type: 'text-field', value: t.cr };
  }

  // Traits
  if (t.traits.length > 0) {
    vals['traits'] = {
      type: 'action-list',
      actions: t.traits.map(tr => ({
        id: tr.id,
        name: tr.name,
        description: tr.description,
      })),
    };
  }

  // Actions
  if (t.actions.length > 0) {
    const regular = t.actions.filter(a => !a.isLegendary);
    const legendary = t.actions.filter(a => a.isLegendary);

    if (regular.length > 0) {
      vals['actions'] = {
        type: 'action-list',
        actions: regular.map(a => ({
          id: a.id,
          name: a.name,
          description: a.description,
          toHit: a.toHit,
          damage: a.damage,
        })),
      };
    }
    if (legendary.length > 0) {
      vals['legendary_actions'] = {
        type: 'action-list',
        actions: legendary.map(a => ({
          id: a.id,
          name: a.name,
          description: a.description,
          toHit: a.toHit,
          damage: a.damage,
        })),
      };
    }
  }

  return vals;
}

/** Convert dynamic fieldValues back to old CreatureTemplate fields (for DB save) */
export function fieldValuesToTemplate(
  base: CreatureTemplate,
  fieldValues: Record<string, FieldValue>,
): CreatureTemplate {
  const t = { ...base, updatedAt: new Date().toISOString() };

  // creature_type
  const ctVal = fieldValues['creature_type'];
  t.creatureType = (ctVal?.type === 'radio' ? ctVal.selected : null) as CreatureTemplate['creatureType'];

  // descriptive_tags
  const tagsVal = fieldValues['descriptive_tags'];
  t.tags = tagsVal?.type === 'tag-list' ? tagsVal.tags : [];

  // ac
  const acVal = fieldValues['ac'];
  t.ac = acVal?.type === 'number' ? acVal.value : null;

  // hp_default
  const hpVal = fieldValues['hp_default'];
  t.hpDefault = hpVal?.type === 'number' ? hpVal.value : null;

  // hp_formula
  const hpfVal = fieldValues['hp_formula'];
  t.hpFormula = hpfVal?.type === 'text-field' ? hpfVal.value || null : null;

  // speed
  const speedVal = fieldValues['speed'];
  if (speedVal?.type === 'tag-list') {
    const speed: Record<string, number> = {};
    for (const tag of speedVal.tags) {
      const match = tag.match(/^(?:(\w+)\s+)?(\d+)\s*ft\.?$/i);
      if (match) {
        const mode = match[1]?.toLowerCase() || 'walk';
        speed[mode] = Number(match[2]);
      }
    }
    t.speed = speed;
  } else {
    t.speed = {};
  }

  // ability_scores
  const abVal = fieldValues['ability_scores'];
  if (abVal?.type === 'stat-block') {
    t.abilityScores = { ...abVal.scores };
    t.savingThrows = Object.keys(abVal.saves).length > 0 ? { ...abVal.saves } : null;
  } else {
    t.abilityScores = null;
    t.savingThrows = null;
  }

  // cr
  const crVal = fieldValues['cr'];
  t.cr = crVal?.type === 'text-field' ? crVal.value || null : null;

  // traits
  const traitsVal = fieldValues['traits'];
  if (traitsVal?.type === 'action-list') {
    t.traits = traitsVal.actions.map(a => ({ id: a.id, name: a.name, description: a.description }));
  } else {
    t.traits = [];
  }

  // actions (merge regular + legendary)
  const actionsVal = fieldValues['actions'];
  const legendaryVal = fieldValues['legendary_actions'];
  const allActions: Array<{ id: string; name: string; description: string; toHit?: number; damage?: string; isLegendary?: boolean }> = [];

  if (actionsVal?.type === 'action-list') {
    for (const a of actionsVal.actions) {
      allActions.push({ id: a.id, name: a.name, description: a.description, toHit: a.toHit, damage: a.damage });
    }
  }
  if (legendaryVal?.type === 'action-list') {
    for (const a of legendaryVal.actions) {
      allActions.push({ id: a.id, name: a.name, description: a.description, toHit: a.toHit, damage: a.damage, isLegendary: true });
    }
  }
  t.actions = allActions;

  return t;
}
