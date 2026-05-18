---
date: 2026-05-18
topic: combat-tracker
---

# Combat Tracker

## Problem Frame

GM potrzebuje narzedzia do prowadzenia walki w czasie rzeczywistym sesji. Musi sledzic kolejnosc tur, HP, warunki i szybko modyfikowac stan uczestnikow bez przerywania flow gry.

## Requirements

### Lista uczestnikow i wyswietlanie (R27 expansion)

- R1. Lista uczestnikow wyswietlana w kolejnosci inicjatywy (malejaco)
- R2. Kazdy uczestnik wyswietla: portret, nazwe, HP/Max HP, wartosc inicjatywy, aktywne warunki/statusy
- R3. Aktywny uczestnik podswietlony wizualnie (wyrozniajaca sie karta)
- R4. Uczestnik z HP = 0 ma karte podswietlona na czerwono
- R5. Uczestnik z HP > Max HP (overheal) ma karte podswietlona na zielono

### System tur

- R6. Przycisk "Nastepna tura" przesuwa podswietlenie na kolejnego uczestnika
- R7. Po ostatnim uczestniku auto-reset na gore listy, licznik rund zwiekszany o 1
- R8. Wyswietlany numer aktualnej rundy

### Dodawanie uczestnikow (R30 expansion)

- R9. Drag&drop z Party Trackera do Combat Trackera
- R10. Drag&drop z Bestiariusza do Combat Trackera
- R11. Reczne dodawanie: przycisk "+" otwiera formularz (nazwa, HP, Max HP, initiative modifier, portret)
- R12. Dodawanie po jednym z bestiariusza (bez batch), ale encounter sets moga dropowac grupe naraz
- R12a. Drag&drop z okna Encounter Sets laduje caly zestaw potworow do walki jednym dropem

### Rzut inicjatywy (R31 expansion)

- R13. Przycisk "Roll All" — losuje d20 + initiative modifier dla kazdego uczestnika, sortuje liste malejaco
- R14. Mozliwosc recznego wpisania wartosci inicjatywy per uczestnik (pole edytowalne)
- R15. Przycisk "Sort" — sortuje liste wg aktualnych wartosci inicjatywy
- R16. Drag&drop reczne sortowanie kolejnosci (override)

### Damage/Heal (R28 expansion)

- R17. Klikniecie na HP otwiera popup z polem liczbowym
- R18. Popup ma dwa przyciski: "Damage" (odejmuje) i "Heal" (dodaje)
- R19. HP moze spasc ponizej 0 (wyswietla 0) i moze przekroczyc Max HP (overheal)

### Warunki/statusy (R29 expansion)

- R20. Preset lista warunkow domyslnych (Stunned, Poisoned, Blinded, Frightened, Prone, Paralyzed, Charmed, Restrained, Invisible, Incapacitated)
- R21. GM moze dodawac/usuwac custom warunki w ustawieniach kampanii
- R22. Toggling warunku na uczestniku: klik na ikone warunkow otwiera liste checkboxow
- R23. Aktywne warunki wyswietlane jako male ikony/badgi na karcie uczestnika

### Integracja z mapa

- R24. Drag&drop uczestnika z Combat Trackera na mape tworzy token na mapie

### Usuwanie uczestnikow

- R25. Przycisk X na karcie z potwierdzeniem "Czy na pewno?" przed usunieciem
- R26. Usuwanie z Combat Trackera nie usuwa z Bestiariusza/Party Trackera

### Ustawienia

- R27. Reset Combat Tracker — czysci wszystkich uczestnikow i resetuje runde

## Scope Boundaries

- Brak player-facing view — narzedzie tylko dla GM
- Brak batch dodawania (multi-instance) — dodajemy po jednym
- Staly d20 jako kosc inicjatywy (nie konfigurowalne)
- Brak historii obrazen — popup tylko do aktualnej modyfikacji
- Brak integracji z systemem regul (np. automatyczne efekty warunkow)

## Success Criteria

- GM moze przeprowadzic pelna walke (setup -> roll initiative -> tury -> damage/heal -> koniec) bez opuszczania narzedzia
- Czas dodania uczestnika i przejscia tury < 2 klikniecia
- Stan walki persystowany w SQLite (przezywa restart okna)

## Key Decisions

- Auto-reset rund (bez dialogu/potwierdzenia)
- Popup do damage/heal (nie inline)
- Preset warunkow + custom per kampania
- Drag&drop pojedynczo na mape (bez batch load)
- Tylko GM view
- d20 stale (nie konfigurowalne)
- Usuwanie z potwierdzeniem

## Dependencies / Assumptions

- Party Tracker i Bestiariusz musza wspierac drag&drop jako zrodlo danych
- Mapa musi obslugiwac drop tokenow (czesc istniejacego R26 z map requirements)
- Struktura danych uczestnika musi byc kompatybilna z tokenami mapy

## Outstanding Questions

### Deferred to Planning

- [Affects R9, R10][Technical] Jaki format danych w drag&drop transfer miedzy narzedzami?
- [Affects R20][Technical] Jak przechowywac custom warunki per kampania w SQLite schema?
- [Affects R24][Technical] Jak synchronizowac HP miedzy combat trackerem a tokenem na mapie?
- [Affects R2][Needs research] Jakie ikony/wizualizacje dla warunkow? Czy uzyc emoji, SVG icons, czy tekst?

## Next Steps

-> /ce:plan for structured implementation planning
