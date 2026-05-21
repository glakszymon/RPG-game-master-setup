/*
 * srdConversion — converts raw SRD monster JSON entries into CreatureTemplate-like
 * row data suitable for bulk insertion into bestiary_templates.
 *
 * Runs in the main process (Node.js) during database seeding.
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
  damage_vulnerabilities: string;
  damage_resistances: string;
  damage_immunities: string;
  condition_immunities: string;
  senses: string;
  languages: string;
  challenge_rating: string;
  special_abilities?: Array<{ name: string; desc: string; attack_bonus?: number }>;
  actions?: Array<{ name: string; desc: string; attack_bonus?: number; damage_dice?: string; damage_bonus?: number }>;
  legendary_desc?: string;
  legendary_actions?: Array<{ name: string; desc: string; attack_bonus?: number }>;
  speed_json?: Record<string, number>;
  armor_desc?: string;
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
  field_values: null;      // Will be populated by migration if needed
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
  // Prefer pre-parsed speed_json if available
  if (speedJson && Object.keys(speedJson).length > 0) {
    return speedJson;
  }

  const result: Record<string, number> = {};
  // Match patterns like "30 ft." or "fly 60 ft."
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

/** Map raw creature type to valid CreatureType or null */
function mapCreatureType(raw: string): string | null {
  const lower = raw.toLowerCase().trim();
  if (VALID_CREATURE_TYPES.has(lower)) return lower;
  // Some entries have compound types like "swarm of Tiny beasts"
  if (lower.includes('swarm')) return 'swarm';
  return null;
}

/** Generate a simple unique ID for actions/traits */
function actionId(prefix: string, index: number): string {
  return `${prefix}-${index}`;
}

/** Convert a single SRD monster to a template row */
export function convertSrdMonster(raw: SrdMonsterRaw): SrdTemplateRow {
  const now = new Date().toISOString();
  const id = makeSrdId(raw.name);

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

  // Custom fields for data that doesn't map to standard fields
  const customFields: Array<{ key: string; value: string }> = [];
  if (raw.damage_vulnerabilities) customFields.push({ key: 'Damage Vulnerabilities', value: raw.damage_vulnerabilities });
  if (raw.damage_resistances) customFields.push({ key: 'Damage Resistances', value: raw.damage_resistances });
  if (raw.damage_immunities) customFields.push({ key: 'Damage Immunities', value: raw.damage_immunities });
  if (raw.condition_immunities) customFields.push({ key: 'Condition Immunities', value: raw.condition_immunities });
  if (raw.senses) customFields.push({ key: 'Senses', value: raw.senses });
  if (raw.languages) customFields.push({ key: 'Languages', value: raw.languages });
  if (raw.alignment) customFields.push({ key: 'Alignment', value: raw.alignment });
  if (raw.legendary_desc) customFields.push({ key: 'Legendary Description', value: raw.legendary_desc });
  if (raw.armor_desc) customFields.push({ key: 'Armor Description', value: raw.armor_desc });

  // Tags
  const tags: string[] = ['source:srd'];
  const ct = mapCreatureType(raw.type);
  if (ct) tags.push(`type:${ct}`);
  if (raw.size) tags.push(`size:${raw.size.toLowerCase()}`);
  if (raw.subtype) tags.push(`subtype:${raw.subtype.toLowerCase()}`);

  return {
    id,
    name: raw.name,
    creature_type: ct,
    cr: raw.challenge_rating || null,
    hp_formula: raw.hit_dice || null,
    hp_default: raw.hit_points ?? null,
    ac: raw.armor_class ?? null,
    speed: JSON.stringify(parseSpeed(raw.speed, raw.speed_json)),
    ability_scores: JSON.stringify(abilityScores),
    saving_throws: Object.keys(saves).length > 0 ? JSON.stringify(saves) : null,
    actions: JSON.stringify(allActions),
    actions_mode: 'structured',
    actions_text: '',
    traits: JSON.stringify(traits),
    custom_fields: JSON.stringify(customFields),
    tags: JSON.stringify(tags),
    avatar_path: null,
    field_values: null,
    created_at: now,
    updated_at: now,
  };
}

/** Convert all monsters from the raw JSON array */
export function convertAllSrdMonsters(monsters: SrdMonsterRaw[]): SrdTemplateRow[] {
  return monsters.map(convertSrdMonster);
}
