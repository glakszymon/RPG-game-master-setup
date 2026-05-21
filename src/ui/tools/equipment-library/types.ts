/*
 * Equipment & Spells Library — data types for items and spells.
 */

/** Entry categories */
export type LibraryCategory = 'weapon' | 'armor' | 'equipment' | 'magic_item' | 'spell';

/** Item rarity levels */
export type ItemRarity = 'common' | 'uncommon' | 'rare' | 'very_rare' | 'legendary' | 'artifact';

/** Spell schools */
export type SpellSchool =
  | 'abjuration' | 'conjuration' | 'divination' | 'enchantment'
  | 'evocation' | 'illusion' | 'necromancy' | 'transmutation';

/** Data source */
export type EntrySource = 'srd' | 'custom';

/** Full library entry (covers items and spells via nullable fields) */
export interface LibraryEntry {
  id: string;
  source: EntrySource;
  category: LibraryCategory;
  name: string;
  description: string;
  // Item-specific fields (null for spells)
  rarity: ItemRarity | null;
  weight: number | null;
  cost: string | null;
  properties: string[];
  damage: string | null;          // e.g. "1d8", "2d6+1"
  damageType: string | null;      // e.g. "Slashing", "Piercing"
  ac: number | null;              // Armor Class bonus/value
  itemType: string | null;        // e.g. "Melee Weapon", "Heavy Armor", "Shield"
  // Spell-specific fields (null for items)
  spellLevel: number | null;      // 0 = cantrip
  school: SpellSchool | null;
  castingTime: string | null;
  range: string | null;
  components: string | null;
  duration: string | null;
  // Metadata
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

/** Row shape returned from SQLite (JSON fields as strings) */
export interface LibraryEntryRow {
  id: string;
  source: EntrySource;
  category: LibraryCategory;
  name: string;
  description: string | null;
  rarity: string | null;
  weight: number | null;
  cost: string | null;
  properties: string | null;      // JSON
  damage: string | null;
  damage_type: string | null;
  ac: number | null;
  item_type: string | null;
  spell_level: number | null;
  school: string | null;
  casting_time: string | null;
  range_text: string | null;
  components: string | null;
  duration: string | null;
  tags: string | null;            // JSON
  created_at: string;
  updated_at: string;
}

/** Convert DB row to domain object */
export function rowToEntry(row: LibraryEntryRow): LibraryEntry {
  return {
    id: row.id,
    source: row.source,
    category: row.category,
    name: row.name,
    description: row.description ?? '',
    rarity: (row.rarity as ItemRarity) ?? null,
    weight: row.weight,
    cost: row.cost,
    properties: row.properties ? JSON.parse(row.properties) : [],
    damage: row.damage,
    damageType: row.damage_type,
    ac: row.ac,
    itemType: row.item_type,
    spellLevel: row.spell_level,
    school: (row.school as SpellSchool) ?? null,
    castingTime: row.casting_time,
    range: row.range_text,
    components: row.components,
    duration: row.duration,
    tags: row.tags ? JSON.parse(row.tags) : [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** Convert domain object to DB params for INSERT/UPDATE */
export function entryToRow(entry: LibraryEntry): LibraryEntryRow {
  return {
    id: entry.id,
    source: entry.source,
    category: entry.category,
    name: entry.name,
    description: entry.description,
    rarity: entry.rarity,
    weight: entry.weight,
    cost: entry.cost,
    properties: JSON.stringify(entry.properties),
    damage: entry.damage,
    damage_type: entry.damageType,
    ac: entry.ac,
    item_type: entry.itemType,
    spell_level: entry.spellLevel,
    school: entry.school,
    casting_time: entry.castingTime,
    range_text: entry.range,
    components: entry.components,
    duration: entry.duration,
    tags: JSON.stringify(entry.tags),
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
  };
}

/** Filter state for the library UI */
export interface LibraryFilters {
  category: LibraryCategory | 'all';
  searchQuery: string;
  rarity: ItemRarity | null;
  spellLevel: number | null;
  school: SpellSchool | null;
  sourceFilter: EntrySource | 'all';
}

/** Tool state persisted in WindowState.toolState */
export interface EquipmentLibraryToolState {
  selectedEntryId: string | null;
  filters: LibraryFilters;
  formOpen: boolean;
}

/** Default filters */
export const DEFAULT_FILTERS: LibraryFilters = {
  category: 'all',
  searchQuery: '',
  rarity: null,
  spellLevel: null,
  school: null,
  sourceFilter: 'all',
};

/** Default tool state */
export const DEFAULT_TOOL_STATE: EquipmentLibraryToolState = {
  selectedEntryId: null,
  filters: DEFAULT_FILTERS,
  formOpen: false,
};

/** Category display labels */
export const CATEGORY_LABELS: Record<LibraryCategory, string> = {
  weapon: 'Weapons',
  armor: 'Armor',
  equipment: 'Equipment',
  magic_item: 'Magic Items',
  spell: 'Spells',
};

/** Rarity display labels */
export const RARITY_LABELS: Record<ItemRarity, string> = {
  common: 'Common',
  uncommon: 'Uncommon',
  rare: 'Rare',
  very_rare: 'Very Rare',
  legendary: 'Legendary',
  artifact: 'Artifact',
};

/** School display labels */
export const SCHOOL_LABELS: Record<SpellSchool, string> = {
  abjuration: 'Abjuration',
  conjuration: 'Conjuration',
  divination: 'Divination',
  enchantment: 'Enchantment',
  evocation: 'Evocation',
  illusion: 'Illusion',
  necromancy: 'Necromancy',
  transmutation: 'Transmutation',
};
