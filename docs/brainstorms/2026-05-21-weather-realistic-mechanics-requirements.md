---
date: 2026-05-21
topic: weather-generator-realistic-mechanics
---

# Weather Generator — Realistic Mechanical Statistics

## Problem Frame

Current weather generator produces simple narrative + basic effects (label + description). The DM needs **concrete numerical modifiers** grouped by gameplay category (movement, combat, survival, perception, stealth, hazards) to make rulings consistent and immersive. Effects must combine realistically when multiple weather conditions overlap.

## Requirements

### R1. Structured Mechanical Output (Stat Table)

Display generated weather effects as a **mini-table** grouped by 6 categories:
- **Ruch** (movement speed modifiers: on foot, mounted, wagon)
- **Walka / Balistyka** (ranged accuracy, thrown weapons, projectile drift, magic)
- **Zasoby / Przetrwanie** (water, fuel, food, equipment damage, camp time)
- **Percepcja / Widoczność** (sight range, hearing, trap/track detection)
- **Skradanie / Tropienie** (stealth bonus, tracking difficulty, surprise/initiative)
- **Zagrożenia / Hazardy** (heatstroke, frostbite, drowning, fire, crushing)

Only display stats with non-zero modifiers (hide unchanged categories).

### R2. Time-of-Day Base Modifiers

Fundamental stat layer applied BEFORE weather effects:

| Stat | Świt | Dzień | Zmierzch | Noc (clear/lightClouds) | Noc (overcast) | Noc (fullOvercast) |
|------|------|-------|----------|------------------------|----------------|-------------------|
| Widoczność | 80% | 100% | 60% | 25% | 10% | 5% |
| Słuch | 100% | 90% | 110% | 130% | 130% | 130% |
| Celność (dystans) | 0 | 0 | -15% | -25% | -50% | -80% |
| Skradanie | 0 | 0 | +10% | +25% | +35% | +50% |

Night visibility uses cloud level as moon proxy (no new parameter needed).

### R3. Precipitation Effects

**Mżawka (drizzle):** ruch -10%, widoczność -20%, skradanie +15%

**Deszcz (rain):** ruch -15%, widoczność -40%, skradanie +25%, tropienie -50%

**Ulewa (heavyRain):** ruch -30%, widoczność -70%, skradanie +40%, tropienie -90%, ekwipunek 10%/h zniszczenia

**Śnieg (snow):** ruch -30%, widoczność -40%, tropienie +50% (świeże ślady), skradanie -20% (skrzypienie), czas obozu +50%

**Śnieżyca (snow + strong/storm wind combo):** ruch -50%, widoczność -80%, nawigacja -60%, czas obozu +100%

**Mgła (fog):** widoczność -80%, ruch -20%, skradanie +40%, tropienie -70%, celność magii -20%

**Grad (hail):** ruch zatrzymany (konieczne schronienie), obrażenia bez osłony

**Burza piaskowa (sandstorm — NEW precipitation type):** ruch -40%/-20% (pod/z wiatrem), oślepienie 15%/rundę (bez ochrony), broń -10%/h, oddychanie -30%, skradanie +50%, tropienie -100%

### R4. Wind Effects

**Lekki (light):** brak efektów mechanicznych

**Umiarkowany (moderate):** celność pocisków -10%, skok z wiatrem +10%

**Silny (strong):** ruch -20% (pod wiatr), celność -30%, broń miotana -60%, skok z/pod +30%/-50%, skradanie +30% (szum)

**Sztormowy (storm):** ruch -40% (pod wiatr), latanie -70%/+40% (pod/z), celność -50%, ryzyko przygniecenia 5%/rundę (las/miasto)

### R5. Temperature Effects

**Skrajny mróz (<-15°C):** ruch -50%, ekwipunek +20% wagi, opał x3, odmrożenia po 30min

**Mróz (-15 do 0°C):** ruch -25%, czas obozu +30%, ryzyko wychłodzenia

**Upał (35-50°C):** ruch -25% (ciężki pancerz), regeneracja -50% (bez cienia), woda x2, udar 5%+5%/h

**Ekstremalny upał (>50°C):** ruch -40%, czary ognia +25% area, pożar otoczenia 60%

**Komfort (0-35°C):** brak modyfikatorów

### R6. Humidity Combo Effects

**Wysoka wilgotność (>80%) + ciepło (>25°C):** ruch -15%, woda x1.5, regeneracja -25%

**Bardzo sucho (<15%) + upał:** pożar otoczenia +25% czary ognia, tropienie +20% (suchy teren = wyraźne ślady)

### R7. Thunderstorm Combo (heavyRain + strong/storm wind)

Dodatkowe efekty: metal pancerz +30% trafienie wyładowaniami, magia 10% losowe wyładowanie, inicjatywa +10%

### R8. Modifier Stacking Algorithm

Multiplikatywne łączenie:
```
Stat_final = Base × (1 + mod_time) × (1 + mod_precip) × (1 + mod_wind) × (1 + mod_temp) × (1 + mod_humidity)
```

Example: Forest (terrain -30%) + snowstorm (weather -50%) = 100% × 0.7 × 0.5 = 35% base speed.

Floor: never below 5% (always some possibility of action).

### R9. New Precipitation Type: Sandstorm

Add `'sandstorm'` to the `Precipitation` type. Available in biomes: desert, steppe. Weighted in those biome configs during storm-level wind.

### R10. Biome-Aware Environment Blocking (Podziemia)

Biom determines what weather parameters are **physically possible**:

**Podziemia (underground) blocks:**
- Pora dnia: ignored (no effect on stats — constant artificial lighting by torches)
- Opady: only `'none'` and `'fog'` (underground mist) available
- Chmury/niebo: fully blocked (parameter hidden)
- Wiatr: replaced by `airFlow` (already implemented)
- Base visibility: fixed at 20% (torch/magic dependent, not sky dependent)

This extends the existing `activeParams` system — biome config already hides UI controls. Now it also tells the **engine** to skip time-of-day modifiers and clamp precipitation options.

### R11. Percentage → Dice Roll Conversion

After computing final % modifiers (multiplicative stacking), convert each to **D&D 5e skill/attack roll bonuses** using linear scale: **15% = ±1 point**.

**Conversion formula:** `rollMod = Math.round(percentMod / 15)`

**Stat → Skill mapping (one stat affects multiple rolls):**

| Weather Stat | Affected Rolls |
|---|---|
| Widoczność | Perception, Investigation, Survival |
| Słuch | Perception |
| Celność dystans | Ranged attack rolls, Spell attack rolls |
| Skradanie | Stealth |
| Ruch | Athletics, Acrobatics, Animal Handling |
| Tropienie | Survival, Investigation |
| Oddychanie/wytrzymałość | Constitution saves |
| Równowaga (ślisko) | Acrobatics |
| Inicjatywa | Initiative |

**UI display format:** Show both % and roll modifier together:
```
Widoczność: -40% → Perception -3, Investigation -3, Survival -3
Skradanie: +50% → Stealth +3
```

**Example full output (Noc, fullOvercast, ulewa):**
- Widoczność: 5% × 30% = ~2% → Perception -6, Ranged attacks -6
- Skradanie: +50% + 40% (multiplikatywne) → Stealth +5
- Ruch: -30% → Athletics -2, Animal Handling -2

**Roll modifier cap:** ±6 (prevents absurd values from extreme stacking).

## Success Criteria

- Generated weather for "desert, night, summer" produces temperature ~10-25°C (nightTempOffset applied) with realistic visibility penalties
- Snowstorm (snow + storm wind) correctly stacks movement penalties multiplicatively
- UI shows only non-zero modifiers in a grouped table format with both % and roll bonuses
- Thunderstorm combo triggers bonus effects when heavyRain + storm wind detected
- All 6 mechanical categories can appear in output when conditions warrant them
- Underground biome produces no time-of-day or sky-based modifiers
- Roll modifiers correctly map to D&D 5e skills (e.g., visibility penalty affects Perception, Investigation, Survival)

## Scope Boundaries

- **No terrain system** — terrain modifiers (forest, mountain, road) are out of scope; only weather + time-of-day affects stats
- **No combat automation** — we display modifiers for the DM to interpret, not enforce them
- **No new UI parameters** — sandstorm is auto-generated from biome + conditions, not user-selectable differently from other precipitation
- **No moon phase parameter** — night cloud level is the proxy
- **No custom skill lists** — hardcoded D&D 5e skill names (can be extended later)

## Key Decisions

- **Zachmurzenie jako proxy księżyca**: Noc + clear = jasna noc, noc + fullOvercast = ciemność kompletna. Avoids adding moonPhase parameter.
- **Burza piaskowa jako nowy Precipitation**: lepsze niż combo-detection, bo daje precyzyjne wagi w biome config.
- **Burza elektryczna jako combo**: heavyRain + storm wind — nie dodajemy nowego Precipitation (wystarczające istniejące parametry).
- **Multiplikatywne stackowanie z floor 5%**: realistyczne, zapobiega 0%.
- **Tylko zmienione statystyki w UI**: przy złej pogodzie może być 15+ modyfikatorów — nie zaśmiecamy pustymi polami.
- **Biom blokuje fizycznie niemożliwe stany**: Podziemia = brak wpływu pory dnia, brak opadów atmosferycznych.
- **15% = ±1 punkt do rzutu**: liniowa konwersja, cap ±6.
- **Stat → wiele rzutów**: jeden modyfikator pogodowy wpływa na wiele skilli (np. widoczność → Perception + Investigation + Survival).

## Outstanding Questions

### Deferred to Planning

- [Affects R1][Technical] Jak zrefaktorować `MechanicalEffect` interface żeby przechowywać numeryczne modyfikatory zamiast string description? Potrzebny nowy type system.
- [Affects R8][Technical] Czy engine powinien obliczać finalny wynik w locie (kompozycja efektów), czy przechowywać surowe modyfikatory i wyświetlać wzór?
- [Affects R3][Technical] Jak wykryć combo "śnieżyca" (snow + storm wind) w phrase matching engine — dodatkowa warstwa condition matching?
- [Affects R11][Technical] Czy Perception sumuje bonus z widoczności i słuchu, czy bierze najgorszy? (propozycja: sumuje, bo to różne źródła)
- [Affects R10][Technical] Jak BiomeConfig powinien wyrażać blokadę pory dnia — nowe pole `ignoresTimeOfDay: boolean`?

## Next Steps

→ `/ce:plan` for structured implementation planning
