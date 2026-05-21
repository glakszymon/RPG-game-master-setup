---
date: 2026-05-21
topic: weather-generator
---

# Weather Generator (Generator Pogody)

## Problem Frame

DM potrzebuje szybko generować wiarygodną pogodę podczas sesji — zarówno do opisu narracyjnego dla graczy, jak i do oceny wpływu pogody na mechanikę gry (widoczność, podróż, walka). Obecny projekt nie ma takiego narzędzia.

## Requirements

- R42. DM ustawia parametry pogody ręcznie lub losuje je kontekstowo (biom + pora roku)
- R43. System analizuje parametry i generuje dwuczęściowy wynik: opis narracyjny + sugestie mechaniczne
- R44. Parametry wejściowe: temperatura (suwak °C), zachmurzenie (kategorie), siła wiatru (kategorie), kierunek wiatru (enum 8 stron), wilgotność (suwak %), opady (kategorie), pora dnia/roku (automatycznie z Time Tracker lub ręcznie)
- R45. Losowanie kontekstowe — DM wybiera biom z 10 wbudowanych presetów, system losuje sensowne parametry w zakresach tego biomu i pory roku
- R46. Generowanie opisu — semi-losowe z puli fraz: system dobiera frazy pasujące do kombinacji parametrów, losuje wariant, dając różnorodność przy tych samych parametrach
- R47. Wynik podzielony na: (1) opis narracyjny — krótki tekst do odczytania graczom, (2) sugestie mechaniczne w formacie zwięzła lista + krótki opis kontekstowy
- R48. Integracja z Time Trackerem — pora dnia i pora roku pobierana automatycznie z aktywnego Time Trackera (jeśli istnieje w workspace), z możliwością ręcznego override
- R49. Sugestie mechaniczne obejmują 4 kategorie wpływu: widoczność (zasięg widzenia), prędkość podróży, zużycie zasobów (woda/jedzenie), zagrożenia środowiskowe (odmrożenia, udar cieplny)
- R50. Biom determinuje które parametry są aktywne w UI — np. Podziemia ukrywa zachmurzenie i kierunek wiatru, pokazuje tylko temperaturę, wilgotność i opcjonalny "przepływ powietrza"

## Biomy (10 presetów)

| Biom | Kluczowe cechy | Uwagi |
|------|---------------|-------|
| Arktyczny | Ekstremalnie zimny, silne wiatry, niskie opady | Pełne parametry |
| Umiarkowany | Cztery wyraźne pory roku, zrównoważony | Pełne parametry |
| Pustynny | Gorący dzień / zimna noc, minimalnie wilgotny | Pełne parametry |
| Tropikalny | Gorący, wilgotny, pora deszczowa/sucha | Pełne parametry |
| Górski | Zimny, wietrzny, zmienne warunki | Pełne parametry |
| Morski | Wietrzny, wilgotny, łagodna temperatura | Pełne parametry |
| Leśny | Osłonięty od wiatru, wilgotny, ograniczona widoczność | Pełne parametry |
| Step | Suchy, wietrzny, duże wahania temperatury | Pełne parametry |
| Bagno/Mokradła | Wysoka wilgotność, mgły, umiarkowana temperatura | Pełne parametry |
| Podziemia | Stabilna temperatura, brak nieba | Uproszczone: temperatura, wilgotność, przepływ powietrza |

## Success Criteria

- DM może wygenerować pogodę w < 3 klikach (wybierz biom → losuj → gotowe)
- Ręczne ustawianie parametrów daje natychmiastowy podgląd opisu
- Wygenerowany opis jest wystarczająco różnorodny (ten sam zestaw parametrów nie daje identycznego tekstu za każdym razem)
- Sugestie mechaniczne są systemowo-agnostyczne (nie zakładają D&D/PF2e konkretnie)

## Scope Boundaries

- Brak integracji z mapą (pogoda nie zmienia wizualnie mapy)
- Brak historii pogody / prognozy na kolejne dni (v1)
- Brak konfigurowalnych biomów — tylko wbudowane presety
- Sugestie mechaniczne to tekst informacyjny, nie automatyczne modyfikatory w combat trackerze
- Pula fraz w języku polskim (hardcoded lub JSON)

## Key Decisions

- **Hybrydowy flow**: DM wybiera ręcznie LUB losuje — oba ścieżki prowadzą do tego samego generatora opisu
- **Semi-losowa pula fraz**: Daje różnorodność bez zależności od API/AI. Frazy pogrupowane wg zakresów parametrów
- **Mix inputów**: Temperatura i wilgotność jako suwaki (precyzja), reszta jako kategorie/enum (szybkość)
- **10 wbudowanych biomów**: Pełny zestaw pokrywający typowe scenariusze RPG, w tym podziemia
- **Biom determinuje aktywne parametry**: Podziemia i inne specyficzne biomy ukrywają nieistotne pola (UX)
- **Integracja z Time Tracker**: Automatyczne pobieranie pory — mniej klikania, spójność danych
- **4 kategorie mechaniczne**: Widoczność, podróż, zasoby, zagrożenia — lista + opis kontekstowy

## Dependencies / Assumptions

- Time Tracker musi eksponować porę dnia/roku (sprawdzić czy już to robi lub zaplanować wspólny interface)
- Pula fraz wymaga napisania — to praca contentowa, nie tylko kodowa

## Outstanding Questions

### Deferred to Planning

- [Affects R46][Needs research] Jaka struktura danych najlepiej opisze pulę fraz z warunkami dopasowania do parametrów?
- [Affects R48][Technical] Jak Time Tracker eksponuje porę dnia/roku — bezpośredni dostęp do stanu czy przez event/callback?
- [Affects R44][Technical] Dokładne zakresy kategorii (ile stopni zachmurzenia, ile stopni siły wiatru)
- [Affects R50][Technical] Jak dynamicznie ukrywać/pokazywać parametry w zależności od wybranego biomu

## Next Steps

→ `/ce:plan` for structured implementation planning
