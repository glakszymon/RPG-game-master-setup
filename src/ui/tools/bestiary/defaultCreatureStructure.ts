/*
 * Default Creature Structure — D&D 2024 Monster Manual preset.
 *
 * This is used as the default CreatureStructure for new campaigns.
 * Users can modify it via Campaign Settings → Structure Editor.
 * Field IDs are deterministic slugs for migration compatibility.
 */

import type { FieldStructure, SectionDefinition, FieldDefinition } from '../../components/dynamic-fields';

const SECTIONS: SectionDefinition[] = [
  // Header (sticky) — alignment + CR displayed alongside avatar/name
  { id: 'header', title: 'Header', sortOrder: 0, column: 'header' },

  // Left column — numeric/short fields
  { id: 'combat', title: 'Combat', sortOrder: 0, column: 'left' },
  { id: 'abilities', title: 'Ability Scores', sortOrder: 1, column: 'left' },
  { id: 'skills', title: 'Skills', sortOrder: 2, column: 'left' },
  { id: 'defenses', title: 'Defenses', sortOrder: 3, column: 'left' },
  { id: 'senses', title: 'Senses & Languages', sortOrder: 4, column: 'left' },
  { id: 'info', title: 'Info', sortOrder: 5, column: 'left' },

  // Right column — text/action fields
  { id: 'traits', title: 'Traits', sortOrder: 0, column: 'right' },
  { id: 'actions', title: 'Actions', sortOrder: 1, column: 'right' },
  { id: 'bonus_actions', title: 'Bonus Actions', sortOrder: 2, column: 'right' },
  { id: 'reactions', title: 'Reactions', sortOrder: 3, column: 'right' },
  { id: 'legendary', title: 'Legendary Actions', sortOrder: 4, column: 'right' },
];

const FIELDS: FieldDefinition[] = [
  // ── Header ──
  {
    id: 'alignment',
    type: 'select',
    title: 'Alignment',
    sectionId: 'header',
    width: '1/2',
    textAlign: 'left',
    positionAlign: 'left',
    sortOrder: 0,
    settings: {
      options: [
        'Lawful Good', 'Neutral Good', 'Chaotic Good',
        'Lawful Neutral', 'True Neutral', 'Chaotic Neutral',
        'Lawful Evil', 'Neutral Evil', 'Chaotic Evil',
        'Unaligned', 'Any Alignment',
      ],
    },
  },
  {
    id: 'cr',
    type: 'number',
    title: 'Challenge Rating',
    sectionId: 'header',
    width: '1/3',
    textAlign: 'center',
    positionAlign: 'right',
    sortOrder: 1,
    settings: { sliderEnabled: false },
  },

  // ── Combat (left) ──
  {
    id: 'ac',
    type: 'number',
    title: 'Armor Class',
    sectionId: 'combat',
    width: '1/3',
    textAlign: 'center',
    positionAlign: 'left',
    sortOrder: 0,
    settings: { sliderEnabled: false, min: 1, max: 30 },
  },
  {
    id: 'initiative',
    type: 'number',
    title: 'Initiative',
    sectionId: 'combat',
    width: '1/3',
    textAlign: 'center',
    positionAlign: 'center',
    sortOrder: 1,
    settings: { sliderEnabled: false, min: -5, max: 30 },
  },
  {
    id: 'hp_default',
    type: 'number',
    title: 'Hit Points',
    sectionId: 'combat',
    width: '1/3',
    textAlign: 'center',
    positionAlign: 'right',
    sortOrder: 2,
    settings: { sliderEnabled: false, min: 1, max: 999 },
  },
  {
    id: 'hp_formula',
    type: 'text-field',
    title: 'HP Formula',
    sectionId: 'combat',
    width: '1/2',
    textAlign: 'left',
    positionAlign: 'left',
    sortOrder: 3,
  },
  {
    id: 'speed',
    type: 'speed-list',
    title: 'Speed',
    sectionId: 'combat',
    width: 'full',
    textAlign: 'left',
    positionAlign: 'left',
    sortOrder: 4,
    settings: {
      entries: [
        { key: 'walk', label: 'Walk', alwaysVisible: true },
        { key: 'fly', label: 'Fly' },
        { key: 'swim', label: 'Swim' },
        { key: 'burrow', label: 'Burrow' },
        { key: 'climb', label: 'Climb' },
      ],
    },
  },

  // ── Abilities (left) ──
  {
    id: 'ability_scores',
    type: 'stat-block',
    title: 'Ability Scores',
    sectionId: 'abilities',
    width: 'full',
    textAlign: 'center',
    positionAlign: 'center',
    sortOrder: 0,
  },

  // ── Skills (left) ──
  {
    id: 'skills',
    type: 'skill-list',
    title: 'Skills',
    sectionId: 'skills',
    width: 'full',
    textAlign: 'left',
    positionAlign: 'left',
    sortOrder: 0,
    settings: {
      options: [
        'Acrobatics', 'Animal Handling', 'Arcana', 'Athletics',
        'Deception', 'History', 'Insight', 'Intimidation',
        'Investigation', 'Medicine', 'Nature', 'Perception',
        'Performance', 'Persuasion', 'Religion', 'Sleight of Hand',
        'Stealth', 'Survival',
      ],
    },
  },

  // ── Defenses (left) ──
  {
    id: 'resistances',
    type: 'tag-list',
    title: 'Resistances',
    sectionId: 'defenses',
    width: '1/2',
    textAlign: 'left',
    positionAlign: 'left',
    sortOrder: 0,
    settings: { predefinedOptions: ['Acid', 'Cold', 'Fire', 'Force', 'Lightning', 'Necrotic', 'Poison', 'Psychic', 'Radiant', 'Thunder', 'Bludgeoning', 'Piercing', 'Slashing'] },
  },
  {
    id: 'vulnerabilities',
    type: 'tag-list',
    title: 'Vulnerabilities',
    sectionId: 'defenses',
    width: '1/2',
    textAlign: 'left',
    positionAlign: 'right',
    sortOrder: 1,
    settings: { predefinedOptions: ['Acid', 'Cold', 'Fire', 'Force', 'Lightning', 'Necrotic', 'Poison', 'Psychic', 'Radiant', 'Thunder', 'Bludgeoning', 'Piercing', 'Slashing'] },
  },
  {
    id: 'immunities_damage',
    type: 'tag-list',
    title: 'Damage Immunities',
    sectionId: 'defenses',
    width: '1/2',
    textAlign: 'left',
    positionAlign: 'left',
    sortOrder: 2,
    settings: { predefinedOptions: ['Acid', 'Cold', 'Fire', 'Force', 'Lightning', 'Necrotic', 'Poison', 'Psychic', 'Radiant', 'Thunder', 'Bludgeoning', 'Piercing', 'Slashing'] },
  },
  {
    id: 'immunities_condition',
    type: 'tag-list',
    title: 'Condition Immunities',
    sectionId: 'defenses',
    width: '1/2',
    textAlign: 'left',
    positionAlign: 'right',
    sortOrder: 3,
    settings: { predefinedOptions: ['Blinded', 'Charmed', 'Deafened', 'Exhaustion', 'Frightened', 'Grappled', 'Incapacitated', 'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained', 'Stunned', 'Unconscious'] },
  },

  // ── Senses & Languages (left) ──
  {
    id: 'senses',
    type: 'speed-list',
    title: 'Senses',
    sectionId: 'senses',
    width: '1/2',
    textAlign: 'left',
    positionAlign: 'left',
    sortOrder: 0,
    settings: {
      entries: [
        { key: 'darkvision', label: 'Darkvision' },
        { key: 'blindsight', label: 'Blindsight' },
        { key: 'tremorsense', label: 'Tremorsense' },
        { key: 'truesight', label: 'Truesight' },
      ],
      allowCustom: true,
    },
  },
  {
    id: 'languages',
    type: 'tag-list',
    title: 'Languages',
    sectionId: 'senses',
    width: '1/2',
    textAlign: 'left',
    positionAlign: 'right',
    sortOrder: 1,
    settings: { predefinedOptions: ['Common', 'Draconic', 'Elvish', 'Dwarvish', 'Infernal', 'Abyssal', 'Celestial', 'Primordial', 'Sylvan', 'Undercommon', 'Deep Speech', 'Giant', 'Goblin', 'Orc', 'Telepathy 120 ft.'] },
  },

  // ── Info (left) ──
  {
    id: 'size',
    type: 'select',
    title: 'Size',
    sectionId: 'info',
    width: '1/2',
    textAlign: 'left',
    positionAlign: 'left',
    sortOrder: 0,
    settings: { options: ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'] },
  },
  {
    id: 'creature_type',
    type: 'select',
    title: 'Creature Type',
    sectionId: 'info',
    width: '1/2',
    textAlign: 'left',
    positionAlign: 'left',
    sortOrder: 1,
    settings: {
      options: [
        'Aberration', 'Beast', 'Celestial', 'Construct', 'Dragon',
        'Elemental', 'Fey', 'Fiend', 'Giant', 'Humanoid',
        'Monstrosity', 'Ooze', 'Plant', 'Undead',
      ],
    },
  },
  {
    id: 'gear',
    type: 'item-list',
    title: 'Gear',
    sectionId: 'info',
    width: 'full',
    textAlign: 'left',
    positionAlign: 'left',
    sortOrder: 2,
  },

  // ── Traits (right) ──
  {
    id: 'traits',
    type: 'action-list',
    title: 'Traits',
    sectionId: 'traits',
    width: 'full',
    textAlign: 'left',
    positionAlign: 'left',
    sortOrder: 0,
    settings: { showCombatFields: false },
  },

  // ── Actions (right) ──
  {
    id: 'actions',
    type: 'action-list',
    title: 'Actions',
    sectionId: 'actions',
    width: 'full',
    textAlign: 'left',
    positionAlign: 'left',
    sortOrder: 0,
    settings: { showCombatFields: false },
  },

  // ── Bonus Actions (right) ──
  {
    id: 'bonus_actions',
    type: 'action-list',
    title: 'Bonus Actions',
    sectionId: 'bonus_actions',
    width: 'full',
    textAlign: 'left',
    positionAlign: 'left',
    sortOrder: 0,
    settings: { showCombatFields: false },
  },

  // ── Reactions (right) ──
  {
    id: 'reactions',
    type: 'action-list',
    title: 'Reactions',
    sectionId: 'reactions',
    width: 'full',
    textAlign: 'left',
    positionAlign: 'left',
    sortOrder: 0,
    settings: { showCombatFields: false },
  },

  // ── Legendary Actions (right) ──
  {
    id: 'legendary_actions',
    type: 'action-list',
    title: 'Legendary Actions',
    sectionId: 'legendary',
    width: 'full',
    textAlign: 'left',
    positionAlign: 'left',
    sortOrder: 0,
    settings: { showCombatFields: false },
  },
];

/** D&D 2024 Monster Manual default creature structure */
export const DEFAULT_CREATURE_STRUCTURE: FieldStructure = {
  sections: SECTIONS,
  fields: FIELDS,
};

/** Settings key for creature structure in campaign_settings table */
export const SETTINGS_KEY_CREATURE_STRUCTURE = 'creature_structure';
