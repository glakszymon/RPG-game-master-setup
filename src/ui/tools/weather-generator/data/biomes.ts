/*
 * Weather Generator — biome presets
 *
 * Temperature ranges represent DAYTIME values.
 * nightTempOffset is applied to shift temperature for night (dawn/dusk get half).
 * Realistic: desert has huge diurnal swing, maritime is stable, etc.
 */

import type { BiomeConfig, BiomeSeasonRanges } from '../types';

function makeBiome(
  id: string,
  name: string,
  icon: string,
  activeParams: BiomeConfig['activeParams'],
  base: BiomeSeasonRanges,
  overrides: Partial<Record<'spring' | 'summer' | 'autumn' | 'winter', Partial<BiomeSeasonRanges>>> = {},
  extra?: { ignoresTimeOfDay?: boolean; allowedPrecipitation?: BiomeConfig['allowedPrecipitation'] },
): BiomeConfig {
  const seasons = {
    spring: { ...base, ...overrides.spring },
    summer: { ...base, ...overrides.summer },
    autumn: { ...base, ...overrides.autumn },
    winter: { ...base, ...overrides.winter },
  };
  return { id, name, icon, activeParams, seasons, ...extra };
}

const FULL_PARAMS: BiomeConfig['activeParams'] = [
  'temperature', 'cloud', 'windStrength', 'windDirection', 'humidity', 'precipitation',
];

export const BIOMES: BiomeConfig[] = [
  makeBiome('arctic', 'Arktyczny', 'ac_unit', FULL_PARAMS, {
    temperature: [-30, -10],
    humidity: [20, 50],
    nightTempOffset: -8,
    cloudWeights: { clear: 2, lightClouds: 3, overcast: 4, fullOvercast: 1 },
    windWeights: { calm: 1, light: 2, moderate: 3, strong: 3, storm: 1 },
    precipWeights: { none: 4, snow: 4, fog: 1, hail: 1 },
  }, {
    summer: { temperature: [-10, 5], humidity: [30, 60], nightTempOffset: -6 },
    winter: { temperature: [-45, -20], nightTempOffset: -10 },
  }),

  makeBiome('temperate', 'Umiarkowany', 'park', FULL_PARAMS, {
    temperature: [8, 22],
    humidity: [40, 70],
    nightTempOffset: -8,
    cloudWeights: { clear: 3, lightClouds: 3, overcast: 2, fullOvercast: 1 },
    windWeights: { calm: 2, light: 3, moderate: 3, strong: 1, storm: 0 },
    precipWeights: { none: 5, drizzle: 2, rain: 2, fog: 1 },
  }, {
    summer: { temperature: [20, 35], humidity: [30, 55], nightTempOffset: -10 },
    winter: { temperature: [-10, 3], nightTempOffset: -6, precipWeights: { none: 3, snow: 4, fog: 2, drizzle: 1 } },
    spring: { temperature: [5, 18], precipWeights: { none: 3, drizzle: 3, rain: 2, fog: 1 } },
    autumn: { temperature: [2, 14], humidity: [50, 80], precipWeights: { none: 3, rain: 3, fog: 2, drizzle: 1 } },
  }),

  makeBiome('desert', 'Pustynny', 'sunny', FULL_PARAMS, {
    temperature: [35, 50],
    humidity: [5, 15],
    nightTempOffset: -25,
    cloudWeights: { clear: 8, lightClouds: 2, overcast: 0, fullOvercast: 0 },
    windWeights: { calm: 2, light: 2, moderate: 3, strong: 2, storm: 1 },
    precipWeights: { none: 7, drizzle: 1, sandstorm: 2 },
  }, {
    winter: { temperature: [15, 28], humidity: [10, 25], nightTempOffset: -20 },
    spring: { temperature: [25, 40], nightTempOffset: -22 },
    autumn: { temperature: [20, 38], nightTempOffset: -22 },
  }),

  makeBiome('tropical', 'Tropikalny', 'forest', FULL_PARAMS, {
    temperature: [28, 38],
    humidity: [70, 95],
    nightTempOffset: -4,
    cloudWeights: { clear: 2, lightClouds: 3, overcast: 3, fullOvercast: 2 },
    windWeights: { calm: 3, light: 3, moderate: 2, strong: 1, storm: 1 },
    precipWeights: { none: 2, drizzle: 2, rain: 3, heavyRain: 2, fog: 1 },
  }, {
    winter: { temperature: [22, 30], humidity: [50, 75], nightTempOffset: -5, precipWeights: { none: 5, drizzle: 2, rain: 2, fog: 1 } },
  }),

  makeBiome('mountain', 'Górski', 'landscape', FULL_PARAMS, {
    temperature: [-5, 15],
    humidity: [30, 70],
    nightTempOffset: -12,
    cloudWeights: { clear: 2, lightClouds: 3, overcast: 3, fullOvercast: 2 },
    windWeights: { calm: 1, light: 2, moderate: 3, strong: 3, storm: 1 },
    precipWeights: { none: 3, snow: 3, rain: 2, fog: 2, hail: 1 },
  }, {
    summer: { temperature: [10, 25], nightTempOffset: -14, precipWeights: { none: 4, rain: 3, fog: 2, hail: 1 } },
    winter: { temperature: [-20, 0], nightTempOffset: -10, precipWeights: { none: 2, snow: 5, fog: 2, hail: 1 } },
  }),

  makeBiome('maritime', 'Morski', 'waves', FULL_PARAMS, {
    temperature: [12, 22],
    humidity: [65, 85],
    nightTempOffset: -4,
    cloudWeights: { clear: 2, lightClouds: 3, overcast: 3, fullOvercast: 2 },
    windWeights: { calm: 1, light: 2, moderate: 3, strong: 3, storm: 1 },
    precipWeights: { none: 3, drizzle: 3, rain: 2, fog: 2 },
  }, {
    summer: { temperature: [18, 28], nightTempOffset: -5 },
    winter: { temperature: [2, 10], nightTempOffset: -3, windWeights: { calm: 0, light: 1, moderate: 2, strong: 4, storm: 3 } },
  }),

  makeBiome('forest', 'Leśny', 'eco', FULL_PARAMS, {
    temperature: [8, 24],
    humidity: [55, 80],
    nightTempOffset: -6,
    cloudWeights: { clear: 2, lightClouds: 4, overcast: 3, fullOvercast: 1 },
    windWeights: { calm: 4, light: 3, moderate: 2, strong: 1, storm: 0 },
    precipWeights: { none: 4, drizzle: 3, rain: 2, fog: 2 },
  }, {
    summer: { temperature: [16, 30], nightTempOffset: -8 },
    winter: { temperature: [-8, 4], nightTempOffset: -5, precipWeights: { none: 3, snow: 4, fog: 2 } },
  }),

  makeBiome('steppe', 'Step', 'grass', FULL_PARAMS, {
    temperature: [15, 35],
    humidity: [15, 35],
    nightTempOffset: -18,
    cloudWeights: { clear: 5, lightClouds: 3, overcast: 1, fullOvercast: 0 },
    windWeights: { calm: 1, light: 2, moderate: 4, strong: 3, storm: 0 },
    precipWeights: { none: 6, drizzle: 2, rain: 1, sandstorm: 1 },
  }, {
    winter: { temperature: [-15, 5], humidity: [25, 50], nightTempOffset: -12, precipWeights: { none: 4, snow: 4, fog: 1 } },
    summer: { temperature: [25, 42], nightTempOffset: -20 },
  }),

  makeBiome('swamp', 'Bagno', 'water', FULL_PARAMS, {
    temperature: [12, 28],
    humidity: [80, 100],
    nightTempOffset: -5,
    cloudWeights: { clear: 1, lightClouds: 2, overcast: 4, fullOvercast: 3 },
    windWeights: { calm: 4, light: 3, moderate: 2, strong: 1, storm: 0 },
    precipWeights: { none: 2, drizzle: 3, rain: 2, fog: 4 },
  }, {
    winter: { temperature: [-2, 8], nightTempOffset: -4 },
    summer: { temperature: [18, 32], nightTempOffset: -6 },
  }),

  makeBiome('underground', 'Podziemia', 'dark_mode', ['temperature', 'humidity', 'airFlow'], {
    temperature: [8, 16],
    humidity: [65, 95],
    nightTempOffset: 0,
    cloudWeights: {},
    windWeights: {},
    precipWeights: { none: 8, fog: 2 },
    airFlowWeights: { still: 5, lightDraft: 3, strongDraft: 1 },
  }, {}, { ignoresTimeOfDay: true, allowedPrecipitation: ['none', 'fog'] }),
];
