/*
 * srdConversion — converts raw SRD monster JSON entries into CreatureTemplate-like
 * row data suitable for bulk insertion into bestiary_templates.
 *
 * Runs in the main process (Node.js) during database seeding.
 * Generates field_values compatible with the dynamic field system (defaultCreatureStructure).
 */

/** Raw shape of a single entry in assets/monsters.json */
export interface SrdMonsterRaw {
  name: string;
  size: string;
  type: string;
  subtype: string;
  alignment: string;
  armor_class: number;
  hit_points: number;
  hit_dice: string;
  speed: string;
  strength: number;
  dexterity: number;
  constitution: number;
  intelligence: number;
  wisdom: number;
  charisma: number;
  constitution_save?: number | null;
  intelligence_save?: number | null;
  wisdom_save?: number | null;
  strength_save?: number | null;
  dexterity_save?: number | null;
  charisma_save?: number | null;
  // Skills
  acrobatics?: number | null;
  arcana?: number | null;
  athletics?: number | null;
  deception?: number | null;
  history?: number | null;
  insight?: number | null;
  intimidation?: number | null;
  investigation?: number | null;
  medicine?: number | null;
  nature?: number | null;
  perception?: number | null;
  performance?: number | null;
  persuasion?: number | null;
  religion?: number | null;
  stealth?: number | null;
  survival?: number | null;
  // Other
  damage_vulnerabilities: string;
  damage_resistances: string;
  damage_immunities: string;
  condition_immunities: string;
  senses: string;
  languages: string;
  challenge_rating: string;
  special_abilities?: Array<{ name: string; desc: string; attack_bonus?: number }>;
  actions?: Array<{ name: string; desc: string; attack_bonus?: number; damage_dice?: string; damage_bonus?: number }>;
  reactions?: Array<{ name: string; desc: string; attack_bonus?: number }>;
  legendary_desc?: string;
  legendary_actions?: Array<{ name: string; desc: string; attack_bonus?: number }>;
  spells?: string;
  speed_json?: Record<string, number>;
  armor_desc?: string;
  group?: string;
}

/** Row data ready for insertion into bestiary_templates */
export interface SrdTemplateRow {
  id: string;
  name: string;
  creature_type: string | null;
  cr: string | null;
  hp_formula: string | null;
  hp_default: number | null;
  ac: number | null;
  speed: string;           // JSON string of Record<string, number>
  ability_scores: string;  // JSON string of AbilityScores
  saving_throws: string | null; // JSON string
  actions: string;         // JSON string of CreatureAction[]
  actions_mode: string;
  actions_text: string;
  traits: string;          // JSON string of CreatureTrait[]
  custom_fields: string;   // JSON string of CustomField[]
  tags: string;            // JSON string of string[]
  avatar_path: null;
  field_values: string;    // JSON string — populated for filter compatibility
  created_at: string;
  updated_at: string;
}

const VALID_CREATURE_TYPES = new Set([
  'aberration', 'beast', 'celestial', 'construct', 'dragon',
  'elemental', 'fey', 'fiend', 'giant', 'humanoid',
  'monstrosity', 'ooze', 'plant', 'undead', 'swarm',
]);

/** Generate a deterministic ID from a monster name */
function makeSrdId(name: string): string {
  return 'srd-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

/** Parse speed string like "30 ft., fly 60 ft., swim 40 ft." into Record */
function parseSpeed(speedStr: string, speedJson?: Record<string, number>): Record<string, number> {
  if (speedJson && Object.keys(speedJson).length > 0) {
    return speedJson;
  }

  const result: Record<string, number> = {};
  const regex = /(?:(\w+)\s+)?(\d+)\s*ft\.?/gi;
  let match: RegExpExecArray | null;
  let isFirst = true;

  while ((match = regex.exec(speedStr)) !== null) {
    const mode = match[1]?.toLowerCase() || (isFirst ? 'walk' : 'walk');
    const value = Number(match[2]);
    result[mode] = value;
    isFirst = false;
  }

  return result;
}

/** Parse senses string like "darkvision 120 ft., passive Perception 20" into Record */
function parseSenses(sensesStr: string): Record<string, number | null> {
  const result: Record<string, number | null> = {};
  const senseTypes = ['darkvision', 'blindsight', 'tremorsense', 'truesight'];

  for (const sense of senseTypes) {
    const regex = new RegExp(`${sense}\\s+(\\d+)\\s*ft\\.?`, 'i');
    const match = sensesStr.match(regex);
    if (match) {
      result[sense] = Number(match[1]);
    }
  }

  return result;
}

/** Parse a comma-separated damage/condition string into tags array */
function parseCommaSeparated(str: string): string[] {
  if (!str || !str.trim()) return [];
  return str.split(',').map(s => s.trim()).filter(Boolean);
}

/** Parse languages string into array */
function parseLanguages(str: string): string[] {
  if (!str || !str.trim() || str === '--' || str === '-') return [];
  return str.split(',').map(s => s.trim()).filter(Boolean);
}

/** Map raw creature type to valid CreatureType or null */
function mapCreatureType(raw: string): string | null {
  const lower = raw.toLowerCase().trim();
  if (VALID_CREATURE_TYPES.has(lower)) return lower;
  if (lower.includes('swarm')) return 'swarm';
  return null;
}

/** Capitalize first letter for select field values */
function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Map alignment string to closest standard option */
function mapAlignment(raw: string): string | null {
  if (!raw) return null;
  const lower = raw.toLowerCase();
  const map: Record<string, string> = {
    'lawful good': 'Lawful Good',
    'neutral good': 'Neutral Good',
    'chaotic good': 'Chaotic Good',
    'lawful neutral': 'Lawful Neutral',
    'true neutral': 'True Neutral',
    'neutral': 'True Neutral',
    'chaotic neutral': 'Chaotic Neutral',
    'lawful evil': 'Lawful Evil',
    'neutral evil': 'Neutral Evil',
    'chaotic evil': 'Chaotic Evil',
    'unaligned': 'Unaligned',
    'any alignment': 'Any Alignment',
  };
  return map[lower] ?? null;
}

/** Parse CR string to numeric value */
function parseCrToNumber(cr: string): number {
  if (cr.includes('/')) {
    const [num, den] = cr.split('/');
    return Number(num) / Number(den);
  }
  return Number(cr) || 0;
}

/** Generate a simple unique ID for actions/traits */
function actionId(prefix: string, index: number): string {
  return `${prefix}-${index}`;
}

/** Skill name mapping from JSON key to display name */
const SKILL_MAP: Record<string, string> = {
  acrobatics: 'Acrobatics',
  arcana: 'Arcana',
  athletics: 'Athletics',
  deception: 'Deception',
  history: 'History',
  insight: 'Insight',
  intimidation: 'Intimidation',
  investigation: 'Investigation',
  medicine: 'Medicine',
  nature: 'Nature',
  perception: 'Perception',
  performance: 'Performance',
  persuasion: 'Persuasion',
  religion: 'Religion',
  stealth: 'Stealth',
  survival: 'Survival',
};

/** Convert a single SRD monster to a template row */
export function convertSrdMonster(raw: SrdMonsterRaw): SrdTemplateRow {
  const now = new Date().toISOString();
  const id = makeSrdId(raw.name);
  const ct = mapCreatureType(raw.type);

  // Ability scores
  const abilityScores = {
    str: raw.strength ?? 10,
    dex: raw.dexterity ?? 10,
    con: raw.constitution ?? 10,
    int: raw.intelligence ?? 10,
    wis: raw.wisdom ?? 10,
    cha: raw.charisma ?? 10,
  };

  // Saving throws (only include non-null values)
  const saves: Record<string, number> = {};
  if (raw.strength_save) saves.str = raw.strength_save;
  if (raw.dexterity_save) saves.dex = raw.dexterity_save;
  if (raw.constitution_save) saves.con = raw.constitution_save;
  if (raw.intelligence_save) saves.int = raw.intelligence_save;
  if (raw.wisdom_save) saves.wis = raw.wisdom_save;
  if (raw.charisma_save) saves.cha = raw.charisma_save;

  // Speed
  const speedRecord = parseSpeed(raw.speed, raw.speed_json);

  // Actions (regular)
  const actions = (raw.actions ?? []).map((a, i) => ({
    id: actionId('act', i),
    name: a.name,
    description: a.desc,
    toHit: a.attack_bonus || undefined,
    damage: a.damage_dice ? `${a.damage_dice}${a.damage_bonus ? '+' + a.damage_bonus : ''}` : undefined,
    isLegendary: false,
  }));

  // Legendary actions
  const legendaryActions = (raw.legendary_actions ?? []).map((a, i) => ({
    id: actionId('leg', i),
    name: a.name,
    description: a.desc,
    isLegendary: true,
  }));

  const allActions = [...actions, ...legendaryActions];

  // Traits from special_abilities
  const traits = (raw.special_abilities ?? []).map((t, i) => ({
    id: actionId('trait', i),
    name: t.name,
    description: t.desc,
  }));

  // Reactions
  const reactions = (raw.reactions ?? []).map((r, i) => ({
    id: actionId('react', i),
    name: r.name,
    description: r.desc,
  }));

  // Skills
  const skills: Array<{ name: string; bonus: number }> = [];
  for (const [key, displayName] of Object.entries(SKILL_MAP)) {
    const val = raw[key as keyof SrdMonsterRaw] as number | null | undefined;
    if (val != null && typeof val === 'number') {
      skills.push({ name: displayName, bonus: val });
    }
  }

  // Tags
  const tags: string[] = ['source:srd'];
  if (ct) tags.push(`type:${ct}`);
  if (raw.size) tags.push(`size:${raw.size.toLowerCase()}`);
  if (raw.subtype) tags.push(`subtype:${raw.subtype.toLowerCase()}`);

  // Custom fields (legacy column — keep minimal)
  const customFields: Array<{ key: string; value: string }> = [];
  if (raw.legendary_desc) customFields.push({ key: 'Legendary Description', value: raw.legendary_desc });
  if (raw.armor_desc) customFields.push({ key: 'Armor Description', value: raw.armor_desc });
  if (raw.spells) customFields.push({ key: 'Spells', value: raw.spells });

  // ── Build field_values matching defaultCreatureStructure field IDs & types ──
  const fieldValues: Record<string, unknown> = {};

  // Header fields
  const alignment = mapAlignment(raw.alignment);
  if (alignment) {
    fieldValues['alignment'] = { type: 'select', selected: alignment };
  }
  fieldValues['cr'] = { type: 'number', value: parseCrToNumber(raw.challenge_rating) };

  // Combat
  fieldValues['ac'] = { type: 'number', value: raw.armor_class };
  fieldValues['hp_default'] = { type: 'number', value: raw.hit_points };
  if (raw.hit_dice) {
    fieldValues['hp_formula'] = { type: 'text-field', value: raw.hit_dice };
  }
  // Speed as speed-list (Record<string, number | null>)
  fieldValues['speed'] = { type: 'speed-list', values: speedRecord };

  // Abilities
  fieldValues['ability_scores'] = {
    type: 'stat-block',
    scores: { ...abilityScores },
    modifiers: {},
    saves: Object.keys(saves).length > 0 ? { ...saves } : {},
  };

  // Skills
  if (skills.length > 0) {
    fieldValues['skills'] = { type: 'skill-list', skills };
  }

  // Defenses
  const resistances = parseCommaSeparated(raw.damage_resistances);
  if (resistances.length > 0) {
    fieldValues['resistances'] = { type: 'tag-list', tags: resistances };
  }
  const vulnerabilities = parseCommaSeparated(raw.damage_vulnerabilities);
  if (vulnerabilities.length > 0) {
    fieldValues['vulnerabilities'] = { type: 'tag-list', tags: vulnerabilities };
  }
  const damageImmunities = parseCommaSeparated(raw.damage_immunities);
  if (damageImmunities.length > 0) {
    fieldValues['immunities_damage'] = { type: 'tag-list', tags: damageImmunities };
  }
  const conditionImmunities = parseCommaSeparated(raw.condition_immunities);
  if (conditionImmunities.length > 0) {
    fieldValues['immunities_condition'] = { type: 'tag-list', tags: conditionImmunities };
  }

  // Senses as speed-list
  const sensesRecord = parseSenses(raw.senses);
  if (Object.keys(sensesRecord).length > 0) {
    fieldValues['senses'] = { type: 'speed-list', values: sensesRecord };
  }

  // Languages
  const languages = parseLanguages(raw.languages);
  if (languages.length > 0) {
    fieldValues['languages'] = { type: 'tag-list', tags: languages };
  }

  // Info — size and creature_type as select
  if (raw.size) {
    fieldValues['size'] = { type: 'select', selected: capitalize(raw.size.toLowerCase()) };
  }
  if (ct) {
    fieldValues['creature_type'] = { type: 'select', selected: capitalize(ct) };
  }

  // Traits
  if (traits.length > 0) {
    fieldValues['traits'] = {
      type: 'action-list',
      actions: traits.map(t => ({ id: t.id, name: t.name, description: t.description })),
    };
  }

  // Actions
  if (actions.length > 0) {
    fieldValues['actions'] = {
      type: 'action-list',
      actions: actions.map(a => ({
        id: a.id,
        name: a.name,
        description: a.description,
        toHit: a.toHit,
        damage: a.damage,
      })),
    };
  }

  // Reactions
  if (reactions.length > 0) {
    fieldValues['reactions'] = {
      type: 'action-list',
      actions: reactions.map(r => ({ id: r.id, name: r.name, description: r.description })),
    };
  }

  // Legendary Actions
  if (legendaryActions.length > 0) {
    fieldValues['legendary_actions'] = {
      type: 'action-list',
      actions: legendaryActions.map(a => ({ id: a.id, name: a.name, description: a.description })),
    };
  }

  return {
    id,
    name: raw.name,
    creature_type: ct,
    cr: raw.challenge_rating || null,
    hp_formula: raw.hit_dice || null,
    hp_default: raw.hit_points ?? null,
    ac: raw.armor_class ?? null,
    speed: JSON.stringify(speedRecord),
    ability_scores: JSON.stringify(abilityScores),
    saving_throws: Object.keys(saves).length > 0 ? JSON.stringify(saves) : null,
    actions: JSON.stringify(allActions),
    actions_mode: 'structured',
    actions_text: '',
    traits: JSON.stringify(traits),
    custom_fields: JSON.stringify(customFields),
    tags: JSON.stringify(tags),
    avatar_path: null,
    field_values: JSON.stringify(fieldValues),
    created_at: now,
    updated_at: now,
  };
}

/** Convert all monsters from the raw JSON array */
export function convertAllSrdMonsters(monsters: SrdMonsterRaw[]): SrdTemplateRow[] {
  return monsters.map(convertSrdMonster);
}
