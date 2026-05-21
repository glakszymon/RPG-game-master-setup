/*
 * Weather Generator — data types
 */

/* ── Enums & Constants ── */

export type CloudLevel = 'clear' | 'lightClouds' | 'overcast' | 'fullOvercast';
export type WindStrength = 'calm' | 'light' | 'moderate' | 'strong' | 'storm';
export type WindDirection = 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SW' | 'W' | 'NW';
export type Precipitation = 'none' | 'drizzle' | 'rain' | 'heavyRain' | 'snow' | 'hail' | 'fog';
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
  snow: 'Śnieg', hail: 'Grad', fog: 'Mgła',
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
}

export interface BiomeConfig {
  id: string;
  name: string;
  icon: string;
  activeParams: ParameterKey[];
  seasons: Record<Season, BiomeSeasonRanges>;
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
  lastResult: WeatherResult | null;
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
