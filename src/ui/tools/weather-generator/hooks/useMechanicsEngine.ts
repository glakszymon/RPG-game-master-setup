/*
 * useMechanicsEngine — numeric modifier computation for weather effects.
 *
 * Implements R1-R11: time-of-day base modifiers, precipitation/wind/temp/humidity effects,
 * thunderstorm combo, sandstorm, multiplicative stacking, % → D&D roll conversion.
 */

import { useCallback } from 'react';
import type {
  WeatherParams,
  CloudLevel,
  WindStrength,
  Precipitation,
  TimeOfDay,
  WeatherStat,
  StatModifier,
  HazardEffect,
  MechanicalResult,
  BiomeConfig,
} from '../types';
import { STAT_TO_ROLLS } from '../types';

type ModifierMap = Partial<Record<WeatherStat, number>>;

/* ── R2: Time-of-day base modifiers ── */

function getTimeModifiers(timeOfDay: TimeOfDay, cloud: CloudLevel): ModifierMap {
  switch (timeOfDay) {
    case 'dawn':
      return { visibility: -0.20, hearing: 0, rangedAccuracy: 0, stealth: 0 };
    case 'day':
      return { visibility: 0, hearing: -0.10, rangedAccuracy: 0, stealth: 0 };
    case 'dusk':
      return { visibility: -0.40, hearing: 0.10, rangedAccuracy: -0.15, stealth: 0.10 };
    case 'night': {
      const visMap: Record<CloudLevel, number> = {
        clear: -0.75,
        lightClouds: -0.75,
        overcast: -0.90,
        fullOvercast: -0.95,
      };
      return {
        visibility: visMap[cloud],
        hearing: 0.30,
        rangedAccuracy: cloud === 'fullOvercast' ? -0.80 : cloud === 'overcast' ? -0.50 : -0.25,
        stealth: cloud === 'fullOvercast' ? 0.50 : cloud === 'overcast' ? 0.35 : 0.25,
      };
    }
  }
}

/* ── R3: Precipitation effects ── */

function getPrecipModifiers(precip: Precipitation, wind: WindStrength): ModifierMap {
  switch (precip) {
    case 'none': return {};
    case 'drizzle': return { movement: -0.10, visibility: -0.20, stealth: 0.15 };
    case 'rain': return { movement: -0.15, visibility: -0.40, stealth: 0.25, tracking: -0.50 };
    case 'heavyRain': return { movement: -0.30, visibility: -0.70, stealth: 0.40, tracking: -0.90, equipmentDamage: 0.10 };
    case 'snow': {
      // Blizzard combo: snow + strong/storm wind
      if (wind === 'strong' || wind === 'storm') {
        return { movement: -0.50, visibility: -0.80, tracking: 0.50, stealth: -0.20, campTime: 1.00 };
      }
      return { movement: -0.30, visibility: -0.40, tracking: 0.50, stealth: -0.20, campTime: 0.50 };
    }
    case 'fog': return { visibility: -0.80, movement: -0.20, stealth: 0.40, tracking: -0.70, magicAccuracy: -0.20 };
    case 'hail': return { movement: -0.80 }; // effectively stopped
    case 'sandstorm': return {
      movement: -0.40,
      visibility: -0.90,
      stealth: 0.50,
      tracking: -1.00,
      breathing: -0.30,
      equipmentDamage: 0.10,
    };
  }
}

/* ── R4: Wind effects ── */

function getWindModifiers(wind: WindStrength): ModifierMap {
  switch (wind) {
    case 'calm': return {};
    case 'light': return {};
    case 'moderate': return { rangedAccuracy: -0.10 };
    case 'strong': return { movement: -0.20, rangedAccuracy: -0.30, thrownWeapons: -0.60, stealth: 0.30 };
    case 'storm': return { movement: -0.40, rangedAccuracy: -0.50, thrownWeapons: -0.80, flying: -0.70, stealth: 0.40 };
  }
}

/* ── R5: Temperature effects ── */

function getTempModifiers(temp: number): ModifierMap {
  if (temp < -15) return { movement: -0.50, equipmentDamage: 0.20, fuelConsumption: 2.00 };
  if (temp < 0) return { movement: -0.25, campTime: 0.30 };
  if (temp > 50) return { movement: -0.40, magicAccuracy: 0.25 };
  if (temp > 35) return { movement: -0.25, waterConsumption: 1.00 };
  return {};
}

/* ── R6: Humidity combo effects ── */

function getHumidityModifiers(humidity: number, temp: number): ModifierMap {
  if (humidity > 80 && temp > 25) return { movement: -0.15, waterConsumption: 0.50 };
  if (humidity < 15 && temp > 35) return { tracking: 0.20 };
  return {};
}

/* ── R7: Thunderstorm combo detection ── */

function getThunderstormHazards(precip: Precipitation, wind: WindStrength): HazardEffect[] {
  if (precip === 'heavyRain' && (wind === 'strong' || wind === 'storm')) {
    return [
      { icon: 'flash_on', label: 'Burza elektryczna', description: 'Metal pancerz: +30% trafienie piorunem. Magia: 10% losowe wyładowanie.' },
    ];
  }
  return [];
}

function getThunderstormModifiers(precip: Precipitation, wind: WindStrength): ModifierMap {
  if (precip === 'heavyRain' && (wind === 'strong' || wind === 'storm')) {
    return { initiative: 0.10 };
  }
  return {};
}

/* ── R5 hazards ── */

function getTempHazards(temp: number): HazardEffect[] {
  const hazards: HazardEffect[] = [];
  if (temp < -15) hazards.push({ icon: 'severe_cold', label: 'Odmrożenia', description: 'Po 30 min bez ochrony.' });
  if (temp < 0 && temp >= -15) hazards.push({ icon: 'ac_unit', label: 'Wychłodzenie', description: 'Ryzyko hipotermii bez ognia/schronienia.' });
  if (temp > 35 && temp <= 50) hazards.push({ icon: 'thermostat', label: 'Udar cieplny', description: '5% + 5%/h bez cienia i wody.' });
  if (temp > 50) hazards.push({ icon: 'local_fire_department', label: 'Pożar otoczenia', description: '60% szans samozapłonu materiałów.' });
  return hazards;
}

function getPrecipHazards(precip: Precipitation): HazardEffect[] {
  if (precip === 'hail') return [{ icon: 'grain', label: 'Grad', description: 'Obrażenia bez schronienia. Ruch zatrzymany.' }];
  if (precip === 'sandstorm') return [{ icon: 'blur_on', label: 'Oślepienie', description: '15%/rundę bez ochrony oczu.' }];
  return [];
}

function getWindHazards(wind: WindStrength): HazardEffect[] {
  if (wind === 'storm') return [{ icon: 'broken_image', label: 'Przygniecenie', description: '5%/rundę (las/miasto) — spadające elementy.' }];
  return [];
}

/* ── R8: Multiplicative stacking ── */

function stackModifiers(layers: ModifierMap[]): Map<WeatherStat, number> {
  const allStats = new Set<WeatherStat>();
  for (const layer of layers) {
    for (const key of Object.keys(layer) as WeatherStat[]) {
      allStats.add(key);
    }
  }

  const result = new Map<WeatherStat, number>();
  for (const stat of allStats) {
    let value = 1.0;
    for (const layer of layers) {
      const mod = layer[stat];
      if (mod !== undefined) {
        value *= (1 + mod);
      }
    }
    // Floor at 5%
    value = Math.max(value, 0.05);
    // Convert back to percentage modifier: value of 0.6 = -40%
    const percentMod = Math.round((value - 1) * 100);
    if (percentMod !== 0) {
      result.set(stat, percentMod);
    }
  }
  return result;
}

/* ── R11: % → D&D roll conversion ── */

function percentToRollMod(percent: number): number {
  const raw = Math.round(percent / 15);
  return Math.max(-6, Math.min(6, raw));
}

/* ── Main hook ── */

export function useMechanicsEngine() {
  const compute = useCallback((params: WeatherParams, biome?: BiomeConfig): MechanicalResult => {
    const isUnderground = biome?.ignoresTimeOfDay === true;

    // Collect modifier layers
    const layers: ModifierMap[] = [];

    // R2: Time-of-day (skipped for underground)
    if (!isUnderground) {
      layers.push(getTimeModifiers(params.timeOfDay, params.cloud));
    } else {
      // Underground: fixed base visibility at 20% (= -80%)
      layers.push({ visibility: -0.80 });
    }

    // R3: Precipitation
    layers.push(getPrecipModifiers(params.precipitation, params.windStrength));

    // R4: Wind
    layers.push(getWindModifiers(params.windStrength));

    // R5: Temperature
    layers.push(getTempModifiers(params.temperature));

    // R6: Humidity combos
    layers.push(getHumidityModifiers(params.humidity, params.temperature));

    // R7: Thunderstorm bonus modifiers
    layers.push(getThunderstormModifiers(params.precipitation, params.windStrength));

    // R8: Stack multiplicatively
    const stacked = stackModifiers(layers);

    // R11: Convert to roll modifiers
    const modifiers: StatModifier[] = [];
    for (const [stat, percentMod] of stacked) {
      const rolls = STAT_TO_ROLLS[stat];
      const rollMod = percentToRollMod(percentMod);
      const rollModifiers = rolls
        .map((roll) => ({ roll, mod: rollMod }))
        .filter((r) => r.mod !== 0);
      modifiers.push({ stat, percentMod, rollModifiers });
    }

    // Sort by category for display
    modifiers.sort((a, b) => a.stat.localeCompare(b.stat));

    // Collect hazards
    const hazards: HazardEffect[] = [
      ...getTempHazards(params.temperature),
      ...getPrecipHazards(params.precipitation),
      ...getWindHazards(params.windStrength),
      ...getThunderstormHazards(params.precipitation, params.windStrength),
    ];

    return { modifiers, hazards };
  }, []);

  return { compute };
}
