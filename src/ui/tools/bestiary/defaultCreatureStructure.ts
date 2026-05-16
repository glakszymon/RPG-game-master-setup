/*
 * Default Creature Structure — D&D 2024 Monster Manual preset.
 *
 * This is used as the default CreatureStructure for new campaigns.
 * Users can modify it via Campaign Settings → Structure Editor.
 * Field IDs are deterministic slugs for migration compatibility.
 */

import type { FieldStructure, SectionDefinition, FieldDefinition } from '../../components/dynamic-fields';

const SECTIONS: SectionDefinition[] = [
  { id: 'basic', title: 'Basic Info', sortOrder: 0 },
  { id: 'combat', title: 'Combat', sortOrder: 1 },
  { id: 'abilities', title: 'Ability Scores', sortOrder: 2 },
  { id: 'skills', title: 'Skills & Proficiencies', sortOrder: 3 },
  { id: 'defenses', title: 'Defenses', sortOrder: 4 },
  { id: 'info', title: 'Info', sortOrder: 5 },
  { id: 'traits', title: 'Traits', sortOrder: 6 },
  { id: 'actions', title: 'Actions', sortOrder: 7 },
];

const FIELDS: FieldDefinition[] = [
  // ── Basic ──
  {
    id: 'size',
    type: 'radio',
    title: 'Size',
    sectionId: 'basic',
    width: '1/2',
    textAlign: 'left',
    positionAlign: 'left',
    sortOrder: 0,
    settings: { options: ['Tiny', 'Small', 'Medium', 'Large', 'Huge', 'Gargantuan'] },
  },
  {
    id: 'creature_type',
    type: 'radio',
    title: 'Creature Type',
    sectionId: 'basic',
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
    id: 'descriptive_tags',
    type: 'tag-list',
    title: 'Descriptive Tags',
    sectionId: 'basic',
    width: 'full',
    textAlign: 'left',
    positionAlign: 'left',
    sortOrder: 2,
  },
  {
    id: 'alignment',
    type: 'radio',
    title: 'Alignment',
    sectionId: 'basic',
    width: 'full',
    textAlign: 'left',
    positionAlign: 'left',
    sortOrder: 3,
    settings: {
      options: [
        'Lawful Good', 'Neutral Good', 'Chaotic Good',
        'Lawful Neutral', 'True Neutral', 'Chaotic Neutral',
        'Lawful Evil', 'Neutral Evil', 'Chaotic Evil',
        'Unaligned', 'Any Alignment',
      ],
    },
  },

  // ── Combat ──
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
    type: 'tag-list',
    title: 'Speed',
    sectionId: 'combat',
    width: '1/2',
    textAlign: 'left',
    positionAlign: 'right',
    sortOrder: 4,
    settings: { predefinedOptions: ['30 ft.', '40 ft.', 'fly 60 ft.', 'swim 30 ft.', 'burrow 20 ft.', 'climb 30 ft.'] },
  },

  // ── Abilities ──
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

  // ── Skills ──
  {
    id: 'skills',
    type: 'tag-list',
    title: 'Skills',
    sectionId: 'skills',
    width: 'full',
    textAlign: 'left',
    positionAlign: 'left',
    sortOrder: 0,
    settings: {
      predefinedOptions: [
        'Acrobatics', 'Animal Handling', 'Arcana', 'Athletics',
        'Deception', 'History', 'Insight', 'Intimidation',
        'Investigation', 'Medicine', 'Nature', 'Perception',
        'Performance', 'Persuasion', 'Religion', 'Sleight of Hand',
        'Stealth', 'Survival',
      ],
    },
  },

  // ── Defenses ──
  {
    id: 'resistances',
    type: 'tag-list',
    title: 'Resistances',
    sectionId: 'defenses',
    width: '1/2',
    textAlign: 'left',
    positionAlign: 'left',
    sortOrder: 0,
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
  },

  // ── Info ──
  {
    id: 'senses',
    type: 'tag-list',
    title: 'Senses',
    sectionId: 'info',
    width: '1/2',
    textAlign: 'left',
    positionAlign: 'left',
    sortOrder: 0,
    settings: { predefinedOptions: ['Darkvision 60 ft.', 'Darkvision 120 ft.', 'Blindsight 10 ft.', 'Blindsight 30 ft.', 'Tremorsense 60 ft.', 'Truesight 120 ft.'] },
  },
  {
    id: 'languages',
    type: 'tag-list',
    title: 'Languages',
    sectionId: 'info',
    width: '1/2',
    textAlign: 'left',
    positionAlign: 'right',
    sortOrder: 1,
    settings: { predefinedOptions: ['Common', 'Draconic', 'Elvish', 'Dwarvish', 'Infernal', 'Abyssal', 'Celestial', 'Primordial', 'Sylvan', 'Undercommon', 'Deep Speech', 'Giant', 'Goblin', 'Orc', 'Telepathy 120 ft.'] },
  },
  {
    id: 'cr',
    type: 'text-field',
    title: 'Challenge Rating',
    sectionId: 'info',
    width: '1/3',
    textAlign: 'center',
    positionAlign: 'left',
    sortOrder: 2,
  },
  {
    id: 'gear',
    type: 'tag-list',
    title: 'Gear',
    sectionId: 'info',
    width: '2/3',
    textAlign: 'left',
    positionAlign: 'right',
    sortOrder: 3,
  },

  // ── Traits ──
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

  // ── Actions ──
  {
    id: 'actions',
    type: 'action-list',
    title: 'Actions',
    sectionId: 'actions',
    width: 'full',
    textAlign: 'left',
    positionAlign: 'left',
    sortOrder: 0,
    settings: { showCombatFields: true },
  },
  {
    id: 'bonus_actions',
    type: 'action-list',
    title: 'Bonus Actions',
    sectionId: 'actions',
    width: 'full',
    textAlign: 'left',
    positionAlign: 'left',
    sortOrder: 1,
    settings: { showCombatFields: true },
  },
  {
    id: 'reactions',
    type: 'action-list',
    title: 'Reactions',
    sectionId: 'actions',
    width: 'full',
    textAlign: 'left',
    positionAlign: 'left',
    sortOrder: 2,
    settings: { showCombatFields: false },
  },
  {
    id: 'legendary_actions',
    type: 'action-list',
    title: 'Legendary Actions',
    sectionId: 'actions',
    width: 'full',
    textAlign: 'left',
    positionAlign: 'left',
    sortOrder: 3,
    settings: { showCombatFields: true },
  },
];

/** D&D 2024 Monster Manual default creature structure */
export const DEFAULT_CREATURE_STRUCTURE: FieldStructure = {
  sections: SECTIONS,
  fields: FIELDS,
};

/** Settings key for creature structure in campaign_settings table */
export const SETTINGS_KEY_CREATURE_STRUCTURE = 'creature_structure';
