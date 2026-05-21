/*
 * WeatherGenerator — hybrid weather tool with biome presets.
 *
 * DM selects biome, adjusts parameters (or rolls randomly),
 * and system generates narrative + mechanical suggestions.
 */

import { useCallback, useEffect } from 'react';
import { BIOMES } from './data/biomes';
import { useWeatherEngine } from './hooks/useWeatherEngine';
import { useTimeIntegration } from './hooks/useTimeIntegration';
import styles from './WeatherGenerator.module.css';
import type { CampaignTimeState } from '../../canvas/types';
import type {
  WeatherGeneratorState,
  WeatherParams,
  CloudLevel,
  WindStrength,
  WindDirection,
  Precipitation,
  AirFlow,
  TimeOfDay,
  Season,
} from './types';
import {
  CLOUD_LABELS,
  WIND_LABELS,
  WIND_DIRECTION_LABELS,
  PRECIPITATION_LABELS,
  TIME_OF_DAY_LABELS,
  SEASON_LABELS,
  AIR_FLOW_LABELS,
} from './types';
import { DEFAULT_WEATHER_STATE as DEFAULT_STATE } from './types';

interface WeatherGeneratorProps {
  toolState: WeatherGeneratorState | undefined;
  onToolStateChange: (state: unknown) => void;
  timeState?: CampaignTimeState;
}

/** Pick a weighted random value from a weights map */
function weightedPick<T extends string>(weights: Partial<Record<T, number>>): T {
  const entries = Object.entries(weights) as Array<[T, number]>;
  const total = entries.reduce((sum, [, w]) => sum + (w as number), 0);
  if (total <= 0) return entries[0]?.[0] as T;
  let roll = Math.random() * total;
  for (const [key, weight] of entries) {
    roll -= weight as number;
    if (roll <= 0) return key;
  }
  return entries[entries.length - 1][0] as T;
}

/** Random number in range [min, max] */
function randomInRange(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

export function WeatherGenerator({ toolState, onToolStateChange, timeState }: WeatherGeneratorProps) {
  const state = toolState ?? DEFAULT_STATE;
  const { generate } = useWeatherEngine();
  const derivedTime = useTimeIntegration(timeState);

  const biome = BIOMES.find(b => b.id === state.selectedBiome) ?? BIOMES[0];
  const seasonRanges = biome.seasons[state.params.season];

  const patchState = useCallback((patch: Partial<WeatherGeneratorState>) => {
    onToolStateChange({ ...state, ...patch });
  }, [state, onToolStateChange]);

  const patchParams = useCallback((patch: Partial<WeatherParams>) => {
    onToolStateChange({ ...state, params: { ...state.params, ...patch } });
  }, [state, onToolStateChange]);

  // Sync time from tracker when available
  useEffect(() => {
    if (derivedTime && state.timeSource === 'auto') {
      if (state.params.timeOfDay !== derivedTime.timeOfDay || state.params.season !== derivedTime.season) {
        patchParams({ timeOfDay: derivedTime.timeOfDay, season: derivedTime.season });
      }
    }
  }, [derivedTime, state.timeSource, state.params.timeOfDay, state.params.season, patchParams]);

  const handleBiomeChange = useCallback((biomeId: string) => {
    patchState({ selectedBiome: biomeId });
  }, [patchState]);

  const handleRoll = useCallback(() => {
    const ranges = seasonRanges;
    const newParams: Partial<WeatherParams> = {};

    if (biome.activeParams.includes('temperature')) {
      newParams.temperature = randomInRange(ranges.temperature[0], ranges.temperature[1]);
    }
    if (biome.activeParams.includes('humidity')) {
      newParams.humidity = randomInRange(ranges.humidity[0], ranges.humidity[1]);
    }
    if (biome.activeParams.includes('cloud') && ranges.cloudWeights) {
      newParams.cloud = weightedPick<CloudLevel>(ranges.cloudWeights);
    }
    if (biome.activeParams.includes('windStrength') && ranges.windWeights) {
      newParams.windStrength = weightedPick<WindStrength>(ranges.windWeights);
    }
    if (biome.activeParams.includes('windDirection')) {
      const dirs: WindDirection[] = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
      newParams.windDirection = dirs[Math.floor(Math.random() * dirs.length)];
    }
    if (biome.activeParams.includes('precipitation') && ranges.precipWeights) {
      newParams.precipitation = weightedPick<Precipitation>(ranges.precipWeights);
    }
    if (biome.activeParams.includes('airFlow') && ranges.airFlowWeights) {
      newParams.airFlow = weightedPick<AirFlow>(ranges.airFlowWeights);
    }

    const fullParams = { ...state.params, ...newParams };
    const result = generate(fullParams);
    onToolStateChange({ ...state, params: fullParams, lastResult: result });
  }, [state, biome, seasonRanges, generate, onToolStateChange]);

  const handleGenerate = useCallback(() => {
    const result = generate(state.params);
    patchState({ lastResult: result });
  }, [state.params, generate, patchState]);

  const isActive = (param: string) => biome.activeParams.includes(param as typeof biome.activeParams[number]);

  return (
    <div className={styles.container}>
      {/* ── Biome Selector ── */}
      <div className={styles.section}>
        <label className={styles.label}>Biom</label>
        <div className={styles.biomeGrid}>
          {BIOMES.map(b => (
            <button
              key={b.id}
              className={`${styles.biomeBtn} ${b.id === state.selectedBiome ? styles.biomeActive : ''}`}
              onClick={() => handleBiomeChange(b.id)}
              title={b.name}
            >
              <span className={styles.biomeIcon}>{b.icon}</span>
              <span className={styles.biomeName}>{b.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Time Context ── */}
      <div className={styles.section}>
        <div className={styles.row}>
          <div className={styles.field}>
            <label className={styles.label}>Pora dnia</label>
            <select
              className={styles.select}
              value={state.params.timeOfDay}
              onChange={e => patchParams({ timeOfDay: e.target.value as TimeOfDay })}
              disabled={state.timeSource === 'auto' && !!derivedTime}
            >
              {Object.entries(TIME_OF_DAY_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Pora roku</label>
            <select
              className={styles.select}
              value={state.params.season}
              onChange={e => patchParams({ season: e.target.value as Season })}
              disabled={state.timeSource === 'auto' && !!derivedTime}
            >
              {Object.entries(SEASON_LABELS).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </div>
          <div className={styles.field}>
            <label className={styles.label}>Źródło czasu</label>
            <button
              className={styles.timeSourceBtn}
              onClick={() => patchState({ timeSource: state.timeSource === 'auto' ? 'manual' : 'auto' })}
            >
              {state.timeSource === 'auto' ? '🔗 Auto' : '✋ Ręcznie'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Parameters ── */}
      <div className={styles.section}>
        <div className={styles.paramsGrid}>
          {isActive('temperature') && (
            <div className={styles.paramItem}>
              <label className={styles.label}>Temperatura: {state.params.temperature}°C</label>
              <input
                type="range"
                min={-40}
                max={50}
                value={state.params.temperature}
                onChange={e => patchParams({ temperature: Number(e.target.value) })}
                className={styles.slider}
              />
            </div>
          )}
          {isActive('humidity') && (
            <div className={styles.paramItem}>
              <label className={styles.label}>Wilgotność: {state.params.humidity}%</label>
              <input
                type="range"
                min={0}
                max={100}
                value={state.params.humidity}
                onChange={e => patchParams({ humidity: Number(e.target.value) })}
                className={styles.slider}
              />
            </div>
          )}
          {isActive('cloud') && (
            <div className={styles.paramItem}>
              <label className={styles.label}>Zachmurzenie</label>
              <select
                className={styles.select}
                value={state.params.cloud}
                onChange={e => patchParams({ cloud: e.target.value as CloudLevel })}
              >
                {Object.entries(CLOUD_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          )}
          {isActive('windStrength') && (
            <div className={styles.paramItem}>
              <label className={styles.label}>Siła wiatru</label>
              <select
                className={styles.select}
                value={state.params.windStrength}
                onChange={e => patchParams({ windStrength: e.target.value as WindStrength })}
              >
                {Object.entries(WIND_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          )}
          {isActive('windDirection') && (
            <div className={styles.paramItem}>
              <label className={styles.label}>Kierunek wiatru</label>
              <select
                className={styles.select}
                value={state.params.windDirection}
                onChange={e => patchParams({ windDirection: e.target.value as WindDirection })}
              >
                {Object.entries(WIND_DIRECTION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          )}
          {isActive('precipitation') && (
            <div className={styles.paramItem}>
              <label className={styles.label}>Opady</label>
              <select
                className={styles.select}
                value={state.params.precipitation}
                onChange={e => patchParams({ precipitation: e.target.value as Precipitation })}
              >
                {Object.entries(PRECIPITATION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          )}
          {isActive('airFlow') && (
            <div className={styles.paramItem}>
              <label className={styles.label}>Przepływ powietrza</label>
              <select
                className={styles.select}
                value={state.params.airFlow}
                onChange={e => patchParams({ airFlow: e.target.value as AirFlow })}
              >
                {Object.entries(AIR_FLOW_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* ── Action Buttons ── */}
      <div className={styles.actions}>
        <button className={styles.rollBtn} onClick={handleRoll}>
          🎲 Losuj
        </button>
        <button className={styles.generateBtn} onClick={handleGenerate}>
          ✨ Generuj opis
        </button>
      </div>

      {/* ── Result ── */}
      {state.lastResult && (
        <div className={styles.result}>
          <div className={styles.narrativeSection}>
            <h4 className={styles.resultTitle}>📜 Narracja</h4>
            <p className={styles.narrativeText}>{state.lastResult.narrative}</p>
          </div>
          {state.lastResult.effects.length > 0 && (
            <div className={styles.mechanicalSection}>
              <h4 className={styles.resultTitle}>⚙️ Mechanika</h4>
              <div className={styles.effectsList}>
                {state.lastResult.effects.map((effect, i) => (
                  <div key={i} className={styles.effectItem}>
                    <span className={styles.effectIcon}>{effect.icon}</span>
                    <span className={styles.effectLabel}>{effect.label}</span>
                    <span className={styles.effectDesc}>{effect.description}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
