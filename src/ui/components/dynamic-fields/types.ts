/*
 * Dynamic Fields — shared type definitions
 *
 * Used by both Party Tracker and Bestiary for dynamic field systems.
 */

/* ── Field Types ── */

/** Available field types */
export type FieldType =
  | 'number'
  | 'bubbles'
  | 'text-field'
  | 'text-box'
  | 'radio'
  | 'checkbox'
  | 'action-list'
  | 'tag-list'
  | 'stat-block';

/** Field width in the layout (auto-flow: fields ≤ 1 total width share a row) */
export type FieldWidth = '1/3' | '1/2' | '2/3' | 'full';

/** Alignment */
export type Alignment = 'left' | 'center' | 'right';

/* ── Field Settings (type-specific) ── */

export interface NumberFieldSettings {
  sliderEnabled: boolean;
  min?: number;
  max?: number;
}

export interface BubblesFieldSettings {
  count: number;
}

export interface RadioFieldSettings {
  options: string[];
}

export interface TagListFieldSettings {
  predefinedOptions?: string[];
}

export interface ActionListFieldSettings {
  /** Whether toHit/damage/reach fields are shown (true for attacks, false for traits) */
  showCombatFields?: boolean;
}

export type FieldSettings =
  | NumberFieldSettings
  | BubblesFieldSettings
  | RadioFieldSettings
  | TagListFieldSettings
  | ActionListFieldSettings;

/* ── Section Definition ── */

export interface SectionDefinition {
  id: string;
  title: string;
  sortOrder: number;
  collapsed?: boolean;
  column?: 'left' | 'right' | 'header';
}

/* ── Field Definition ── */

export interface FieldDefinition {
  id: string;
  type: FieldType;
  title: string;
  sectionId?: string; // optional — party tracker doesn't use sections
  width: FieldWidth;
  textAlign: Alignment;
  positionAlign: Alignment;
  settings?: FieldSettings;
  sortOrder: number;
}

/* ── Field Values ── */

export interface ActionEntry {
  id: string;
  name: string;
  description: string;
  toHit?: number;
  damage?: string;
  reach?: string;
  saveDC?: number;
  saveAbility?: string;
  usageLimit?: string;
}

export type FieldValue =
  | { type: 'number'; value: number }
  | { type: 'bubbles'; filled: number }
  | { type: 'text-field'; value: string }
  | { type: 'text-box'; value: string }
  | { type: 'radio'; selected: string }
  | { type: 'checkbox'; checked: boolean }
  | { type: 'action-list'; actions: ActionEntry[] }
  | { type: 'tag-list'; tags: string[] }
  | { type: 'stat-block'; scores: AbilityScores; saves: Partial<AbilityScores> };

export interface AbilityScores {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

/* ── Structure (collection of sections + fields) ── */

export interface FieldStructure {
  sections?: SectionDefinition[];
  fields: FieldDefinition[];
}
