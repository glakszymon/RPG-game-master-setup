/*
 * useWeatherEngine — phrase matching and weather generation logic.
 *
 * Matches current params against phrase conditions, picks random variants.
 */

import { useCallback } from 'react';
import { PHRASES } from '../data/phrases';
import type {
  WeatherParams,
  PhraseEntry,
  PhraseConditions,
  WeatherResult,
  MechanicalEffect,
  MechanicalCategory,
} from '../types';

/** Check if a single phrase's conditions match the current params */
function matchesConditions(conditions: PhraseConditions, params: WeatherParams): boolean {
  if (conditions.temperature) {
    const [min, max] = conditions.temperature;
    if (params.temperature < min || params.temperature > max) return false;
  }
  if (conditions.cloud && !conditions.cloud.includes(params.cloud)) return false;
  if (conditions.wind && !conditions.wind.includes(params.windStrength)) return false;
  if (conditions.precipitation && !conditions.precipitation.includes(params.precipitation)) return false;
  if (conditions.humidity) {
    const [min, max] = conditions.humidity;
    if (params.humidity < min || params.humidity > max) return false;
  }
  if (conditions.timeOfDay && !conditions.timeOfDay.includes(params.timeOfDay)) return false;
  if (conditions.airFlow && !conditions.airFlow.includes(params.airFlow)) return false;
  return true;
}

/** Count how many conditions are specified (more = more specific) */
function conditionSpecificity(conditions: PhraseConditions): number {
  let count = 0;
  if (conditions.temperature) count++;
  if (conditions.cloud) count++;
  if (conditions.wind) count++;
  if (conditions.precipitation) count++;
  if (conditions.humidity) count++;
  if (conditions.timeOfDay) count++;
  if (conditions.airFlow) count++;
  return count;
}

/** Pick a random element from array */
function randomPick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/** Deduplicate mechanical effects, keeping the one with more detail per category */
function dedupeEffects(effects: MechanicalEffect[]): MechanicalEffect[] {
  const byCategory = new Map<MechanicalCategory, MechanicalEffect>();
  for (const effect of effects) {
    const existing = byCategory.get(effect.category);
    if (!existing || effect.description.length > existing.description.length) {
      byCategory.set(effect.category, effect);
    }
  }
  return Array.from(byCategory.values());
}

export function useWeatherEngine() {
  const generate = useCallback((params: WeatherParams): WeatherResult => {
    // Find all matching phrases
    const matches: Array<{ entry: PhraseEntry; specificity: number }> = [];
    for (const entry of PHRASES) {
      if (matchesConditions(entry.conditions, params)) {
        matches.push({ entry, specificity: conditionSpecificity(entry.conditions) });
      }
    }

    // Sort by specificity (most specific first)
    matches.sort((a, b) => b.specificity - a.specificity);

    // Take top entries (up to 3 for narrative variety)
    const topMatches = matches.slice(0, 3);

    // Build narrative from random picks
    const narrativeParts: string[] = [];
    const allEffects: MechanicalEffect[] = [];

    for (const { entry } of topMatches) {
      if (entry.narrative.length > 0) {
        narrativeParts.push(randomPick(entry.narrative));
      }
      allEffects.push(...entry.mechanical);
    }

    // Fallback if nothing matched
    if (narrativeParts.length === 0) {
      narrativeParts.push('Pogoda jest spokojna i nie wyróżnia się niczym szczególnym.');
    }

    return {
      narrative: narrativeParts.join(' '),
      effects: dedupeEffects(allEffects),
      generatedAt: Date.now(),
    };
  }, []);

  return { generate };
}
