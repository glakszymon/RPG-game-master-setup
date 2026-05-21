/*
 * WeatherGenerator — main component.
 *
 * Hybrid flow: DM sets params manually or randomises from biome+season.
 * Output: narrative (Polish) + mechanical effects for gameplay.
 */

import { useCallback, useMemo, useState } from 'react';
import { useWeatherEngine } from './hooks/useWeatherEngine';
import { useMechanicsEngine } from './hooks/useMechanicsEngine';
import { useTimeIntegration } from './hooks/useTimeIntegration';
import { BIOMES } from './data/biomes';
import {
  CLOUD_LABELS,
  WIND_LABELS,
  WIND_DIRECTION_LABELS,
  PRECIPITATION_LABELS,
  TIME_OF_DAY_LABELS,
  SEASON_LABELS,
  AIR_FLOW_LABELS,
  DEFAULT_WEATHER_STATE,
  STAT_LABELS,
  STAT_CATEGORY,
  CATEGORY_V2_LABELS,
  CATEGORY_V2_ICONS,
} from './types';
import type {
  WeatherGeneratorState,
  WeatherParams,
  BiomeConfig,
  BiomeSeasonRanges,
  CloudLevel,
  WindStrength,
  WindDirection,
  Precipitation,
  AirFlow,
  TimeOfDay,
  Season,
  MechanicalEffect,
  StatModifier,
  HazardEffect,
  MechanicalCategoryV2,
} from './types';
import type { CampaignTimeState } from '../../canvas/types';
import styles from './WeatherGenerator.module.css';

/* ── Helpers ── */

function weightedPick<T extends string>(weights: Partial<Record<T, number>>): T {
  const entries = Object.entries(weights) as Array<[T, number]>;
  const total = entries.reduce((sum, [, w]) => sum + (w ?? 0), 0);
  if (total === 0) return entries[0][0];
  let roll = Math.random() * total;
  for (const [key, weight] of entries) {
    roll -= weight ?? 0;
    if (roll <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

function randomInRange(min: number, max: number): number {
  return Math.round(min + Math.random() * (max - min));
}

const MECHANICAL_ICONS: Record<string, string> = {
  visibility: 'visibility',
  travel: 'hiking',
  resources: 'category',
  hazard: 'warning',
};

const PARAM_ICONS: Record<string, string> = {
  temperature: 'thermostat',
  humidity: 'water_drop',
  cloud: 'cloud',
  windStrength: 'air',
  windDirection: 'explore',
  precipitation: 'rainy',
  airFlow: 'air',
};

/* ── Biome background images ── */

const BIOME_IMAGES: Record<string, string> = {
  arctic: new URL('../../../../assets/photo/arctic.png', import.meta.url).href,
  temperate: new URL('../../../../assets/photo/umiarkowany.png', import.meta.url).href,
  desert: new URL('../../../../assets/photo/pustynia.png', import.meta.url).href,
  tropical: new URL('../../../../assets/photo/las-deszczowy.png', import.meta.url).href,
  mountain: new URL('../../../../assets/photo/mountain.png', import.meta.url).href,
  maritime: new URL('../../../../assets/photo/sea.png', import.meta.url).href,
  forest: new URL('../../../../assets/photo/forest.png', import.meta.url).href,
  steppe: new URL('../../../../assets/photo/step.png', import.meta.url).href,
  swamp: new URL('../../../../assets/photo/bagno.png', import.meta.url).href,
  underground: new URL('../../../../assets/photo/jaskinia.png', import.meta.url).href,
};

/* ── Props ── */

interface WeatherGeneratorProps {
  toolState: WeatherGeneratorState | undefined;
  onToolStateChange: (state: unknown) => void;
  timeState?: CampaignTimeState;
}

/* ── Component ── */

export function WeatherGenerator({ toolState, onToolStateChange, timeState }: WeatherGeneratorProps) {
  const state = toolState ?? DEFAULT_WEATHER_STATE;
  const { generate } = useWeatherEngine();
  const { compute } = useMechanicsEngine();
  const derivedTime = useTimeIntegration(timeState);
  const [showParams, setShowParams] = useState(true);

  const patchState = useCallback(
    (patch: Partial<WeatherGeneratorState>) => {
      onToolStateChange({ ...state, ...patch });
    },
    [state, onToolStateChange],
  );

  const patchParams = useCallback(
    (patch: Partial<WeatherParams>) => {
      patchState({ params: { ...state.params, ...patch } });
    },
    [state.params, patchState],
  );

  const activeBiome: BiomeConfig | undefined = useMemo(
    () => BIOMES.find((b) => b.id === state.selectedBiome),
    [state.selectedBiome],
  );

  const effectiveSeason: Season = state.timeSource === 'auto' && derivedTime
    ? derivedTime.season
    : state.params.season;

  const effectiveTimeOfDay: TimeOfDay = state.timeSource === 'auto' && derivedTime
    ? derivedTime.timeOfDay
    : state.params.timeOfDay;

  /* ── Randomise from biome ── */
  const handleRandomise = useCallback(() => {
    if (!activeBiome) return;
    const seasonData: BiomeSeasonRanges = activeBiome.seasons[effectiveSeason];

    // Apply time-of-day temperature offset (night is coldest, dawn/dusk half)
    const baseTemp = randomInRange(...seasonData.temperature);
    const nightOffset = seasonData.nightTempOffset ?? 0;
    let tempModifier = 0;
    if (effectiveTimeOfDay === 'night') tempModifier = nightOffset;
    else if (effectiveTimeOfDay === 'dawn' || effectiveTimeOfDay === 'dusk') tempModifier = Math.round(nightOffset * 0.5);

    const newParams: WeatherParams = {
      temperature: baseTemp + tempModifier,
      humidity: randomInRange(...seasonData.humidity),
      cloud: Object.keys(seasonData.cloudWeights).length > 0
        ? weightedPick(seasonData.cloudWeights)
        : 'clear',
      windStrength: Object.keys(seasonData.windWeights).length > 0
        ? weightedPick(seasonData.windWeights)
        : 'calm',
      windDirection: weightedPick({
        N: 1, NE: 1, E: 1, SE: 1, S: 1, SW: 1, W: 1, NW: 1,
      }) as WindDirection,
      precipitation: Object.keys(seasonData.precipWeights).length > 0
        ? weightedPick(seasonData.precipWeights)
        : 'none',
      airFlow: seasonData.airFlowWeights && Object.keys(seasonData.airFlowWeights).length > 0
        ? weightedPick(seasonData.airFlowWeights)
        : 'still',
      timeOfDay: effectiveTimeOfDay,
      season: effectiveSeason,
    };

    patchState({ params: newParams });
  }, [activeBiome, effectiveSeason, effectiveTimeOfDay, patchState]);

  /* ── Generate result ── */
  const handleGenerate = useCallback(() => {
    const paramsWithTime: WeatherParams = {
      ...state.params,
      timeOfDay: effectiveTimeOfDay,
      season: effectiveSeason,
    };
    const result = generate(paramsWithTime);
    const mechanics = compute(paramsWithTime, activeBiome);
    patchState({ lastResult: { ...result, mechanics } });
  }, [state.params, effectiveTimeOfDay, effectiveSeason, generate, compute, activeBiome, patchState]);

  /* ── Active params for current biome ── */
  const activeParams = activeBiome?.activeParams ?? [
    'temperature', 'cloud', 'windStrength', 'windDirection', 'humidity', 'precipitation',
  ];

  return (
    <div className={styles.container}>
      {/* ── Biome selector ── */}
      <div className={styles.section}>
        <div className={styles.biomeGrid}>
          {BIOMES.map((biome) => (
            <button
              key={biome.id}
              className={`${styles.biomeBtn} ${state.selectedBiome === biome.id ? styles.biomeActive : ''}`}
              onClick={() => patchState({ selectedBiome: biome.id })}
              title={biome.name}
            >
              <span className={styles.biomeImg} style={{ backgroundImage: `url(${BIOME_IMAGES[biome.id]})` }} />
              <span className={styles.biomeName}>{biome.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* ── Time source ── */}
      <div className={styles.row}>
        <label className={styles.label}>Czas</label>
        <div className={styles.toggleGroup}>
          <button
            className={`${styles.toggleBtn} ${state.timeSource === 'auto' ? styles.toggleActive : ''}`}
            onClick={() => patchState({ timeSource: 'auto' })}
            disabled={!derivedTime}
          >
            Auto
          </button>
          <button
            className={`${styles.toggleBtn} ${state.timeSource === 'manual' ? styles.toggleActive : ''}`}
            onClick={() => patchState({ timeSource: 'manual' })}
          >
            Ręcznie
          </button>
        </div>
        <span className={styles.timeInfo}>
          {TIME_OF_DAY_LABELS[effectiveTimeOfDay]} / {SEASON_LABELS[effectiveSeason]}
        </span>
      </div>

      {/* ── Manual time selectors (only in manual mode) ── */}
      {state.timeSource === 'manual' && (
        <div className={styles.row}>
          <select
            className={styles.select}
            value={state.params.timeOfDay}
            onChange={(e) => patchParams({ timeOfDay: e.target.value as TimeOfDay })}
          >
            {Object.entries(TIME_OF_DAY_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select
            className={styles.select}
            value={state.params.season}
            onChange={(e) => patchParams({ season: e.target.value as Season })}
          >
            {Object.entries(SEASON_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      )}

      {/* ── Params toggle ── */}
      <button className={styles.collapseBtn} onClick={() => setShowParams(!showParams)}>
        {showParams ? '▾ Parametry' : '▸ Parametry'}
      </button>

      {/* ── Parameter controls ── */}
      {showParams && (
        <div className={styles.paramsSection}>
          {activeParams.includes('temperature') && (
            <div className={styles.paramRow}>
              <label className={styles.paramLabel}>
                <span className={`material-symbols-outlined ${styles.paramIcon}`}>{PARAM_ICONS.temperature}</span>
                Temperatura
              </label>
              <input
                type="range"
                min={-50}
                max={60}
                value={state.params.temperature}
                onChange={(e) => patchParams({ temperature: Number(e.target.value) })}
                className={styles.slider}
              />
              <span className={styles.paramValue}>{state.params.temperature}°C</span>
            </div>
          )}

          {activeParams.includes('humidity') && (
            <div className={styles.paramRow}>
              <label className={styles.paramLabel}>
                <span className={`material-symbols-outlined ${styles.paramIcon}`}>{PARAM_ICONS.humidity}</span>
                Wilgotność
              </label>
              <input
                type="range"
                min={0}
                max={100}
                value={state.params.humidity}
                onChange={(e) => patchParams({ humidity: Number(e.target.value) })}
                className={styles.slider}
              />
              <span className={styles.paramValue}>{state.params.humidity}%</span>
            </div>
          )}

          {activeParams.includes('cloud') && (
            <div className={styles.paramRow}>
              <label className={styles.paramLabel}>
                <span className={`material-symbols-outlined ${styles.paramIcon}`}>{PARAM_ICONS.cloud}</span>
                Chmury
              </label>
              <select
                className={styles.select}
                value={state.params.cloud}
                onChange={(e) => patchParams({ cloud: e.target.value as CloudLevel })}
              >
                {Object.entries(CLOUD_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          )}

          {activeParams.includes('windStrength') && (
            <div className={styles.paramRow}>
              <label className={styles.paramLabel}>
                <span className={`material-symbols-outlined ${styles.paramIcon}`}>{PARAM_ICONS.windStrength}</span>
                Wiatr
              </label>
              <select
                className={styles.select}
                value={state.params.windStrength}
                onChange={(e) => patchParams({ windStrength: e.target.value as WindStrength })}
              >
                {Object.entries(WIND_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          )}

          {activeParams.includes('windDirection') && (
            <div className={styles.paramRow}>
              <label className={styles.paramLabel}>
                <span className={`material-symbols-outlined ${styles.paramIcon}`}>{PARAM_ICONS.windDirection}</span>
                Kierunek
              </label>
              <select
                className={styles.select}
                value={state.params.windDirection}
                onChange={(e) => patchParams({ windDirection: e.target.value as WindDirection })}
              >
                {Object.entries(WIND_DIRECTION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          )}

          {activeParams.includes('precipitation') && (
            <div className={styles.paramRow}>
              <label className={styles.paramLabel}>
                <span className={`material-symbols-outlined ${styles.paramIcon}`}>{PARAM_ICONS.precipitation}</span>
                Opady
              </label>
              <select
                className={styles.select}
                value={state.params.precipitation}
                onChange={(e) => patchParams({ precipitation: e.target.value as Precipitation })}
              >
                {Object.entries(PRECIPITATION_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          )}

          {activeParams.includes('airFlow') && (
            <div className={styles.paramRow}>
              <label className={styles.paramLabel}>
                <span className={`material-symbols-outlined ${styles.paramIcon}`}>{PARAM_ICONS.airFlow}</span>
                Przepływ
              </label>
              <select
                className={styles.select}
                value={state.params.airFlow}
                onChange={(e) => patchParams({ airFlow: e.target.value as AirFlow })}
              >
                {Object.entries(AIR_FLOW_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      )}

      {/* ── Action buttons ── */}
      <div className={styles.actions}>
        <button className={styles.btnSecondary} onClick={handleRandomise}>
          <span className="material-symbols-outlined">casino</span> Losuj
        </button>
        <button className={styles.btnPrimary} onClick={handleGenerate}>
          <span className="material-symbols-outlined">bolt</span> Generuj
        </button>
      </div>

      {/* ── Result output ── */}
      {state.lastResult && (
        <div className={styles.result}>
          <div className={styles.narrative}>
            <h4 className={styles.resultHeading}>
              <span className="material-symbols-outlined">auto_awesome</span> Narracja
            </h4>
            <p className={styles.narrativeText}>{state.lastResult.narrative}</p>
          </div>

          {/* ── Numeric Stat Table (Phase 3) ── */}
          {state.lastResult.mechanics && state.lastResult.mechanics.modifiers.length > 0 && (
            <div className={styles.mechanical}>
              <h4 className={styles.resultHeading}>
                <span className="material-symbols-outlined">precision_manufacturing</span> Modyfikatory
              </h4>
              <StatTable modifiers={state.lastResult.mechanics.modifiers} />
            </div>
          )}

          {/* ── Hazards ── */}
          {state.lastResult.mechanics && state.lastResult.mechanics.hazards.length > 0 && (
            <div className={styles.mechanical}>
              <h4 className={styles.resultHeading}>
                <span className="material-symbols-outlined">warning</span> Zagrożenia
              </h4>
              <ul className={styles.effectList}>
                {state.lastResult.mechanics.hazards.map((hazard: HazardEffect, i: number) => (
                  <li key={i} className={styles.effectItem}>
                    <span className={`material-symbols-outlined ${styles.effectIcon}`}>{hazard.icon}</span>
                    <span className={styles.effectLabel}>{hazard.label}</span>
                    <span className={styles.effectDesc}>{hazard.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* ── Legacy effects (kept for phrase-based narratives) ── */}
          {state.lastResult.effects.length > 0 && (
            <div className={styles.mechanical}>
              <h4 className={styles.resultHeading}>
                <span className="material-symbols-outlined">menu_book</span> Efekty narracyjne
              </h4>
              <ul className={styles.effectList}>
                {state.lastResult.effects.map((effect: MechanicalEffect, i: number) => (
                  <li key={i} className={styles.effectItem}>
                    <span className={`material-symbols-outlined ${styles.effectIcon}`}>
                      {MECHANICAL_ICONS[effect.category] ?? 'circle'}
                    </span>
                    <span className={styles.effectLabel}>{effect.label}</span>
                    <span className={styles.effectDesc}>{effect.description}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Stat Table Sub-Component ── */

function StatTable({ modifiers }: { modifiers: StatModifier[] }) {
  // Filter: only show stats that affect at least one roll
  const rollModifiers = useMemo(() => modifiers.filter((m) => m.rollModifiers.length > 0), [modifiers]);

  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<MechanicalCategoryV2, StatModifier[]>();
    for (const mod of rollModifiers) {
      const cat = STAT_CATEGORY[mod.stat];
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(mod);
    }
    return map;
  }, [rollModifiers]);

  const categories: MechanicalCategoryV2[] = ['movement', 'combat', 'resources', 'perception', 'stealth', 'hazards'];

  return (
    <div className={styles.statTable}>
      {categories.map((cat) => {
        const mods = grouped.get(cat);
        if (!mods || mods.length === 0) return null;
        return (
          <div key={cat} className={styles.statCategory}>
            <div className={styles.statCatHeader}>
              <span className={`material-symbols-outlined ${styles.statCatIcon}`}>{CATEGORY_V2_ICONS[cat]}</span>
              <span>{CATEGORY_V2_LABELS[cat]}</span>
            </div>
            {mods.map((mod) => (
              <div key={mod.stat} className={styles.statRow}>
                <span className={styles.statName}>{STAT_LABELS[mod.stat]}</span>
                <span className={`${styles.statPercent} ${mod.percentMod > 0 ? styles.statPositive : styles.statNegative}`}>
                  {mod.percentMod > 0 ? '+' : ''}{mod.percentMod}%
                </span>
                {mod.rollModifiers.length > 0 && (
                  <span className={styles.statRolls}>
                    {mod.rollModifiers.map((r) => `${r.roll} ${r.mod > 0 ? '+' : ''}${r.mod}`).join(', ')}
                  </span>
                )}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
