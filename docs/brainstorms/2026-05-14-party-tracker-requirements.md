---
date: 2026-05-14
topic: party-tracker
---

# Party Tracker

## Problem Frame
GM potrzebuje szybkiego podglądu i edycji danych drużyny podczas sesji. Karty postaci powinny być elastyczne (custom pola), a struktura kart wspólna dla całej kampanii. Dane muszą być persystentne i współdzielone z innymi modułami (Combat Tracker).

## Requirements

### Okienko Party Tracker

- R1. Party Tracker to window na infinite canvas (przesuwalne, resizable)
- R2. Karty postaci ułożone obok siebie w rzędzie z flex-wrap (zawijanie do kolejnych wierszy gdy brakuje miejsca)
- R3. Rozmiar kart konfigurowalny przez presety (S / M / L) — ustawienie w gear menu
- R4. Przycisk "+" na końcu rzędu kart dodaje nową pustą postać
- R5. Drag&drop kart zmienia kolejność postaci w party
- R6. Przycisk ustawień (gear) w prawym górnym rogu okienka — opcje: edytuj strukturę kart, usuń postać, preset rozmiaru

### Karta postaci

- R7. Każda karta zawiera: zdjęcie postaci (góra, wycentrowane) + nazwa postaci (pod zdjęciem) + custom pola poniżej
- R8. Zdjęcie postaci: klik na placeholder/zdjęcie otwiera file picker do uploadu
- R9. Nazwa postaci: double-click włącza inline edit
- R10. Wartości pól edytowane inline bezpośrednio na karcie (klik w pole -> edycja)
- R11. Domyślne pola przy tworzeniu nowej kampanii: HP, Armor, Initiative — ale są usuwalne/edytowalne jak każde inne pole

### Edytor struktury kart (Card Editor)

- R12. Otwierany z gear menu jako modal overlay nad canvasem
- R13. Layout dwukolumnowy: lewa — podgląd na żywo karty, prawa — lista pól do edycji
- R14. Struktura kart jest wspólna dla wszystkich postaci w kampanii
- R15. Lista pól ułożona pionowo, kolejność zmieniana drag&drop
- R16. Dodawanie nowego pola: wybór typu (Number, Bubbles, Text Field, Text Box, Radio, Checkbox)
- R17. Każde pole ma ustawienia: tytuł, szerokość (1/3, 1/2, 2/3, full), text-align (lewo/środek/prawo), pozycja w wierszu (lewo/środek/prawo)
- R18. Pola z auto-flow: pola o łącznej szerokości ≤ 1 automatycznie stają obok siebie w jednym wierszu
- R19. Ustawienia specyficzne per typ:
  - Number: opcja włączenia suwaka (jeśli włączony — wymagane min i max)
  - Bubbles: ilość kółek (stała ilość, user zaznacza wypełnione)
  - Radio: lista opcji (etykiety)
  - Text Field / Text Box / Checkbox: brak dodatkowych ustawień
- R20. Przyciski Cancel i Save na dole edytora

### Persystencja i integracja

- R21. Dane postaci (wartości pól, zdjęcia) i struktura kart zapisywane w SQLite per kampania
- R22. Combat Tracker współdzieli dane postaci z Party Tracker (HP, Initiative itp.)

## Success Criteria
- GM może stworzyć party, dodać postacie, ustawić zdjęcia i edytować wartości inline w < 2 min
- Edytor struktury kart pozwala zbudować dowolny layout pól z podglądem na żywo
- Dane persystują między sesjami i są dostępne z Combat Trackera

## Scope Boundaries
- Brak: Party Manager modal (widok tabelaryczny jak w Mithos) — ewentualnie później
- Brak: ukrywanie pól (hidden fields widoczne tylko w edytorze) — ewentualnie później
- Brak: eksport/import postaci
- Brak: NPC w Party Tracker (osobny moduł)

## Key Decisions
- Flex-wrap zamiast scroll horyzontalnego — lepiej widać wszystkie postacie
- Inline editing wartości (nie modal) — szybkość w trakcie sesji
- Struktura kart wspólna dla kampanii (nie per postać) — spójność, prostszy edytor
- Presety rozmiaru (S/M/L) zamiast dokładnej wartości — prostsze UX
- Double-click na nazwę (nie single-click) — zapobiega przypadkowej edycji

## Dependencies / Assumptions
- Window system na infinite canvas musi być zaimplementowany
- SQLite database setup per kampania
- Design system (glassmorphism surfaces) dla wyglądu kart i modalu

## Outstanding Questions

### Deferred to Planning
- [Affects R22][Technical] Jak dokładnie wygląda shared data model między Party Tracker a Combat Tracker?
- [Affects R5][Technical] Jaka biblioteka do drag&drop (dnd-kit, react-beautiful-dnd, inna)?
- [Affects R8][Technical] Gdzie przechowywane są pliki zdjęć (ścieżka w SQLite + folder na dysku)?
- [Affects R18][Technical] Implementacja auto-flow layoutu pól (CSS grid vs custom logic)?

## Next Steps
→ `/ce:plan` for structured implementation planning
