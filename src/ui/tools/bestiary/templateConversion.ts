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

  // Creature type — select field (capitalize for display)
  if (t.creatureType) {
    vals['creature_type'] = { type: 'select', selected: t.creatureType.charAt(0).toUpperCase() + t.creatureType.slice(1) };
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

  // Speed as speed-list (Record<string, number | null>)
  if (Object.keys(t.speed).length > 0) {
    vals['speed'] = { type: 'speed-list', values: { ...t.speed } };
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

  // CR as number
  if (t.cr) {
    const crNum = t.cr.includes('/')
      ? Number(t.cr.split('/')[0]) / Number(t.cr.split('/')[1])
      : Number(t.cr) || 0;
    vals['cr'] = { type: 'number', value: crNum };
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

  // creature_type (supports both 'radio' legacy and 'select' new)
  const ctVal = fieldValues['creature_type'];
  if (ctVal?.type === 'radio') {
    t.creatureType = ctVal.selected as CreatureTemplate['creatureType'];
  } else if (ctVal?.type === 'select') {
    t.creatureType = (ctVal.selected?.toLowerCase() ?? null) as CreatureTemplate['creatureType'];
  } else {
    t.creatureType = null;
  }

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

  // speed (supports both 'speed-list' new and 'tag-list' legacy)
  const speedVal = fieldValues['speed'];
  if (speedVal?.type === 'speed-list') {
    const speed: Record<string, number> = {};
    for (const [key, val] of Object.entries(speedVal.values)) {
      if (val != null && val > 0) speed[key] = val;
    }
    t.speed = speed;
  } else if (speedVal?.type === 'tag-list') {
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

  // cr (supports both 'number' new and 'text-field' legacy)
  const crVal = fieldValues['cr'];
  if (crVal?.type === 'number') {
    const num = crVal.value;
    // Convert fractional CRs back to string
    if (num === 0.125) t.cr = '1/8';
    else if (num === 0.25) t.cr = '1/4';
    else if (num === 0.5) t.cr = '1/2';
    else t.cr = String(num);
  } else if (crVal?.type === 'text-field') {
    t.cr = crVal.value || null;
  } else {
    t.cr = null;
  }

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
