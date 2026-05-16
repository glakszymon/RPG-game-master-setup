/*
 * Bestiary — data types for creature library and encounter sets.
 */

/** Creature type classification */
export type CreatureType =
  | 'aberration' | 'beast' | 'celestial' | 'construct' | 'dragon'
  | 'elemental' | 'fey' | 'fiend' | 'giant' | 'humanoid'
  | 'monstrosity' | 'ooze' | 'plant' | 'undead' | 'swarm';

/** D&D 5e ability scores */
export interface AbilityScores {
  str: number;
  dex: number;
  con: number;
  int: number;
  wis: number;
  cha: number;
}

/** Structured action / attack */
export interface CreatureAction {
  id: string;
  name: string;
  description: string;
  toHit?: number;
  damage?: string;       // e.g. "2d6+3"
  isLegendary?: boolean;
}

/** A creature trait (passive ability, resistance, etc.) */
export interface CreatureTrait {
  id: string;
  name: string;
  description: string;
}

/** Custom key-value field */
export interface CustomField {
  key: string;
  value: string;
}

/** Full creature template (library entry) */
export interface CreatureTemplate {
  id: string;
  name: string;
  creatureType: CreatureType | null;
  cr: string | null;             // "1/4", "1", "5" — text for fractions
  hpFormula: string | null;      // "4d8+4"
  hpDefault: number | null;
  ac: number | null;
  speed: Record<string, number>; // { walk: 30, fly: 60 }
  abilityScores: AbilityScores | null;
  savingThrows: Partial<AbilityScores> | null;
  actions: CreatureAction[];
  actionsMode: 'structured' | 'freetext';
  actionsText: string;           // free-text fallback
  traits: CreatureTrait[];
  customFields: CustomField[];
  tags: string[];
  avatarPath: string | null;     // base64 data URL
  fieldValues: Record<string, unknown> | null; // dynamic field data (new format)
  createdAt: string;
  updatedAt: string;
}

/** Encounter set folder node */
export interface BestiaryFolder {
  id: string;
  parentId: string | null;
  name: string;
  sortOrder: number;
  createdAt: string;
}

/** Creature instance in an encounter set */
export interface CreatureInstance {
  id: string;
  folderId: string;
  templateId: string | null;     // null = orphaned
  instanceName: string | null;   // custom name override
  overrides: Record<string, unknown>; // overridden template fields
  sortOrder: number;
  createdAt: string;
}

/** Resolved instance — template merged with overrides */
export interface ResolvedInstance {
  instance: CreatureInstance;
  resolved: CreatureTemplate;    // merged result
}

/** Tree node for rendering the encounter tree */
export type TreeNodeData =
  | { kind: 'folder'; folder: BestiaryFolder; children: TreeNodeData[] }
  | { kind: 'instance'; instance: CreatureInstance };

/** Bestiary tool state persisted in WindowState.toolState */
export interface BestiaryToolState {
  selectedTemplateId: string | null;
  searchQuery: string;
}

/** Default tool state */
export const DEFAULT_BESTIARY_STATE: BestiaryToolState = {
  selectedTemplateId: null,
  searchQuery: '',
};

/** Encounter Sets tool state persisted in WindowState.toolState */
export interface EncounterSetsToolState {
  selectedInstanceId: string | null;
  expandedFolders: string[];
  searchQuery: string;
}

/** Default encounter sets state */
export const DEFAULT_ENCOUNTER_SETS_STATE: EncounterSetsToolState = {
  selectedInstanceId: null,
  expandedFolders: [],
  searchQuery: '',
};

/** Material Symbols icon name per creature type */
export const CREATURE_TYPE_ICON: Record<CreatureType, string> = {
  aberration: 'visibility',
  beast: 'pets',
  celestial: 'bolt',
  construct: 'shield',
  dragon: 'swords',
  elemental: 'bolt',
  fey: 'draft',
  fiend: 'swords',
  giant: 'shield',
  humanoid: 'category',
  monstrosity: 'swords',
  ooze: 'category',
  plant: 'category',
  undead: 'swords',
  swarm: 'pets',
};

/** CR color coding */
export function getCrColor(cr: string | null): string {
  if (!cr) return 'var(--color-text-muted)';
  const num = parseCr(cr);
  if (num <= 2) return 'var(--color-success)';
  if (num <= 6) return 'var(--color-warning)';
  return 'var(--color-error)';
}

/** Parse CR string to numeric value */
export function parseCr(cr: string): number {
  if (cr.includes('/')) {
    const [num, den] = cr.split('/');
    return Number(num) / Number(den);
  }
  return Number(cr) || 0;
}

/** Create a blank template with just a name */
export function createBlankTemplate(id: string, name: string): CreatureTemplate {
  return {
    id,
    name,
    creatureType: null,
    cr: null,
    hpFormula: null,
    hpDefault: null,
    ac: null,
    speed: {},
    abilityScores: null,
    savingThrows: null,
    actions: [],
    actionsMode: 'structured',
    actionsText: '',
    traits: [],
    customFields: [],
    tags: [],
    avatarPath: null,
    fieldValues: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
