---
title: "feat: Weather Generator with Biome Presets and Gameplay Impact"
type: feat
status: active
date: 2026-05-21
origin: docs/brainstorms/2026-05-21-weather-generator-requirements.md
---

# feat: Weather Generator with Biome Presets and Gameplay Impact

## Overview

Hybrid weather generator tool for the infinite canvas. DM sets parameters manually or rolls them contextually based on biome + season. System produces a two-part output: narrative description (for players) and mechanical suggestions (for DM). Semi-random phrase pool ensures variety without AI dependency.

## Problem Statement

DM needs quick, believable weather during sessions — both for narrative immersion and mechanical consequences (visibility, travel speed, resource consumption, environmental hazards). Currently no tool exists despite the placeholder being registered in the canvas system.

(see origin: docs/brainstorms/2026-05-21-weather-generator-requirements.md)

## Proposed Solution

### Architecture

New tool module at `src/ui/tools/weather-generator/` following established patterns:

```
src/ui/tools/weather-generator/
  index.ts
  WeatherGenerator.tsx          — main component
  WeatherGenerator.module.css   — styles
  types.ts                      — WeatherState, BiomeConfig, WeatherParams, PhraseEntry
  hooks/
    useWeatherEngine.ts         — core generation logic (phrase matching + randomization)
    useTimeIntegration.ts       — reads CampaignTimeState, derives season
  data/
    biomes.ts                   — 10 biome presets with parameter ranges
    phrases.ts                  — phrase pool (Polish), organized by parameter conditions
```

### Data Flow

1. DM selects biome → UI shows relevant parameters (R50: biome determines active params)
2. DM either adjusts manually OR clicks "Losuj" → `useWeatherEngine` rolls within biome ranges
3. `useWeatherEngine` matches current params against phrase conditions → picks random matching phrases
4. Output renders in two sections: narrative + mechanical

### Integration with Time Tracker

`useTimeIntegration` hook reads `CanvasState.timeState`:
- `currentHour` / `currentMinute` → time of day (dawn/day/dusk/night using `dawnHour`/`duskHour`)
- `currentMonth` + solstice config → season (interpolation between summer/winter solstice months)
- Fallback: manual override dropdowns if no time state exists

## Technical Considerations

### Parameters (R44)

| Parameter | Input Type | Range/Values |
|-----------|-----------|--------------|
| Temperatura | Slider (°C) | -40 to +50 |
| Zachmurzenie | Select | bezchmurnie / lekkie chmury / pochmurno / całkowite zachmurzenie |
| Siła wiatru | Select | cisza / lekki / umiarkowany / silny / sztormowy |
| Kierunek wiatru | Select (8-way) | N / NE / E / SE / S / SW / W / NW |
| Wilgotność | Slider (%) | 0–100 |
| Opady | Select | brak / mżawka / deszcz / ulewa / śnieg / grad / mgła |
| Pora dnia | Auto from TimeTracker or Select | świt / dzień / zmierzch / noc |
| Pora roku | Auto from TimeTracker or Select | wiosna / lato / jesień / zima |

### Biome Presets (R45)

Each biome defines:
```typescript
interface BiomeConfig {
  id: string;
  name: string;
  icon: string;
  activeParams: ParameterKey[];  // which params are shown (R50)
  ranges: {
    temperature: [min: number, max: number];  // per season
    humidity: [min: number, max: number];
    cloudOptions: CloudLevel[];     // weighted
    windOptions: WindStrength[];    // weighted
    precipOptions: Precipitation[]; // weighted per season
  };
  seasonalVariation: Record<Season, Partial<BiomeRanges>>;
}
```

10 biomes: Arktyczny, Umiarkowany, Pustynny, Tropikalny, Górski, Morski, Leśny, Step, Bagno/Mokradła, Podziemia.

Podziemia: `activeParams` excludes zachmurzenie, kierunek wiatru; replaces siła wiatru with "przepływ powietrza" (cisza / lekki przeciąg / silny przeciąg).

### Phrase Engine (R46)

```typescript
interface PhraseEntry {
  conditions: PhraseConditions;  // param ranges that must match
  narrative: string[];           // pool of narrative variants
  mechanical: MechanicalEffect[];
}

interface PhraseConditions {
  temperature?: [min: number, max: number];
  cloud?: CloudLevel[];
  wind?: WindStrength[];
  precipitation?: Precipitation[];
  humidity?: [min: number, max: number];
  timeOfDay?: TimeOfDay[];
}

interface MechanicalEffect {
  category: 'visibility' | 'travel' | 'resources' | 'hazard';
  icon: string;
  label: string;       // short (e.g. "Widoczność: ~30m")
  description: string; // contextual (e.g. "Gęsta mgła ogranicza pole widzenia...")
}
```

Engine logic:
1. Filter phrases where ALL conditions match current params
2. Score by specificity (more conditions = higher priority)
3. Pick top N matching entries, randomly select one narrative variant from each
4. Concatenate narratives; collect all mechanical effects (deduplicate by category, keep strongest)

### Mechanical Suggestions (R49)

Four categories with icon + label + description format:

| Category | Icon | Example |
|----------|------|---------|
| Widoczność | 👁️ | "~30m — gęsta mgła ogranicza pole widzenia" |
| Podróż | 🚶 | "-25% prędkości — silny wiatr spowalnia marsz" |
| Zasoby | 💧 | "x2 zużycie wody — upał odwadnia podróżnych" |
| Zagrożenia | ⚠️ | "Ryzyko udaru cieplnego po 2h ekspozycji" |

### State Shape

```typescript
interface WeatherGeneratorState {
  selectedBiome: string;
  params: WeatherParams;
  timeSource: 'auto' | 'manual';
  manualTimeOfDay?: TimeOfDay;
  manualSeason?: Season;
  lastResult: WeatherResult | null;
}

interface WeatherResult {
  narrative: string;
  effects: MechanicalEffect[];
  generatedAt: number;
}
```

### Performance

- Phrase matching is O(n) over phrase pool — acceptable for ~200-500 phrases
- No canvas rendering — pure DOM, no rAF concerns
- State persisted via standard `UPDATE_TOOL_STATE` → debounced SQLite save

## System-Wide Impact

- **Interaction graph**: Reads `CanvasState.timeState` (read-only). Dispatches `UPDATE_TOOL_STATE` only. No cross-tool side effects.
- **State lifecycle risks**: None — tool only reads shared time state, never mutates it. Own state is self-contained.
- **API surface parity**: Tool type already registered in `types.ts`. Needs component mapping in tool renderer switch.

## Acceptance Criteria

- [ ] DM can select a biome and click "Losuj" to generate weather in ≤3 clicks
- [ ] DM can manually adjust all active parameters for selected biome
- [ ] Changing biome shows/hides parameters per biome config (Podziemia hides sky/wind direction)
- [ ] Generated output has two distinct sections: narrative text + mechanical effects list
- [ ] Same parameters produce different narrative text on repeated generation (semi-random)
- [ ] Mechanical effects show icon + short label + description for each active category
- [ ] Time of day and season auto-populated from TimeTracker when available
- [ ] Manual time override works when TimeTracker not active
- [ ] Tool opens from canvas context menu under "World" category
- [ ] Tool state persists across sessions via SQLite
- [ ] All phrase content is in Polish

## Implementation Phases

### Phase 1: Core Structure + Manual Mode

- Create tool module structure (types, component, CSS, hooks)
- Implement parameter UI (sliders + selects) with biome-driven visibility
- Wire up biome selection → parameter filtering
- Register component in tool renderer switch
- **Files:** `types.ts`, `WeatherGenerator.tsx`, `WeatherGenerator.module.css`, `index.ts`

### Phase 2: Phrase Engine + Generation

- Design phrase data structure and write initial phrase pool (~50-100 entries)
- Implement `useWeatherEngine` hook (matching, scoring, random selection)
- Render two-section output (narrative + mechanical)
- **Files:** `hooks/useWeatherEngine.ts`, `data/phrases.ts`, `data/biomes.ts`

### Phase 3: Randomization + Time Integration

- Implement "Losuj" button with contextual rolling per biome + season
- Implement `useTimeIntegration` hook reading from `CanvasState.timeState`
- Season derivation from month + solstice config
- Manual override fallback
- **Files:** `hooks/useTimeIntegration.ts`

### Phase 4: Polish + Content

- Expand phrase pool to full coverage (~200+ entries)
- Fine-tune mechanical effect thresholds
- CSS polish (glassmorphism, dark mode, responsive within window)
- Test all 10 biomes × 4 seasons combinations

## Dependencies & Risks

- **Time state access**: `CanvasState.timeState` must be passed to tool (verify prop drilling or need to add to tool component interface)
- **Phrase content volume**: ~200+ Polish phrases needed — significant content work, not just code
- **Biome balance**: Ranges need playtesting to feel "right" — may need iterative tuning

## Sources & References

- **Origin document:** [docs/brainstorms/2026-05-21-weather-generator-requirements.md](docs/brainstorms/2026-05-21-weather-generator-requirements.md) — Key decisions: hybrid flow, semi-random phrases, 10 biomes, biome-driven param visibility, 4 mechanical categories
- Tool type registration: `src/ui/canvas/types.ts:13`
- Time state shape: `src/ui/canvas/types.ts:174`
- Tool pattern reference: `src/ui/tools/party-tracker/`
- Time tracker requirements: `docs/brainstorms/2026-05-15-time-tracker-requirements.md`
