/*
 * Creature Form Config — types and defaults for the creature form builder.
 * Controls which sections/fields appear in the bestiary creature form.
 * View Filter pattern: config controls visibility/ordering, never deletes data.
 */

export interface FieldConfig {
  id: string;
  label: string;
  visible: boolean;
  sortOrder: number;
}

export interface SectionConfig {
  id: string;
  label: string;
  icon: string;
  visible: boolean;
  sortOrder: number;
  fields: FieldConfig[];
}

export interface CustomFieldDefinition {
  id: string;
  label: string;
  type: 'text' | 'number';
  sectionId: string;
  sortOrder: number;
}

export interface CreatureFormConfig {
  sections: SectionConfig[];
  customFieldDefinitions: CustomFieldDefinition[];
}

export const SETTINGS_KEY_CREATURE_FORM = 'creature_form_config';

export const DEFAULT_CREATURE_FORM_CONFIG: CreatureFormConfig = {
  sections: [
    {
      id: 'basic',
      label: 'Basic Info',
      icon: 'category',
      visible: true,
      sortOrder: 0,
      fields: [
        { id: 'creature_type', label: 'Creature Type', visible: true, sortOrder: 0 },
        { id: 'cr', label: 'Challenge Rating', visible: true, sortOrder: 1 },
        { id: 'hp', label: 'Hit Points', visible: true, sortOrder: 2 },
        { id: 'ac', label: 'Armor Class', visible: true, sortOrder: 3 },
        { id: 'speed', label: 'Speed', visible: true, sortOrder: 4 },
        { id: 'tags', label: 'Tags', visible: true, sortOrder: 5 },
      ],
    },
    {
      id: 'abilities',
      label: 'Ability Scores',
      icon: 'fitness_center',
      visible: true,
      sortOrder: 1,
      fields: [
        { id: 'str', label: 'Strength', visible: true, sortOrder: 0 },
        { id: 'dex', label: 'Dexterity', visible: true, sortOrder: 1 },
        { id: 'con', label: 'Constitution', visible: true, sortOrder: 2 },
        { id: 'int', label: 'Intelligence', visible: true, sortOrder: 3 },
        { id: 'wis', label: 'Wisdom', visible: true, sortOrder: 4 },
        { id: 'cha', label: 'Charisma', visible: true, sortOrder: 5 },
      ],
    },
    {
      id: 'actions',
      label: 'Actions',
      icon: 'bolt',
      visible: true,
      sortOrder: 2,
      fields: [
        { id: 'actions_list', label: 'Actions List', visible: true, sortOrder: 0 },
      ],
    },
    {
      id: 'traits',
      label: 'Traits',
      icon: 'auto_awesome',
      visible: true,
      sortOrder: 3,
      fields: [
        { id: 'traits_list', label: 'Traits List', visible: true, sortOrder: 0 },
      ],
    },
    {
      id: 'custom_fields',
      label: 'Custom Fields',
      icon: 'edit_note',
      visible: true,
      sortOrder: 4,
      fields: [
        { id: 'custom_fields_list', label: 'Custom Fields', visible: true, sortOrder: 0 },
      ],
    },
  ],
  customFieldDefinitions: [],
};
