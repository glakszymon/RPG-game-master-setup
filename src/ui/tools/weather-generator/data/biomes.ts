/*
 * Weather Generator — biome presets
 */

import type { BiomeConfig, BiomeSeasonRanges } from '../types';

/* ── Helper: create symmetric season set with overrides ── */

function makeBiome(
  id: string,
  name: string,
  icon: string,
  activeParams: BiomeConfig['activeParams'],
  base: BiomeSeasonRanges,
  overrides: Partial<Record<'spring' | 'summer' | 'autumn' | 'winter', Partial<BiomeSeasonRanges>>> = {},
): BiomeConfig {
  const seasons = {
    spring: { ...base, ...overrides.spring },
    summer: { ...base, ...overrides.summer },
    autumn: { ...base, ...overrides.autumn },
    winter: { ...base, ...overrides.winter },
  };
  return { id, name, icon, activeParams, seasons };
}

const FULL_PARAMS: BiomeConfig['activeParams'] = [
  'temperature', 'cloud', 'windStrength', 'windDirection', 'humidity', 'precipitation',
];

export const BIOMES: BiomeConfig[] = [
  makeBiome('arctic', 'Arktyczny', '❄️', FULL_PARAMS, {
    temperature: [-40, -10],
    humidity: [20, 50],
    cloudWeights: { clear: 2, lightClouds: 3, overcast: 4, fullOvercast: 1 },
    windWeights: { calm: 1, light: 2, moderate: 3, strong: 3, storm: 1 },
    precipWeights: { none: 4, snow: 4, fog: 1, hail: 1 },
  }, {
    summer: { temperature: [-20, 5], humidity: [30, 60] },
  }),

  makeBiome('temperate', 'Umiarkowany', '🌤️', FULL_PARAMS, {
    temperature: [5, 25],
    humidity: [40, 70],
    cloudWeights: { clear: 3, lightClouds: 3, overcast: 2, fullOvercast: 1 },
    windWeights: { calm: 2, light: 3, moderate: 3, strong: 1, storm: 0 },
    precipWeights: { none: 5, drizzle: 2, rain: 2, fog: 1 },
  }, {
    summer: { temperature: [15, 35], humidity: [30, 60] },
    winter: { temperature: [-15, 5], precipWeights: { none: 3, snow: 4, fog: 2, drizzle: 1 } },
    spring: { temperature: [5, 20], precipWeights: { none: 3, drizzle: 3, rain: 2, fog: 1 } },
    autumn: { temperature: [0, 15], precipWeights: { none: 3, rain: 3, fog: 2, drizzle: 1 } },
  }),

  makeBiome('desert', 'Pustynny', '🏜️', FULL_PARAMS, {
    temperature: [30, 50],
    humidity: [5, 20],
    cloudWeights: { clear: 8, lightClouds: 2, overcast: 0, fullOvercast: 0 },
    windWeights: { calm: 2, light: 2, moderate: 3, strong: 2, storm: 1 },
    precipWeights: { none: 9, drizzle: 1 },
  }, {
    winter: { temperature: [5, 25], humidity: [10, 30] },
  }),

  makeBiome('tropical', 'Tropikalny', '🌴', FULL_PARAMS, {
    temperature: [25, 40],
    humidity: [70, 95],
    cloudWeights: { clear: 2, lightClouds: 3, overcast: 3, fullOvercast: 2 },
    windWeights: { calm: 3, light: 3, moderate: 2, strong: 1, storm: 1 },
    precipWeights: { none: 2, drizzle: 2, rain: 3, heavyRain: 2, fog: 1 },
  }, {
    winter: { humidity: [50, 75], precipWeights: { none: 5, drizzle: 2, rain: 2, fog: 1 } },
  }),

  makeBiome('mountain', 'Górski', '🏔️', FULL_PARAMS, {
    temperature: [-10, 15],
    humidity: [30, 70],
    cloudWeights: { clear: 2, lightClouds: 3, overcast: 3, fullOvercast: 2 },
    windWeights: { calm: 1, light: 2, moderate: 3, strong: 3, storm: 1 },
    precipWeights: { none: 3, snow: 3, rain: 2, fog: 2, hail: 1 },
  }, {
    summer: { temperature: [5, 25], precipWeights: { none: 4, rain: 3, fog: 2, hail: 1 } },
  }),

  makeBiome('maritime', 'Morski', '🌊', FULL_PARAMS, {
    temperature: [10, 25],
    humidity: [60, 85],
    cloudWeights: { clear: 2, lightClouds: 3, overcast: 3, fullOvercast: 2 },
    windWeights: { calm: 1, light: 2, moderate: 3, strong: 3, storm: 1 },
    precipWeights: { none: 3, drizzle: 3, rain: 2, fog: 2 },
  }, {
    winter: { temperature: [0, 12], windWeights: { calm: 0, light: 1, moderate: 2, strong: 4, storm: 3 } },
  }),

  makeBiome('forest', 'Leśny', '🌲', FULL_PARAMS, {
    temperature: [5, 25],
    humidity: [55, 80],
    cloudWeights: { clear: 2, lightClouds: 4, overcast: 3, fullOvercast: 1 },
    windWeights: { calm: 4, light: 3, moderate: 2, strong: 1, storm: 0 },
    precipWeights: { none: 4, drizzle: 3, rain: 2, fog: 2 },
  }, {
    winter: { temperature: [-10, 5], precipWeights: { none: 3, snow: 4, fog: 2 } },
  }),

  makeBiome('steppe', 'Step', '🌾', FULL_PARAMS, {
    temperature: [10, 35],
    humidity: [15, 40],
    cloudWeights: { clear: 5, lightClouds: 3, overcast: 1, fullOvercast: 0 },
    windWeights: { calm: 1, light: 2, moderate: 4, strong: 3, storm: 0 },
    precipWeights: { none: 7, drizzle: 2, rain: 1 },
  }, {
    winter: { temperature: [-20, 5], humidity: [25, 50], precipWeights: { none: 4, snow: 4, fog: 1 } },
  }),

  makeBiome('swamp', 'Bagno / Mokradła', '🐸', FULL_PARAMS, {
    temperature: [10, 30],
    humidity: [75, 100],
    cloudWeights: { clear: 1, lightClouds: 2, overcast: 4, fullOvercast: 3 },
    windWeights: { calm: 4, light: 3, moderate: 2, strong: 1, storm: 0 },
    precipWeights: { none: 2, drizzle: 3, rain: 2, fog: 4 },
  }, {
    winter: { temperature: [-5, 10] },
  }),

  makeBiome('underground', 'Podziemia', '🕳️', ['temperature', 'humidity', 'airFlow'], {
    temperature: [8, 18],
    humidity: [60, 95],
    cloudWeights: {},
    windWeights: {},
    precipWeights: {},
    airFlowWeights: { still: 5, lightDraft: 3, strongDraft: 1 },
  }),
];
