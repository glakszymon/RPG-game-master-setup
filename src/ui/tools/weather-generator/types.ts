/*
 * Weather Generator — data types
 */

/* ── Enums & Constants ── */

export type CloudLevel = 'clear' | 'lightClouds' | 'overcast' | 'fullOvercast';
export type WindStrength = 'calm' | 'light' | 'moderate' | 'strong' | 'storm';
export type WindDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
export type Precipitation = 'none' | 'drizzle' | 'rain' | 'heavyRain' | 'snow' | 'hail' | 'fog' | 'sandstorm';
export type TimeOfDay = 'dawn' | 'day' | 'dusk' | 'night';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';
export type AirFlow = 'still' | 'lightDraft' | 'strongDraft';

export const CLOUD_LABELS: Record<CloudLevel, string> = {
  clear: 'Bezchmurnie',
  lightClouds: 'Lekkie chmury',
  overcast: 'Pochmurno',
  fullOvercast: 'Całkowite zachmurzenie',
};

export const WIND_LABELS: Record<WindStrength, string> = {
  calm: 'Cisza',
  light: 'Lekki',
  moderate: 'Umiarkowany',
  strong: 'Silny',
  storm: 'Sztormowy',
};

export const WIND_DIRECTION_LABELS: Record<WindDirection, string> = {
  N: 'Północ', NE: 'Płn-Wsch', E: 'Wschód', SE: 'Płd-Wsch',
  S: 'Południe', SW: 'Płd-Zach', W: 'Zachód', NW: 'Płn-Zach',
};

export const PRECIPITATION_LABELS: Record<Precipitation, string> = {
  none: 'Brak', drizzle: 'Mżawka', rain: 'Deszcz', heavyRain: 'Ulewa',
  snow: 'Śnieg', hail: 'Grad', fog: 'Mgła', sandstorm: 'Burza piaskowa',
};

export const TIME_OF_DAY_LABELS: Record<TimeOfDay, string> = {
  dawn: 'Świt', day: 'Dzień', dusk: 'Zmierzch', night: 'Noc',
};

export const SEASON_LABELS: Record<Season, string> = {
  spring: 'Wiosna', summer: 'Lato', autumn: 'Jesień', winter: 'Zima',
};

export const AIR_FLOW_LABELS: Record<AirFlow, string> = {
  still: 'Cisza', lightDraft: 'Lekki przeciąg', strongDraft: 'Silny przeciąg',
};

/* ── Parameter Types ── */

export type ParameterKey =
  | 'temperature'
  | 'cloud'
  | 'windStrength'
  | 'windDirection'
  | 'humidity'
  | 'precipitation'
  | 'airFlow';

export interface WeatherParams {
  temperature: number;
  cloud: CloudLevel;
  windStrength: WindStrength;
  windDirection: WindDirection;
  humidity: number;
  precipitation: Precipitation;
  airFlow: AirFlow;
  timeOfDay: TimeOfDay;
  season: Season;
}

/* ── Biome Types ── */

export interface BiomeSeasonRanges {
  temperature: [min: number, max: number];
  humidity: [min: number, max: number];
  cloudWeights: Partial<Record<CloudLevel, number>>;
  windWeights: Partial<Record<WindStrength, number>>;
  precipWeights: Partial<Record<Precipitation, number>>;
  airFlowWeights?: Partial<Record<AirFlow, number>>;
  /** Temperature offset applied at night (negative = colder). Dawn/dusk get half. */
  nightTempOffset?: number;
}

export interface BiomeConfig {
  id: string;
  name: string;
  icon: string;
  activeParams: ParameterKey[];
  seasons: Record<Season, BiomeSeasonRanges>;
  /** Underground biomes ignore time-of-day modifiers and fix base visibility at 20% */
  ignoresTimeOfDay?: boolean;
  /** Allowed precipitation types (if set, only these are available) */
  allowedPrecipitation?: Precipitation[];
}

/* ── Phrase Engine Types ── */

export interface PhraseConditions {
  temperature?: [min: number, max: number];
  cloud?: CloudLevel[];
  wind?: WindStrength[];
  precipitation?: Precipitation[];
  humidity?: [min: number, max: number];
  timeOfDay?: TimeOfDay[];
  airFlow?: AirFlow[];
}

export type MechanicalCategory = 'visibility' | 'travel' | 'resources' | 'hazard';

export interface MechanicalEffect {
  category: MechanicalCategory;
  icon: string;
  label: string;
  description: string;
}

export interface PhraseEntry {
  conditions: PhraseConditions;
  narrative: string[];
  mechanical: MechanicalEffect[];
}

/* ── Output Types ── */

export interface WeatherResult {
  narrative: string;
  effects: MechanicalEffect[];
  generatedAt: number;
}

/* ── Tool State ── */

export interface WeatherGeneratorState {
  selectedBiome: string;
  params: WeatherParams;
  timeSource: 'auto' | 'manual';
  lastResult: WeatherResultV2 | null;
}

export const DEFAULT_PARAMS: WeatherParams = {
  temperature: 20,
  cloud: 'clear',
  windStrength: 'calm',
  windDirection: 'N',
  humidity: 50,
  precipitation: 'none',
  airFlow: 'still',
  timeOfDay: 'day',
  season: 'summer',
};

export const DEFAULT_WEATHER_STATE: WeatherGeneratorState = {
  selectedBiome: 'temperate',
  params: DEFAULT_PARAMS,
  timeSource: 'auto',
  lastResult: null,
};

/* ── Numeric Modifier System (Phase 3) ── */

/** Internal stat keys used for multiplicative stacking */
export type WeatherStat =
  | 'visibility'
  | 'hearing'
  | 'rangedAccuracy'
  | 'stealth'
  | 'movement'
  | 'tracking'
  | 'breathing'
  | 'balance'
  | 'initiative'
  | 'campTime'
  | 'waterConsumption'
  | 'fuelConsumption'
  | 'equipmentDamage'
  | 'magicAccuracy'
  | 'thrownWeapons'
  | 'flying';

/** D&D 5e skills/rolls that weather stats map to */
export type DndRoll =
  | 'Perception'
  | 'Investigation'
  | 'Survival'
  | 'Stealth'
  | 'Athletics'
  | 'Acrobatics'
  | 'Animal Handling'
  | 'Constitution save'
  | 'Initiative'
  | 'Ranged attack'
  | 'Spell attack';

/** Mapping from weather stat to affected D&D rolls */
export const STAT_TO_ROLLS: Record<WeatherStat, DndRoll[]> = {
  visibility: ['Perception', 'Investigation', 'Survival'],
  hearing: ['Perception'],
  rangedAccuracy: ['Ranged attack', 'Spell attack'],
  stealth: ['Stealth'],
  movement: ['Athletics', 'Acrobatics', 'Animal Handling'],
  tracking: ['Survival', 'Investigation'],
  breathing: ['Constitution save'],
  balance: ['Acrobatics'],
  initiative: ['Initiative'],
  campTime: [],
  waterConsumption: [],
  fuelConsumption: [],
  equipmentDamage: [],
  magicAccuracy: ['Spell attack'],
  thrownWeapons: ['Ranged attack'],
  flying: ['Acrobatics'],
};

/** Polish labels for stats */
export const STAT_LABELS: Record<WeatherStat, string> = {
  visibility: 'Widoczność',
  hearing: 'Słuch',
  rangedAccuracy: 'Celność dystans',
  stealth: 'Skradanie',
  movement: 'Ruch',
  tracking: 'Tropienie',
  breathing: 'Oddychanie',
  balance: 'Równowaga',
  initiative: 'Inicjatywa',
  campTime: 'Czas obozu',
  waterConsumption: 'Woda',
  fuelConsumption: 'Opał',
  equipmentDamage: 'Ekwipunek',
  magicAccuracy: 'Celność magii',
  thrownWeapons: 'Broń miotana',
  flying: 'Latanie',
};

/** 6 display categories (Polish) */
export type MechanicalCategoryV2 =
  | 'movement'
  | 'combat'
  | 'resources'
  | 'perception'
  | 'stealth'
  | 'hazards';

export const CATEGORY_V2_LABELS: Record<MechanicalCategoryV2, string> = {
  movement: 'Ruch',
  combat: 'Walka / Balistyka',
  resources: 'Zasoby / Przetrwanie',
  perception: 'Percepcja / Widoczność',
  stealth: 'Skradanie / Tropienie',
  hazards: 'Zagrożenia / Hazardy',
};

export const CATEGORY_V2_ICONS: Record<MechanicalCategoryV2, string> = {
  movement: 'directions_run',
  combat: 'gps_fixed',
  resources: 'inventory_2',
  perception: 'visibility',
  stealth: 'footprint',
  hazards: 'warning',
};

/** Which category each stat belongs to */
export const STAT_CATEGORY: Record<WeatherStat, MechanicalCategoryV2> = {
  visibility: 'perception',
  hearing: 'perception',
  rangedAccuracy: 'combat',
  stealth: 'stealth',
  movement: 'movement',
  tracking: 'stealth',
  breathing: 'hazards',
  balance: 'movement',
  initiative: 'combat',
  campTime: 'resources',
  waterConsumption: 'resources',
  fuelConsumption: 'resources',
  equipmentDamage: 'resources',
  magicAccuracy: 'combat',
  thrownWeapons: 'combat',
  flying: 'movement',
};

/** Single computed modifier result for one stat */
export interface StatModifier {
  stat: WeatherStat;
  percentMod: number; // final % modifier (e.g., -40 means 60% of base)
  rollModifiers: Array<{ roll: DndRoll; mod: number }>; // converted D&D bonuses
}

/** Hazard entry (non-numeric special effects) */
export interface HazardEffect {
  icon: string;
  label: string;
  description: string;
}

/** Full mechanical result from the engine */
export interface MechanicalResult {
  modifiers: StatModifier[];
  hazards: HazardEffect[];
}

/** Updated WeatherResult including numeric mechanics */
export interface WeatherResultV2 {
  narrative: string;
  effects: MechanicalEffect[]; // legacy (kept for compatibility during transition)
  mechanics: MechanicalResult;
  generatedAt: number;
}
