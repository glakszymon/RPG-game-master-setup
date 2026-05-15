---
date: 2026-05-15
topic: bestiary
---

# Bestiary — Creature Library & Encounter Prep

## Problem Frame

DM potrzebuje przygotować stworzenia przed sesją i mieć je pod ręką w trakcie gry. Obecnie nie ma miejsca na przechowywanie statblocków ani organizowanie ich pod konkretne scenariusze. Potwory muszą trafiać na mapę i do combat trackera bez ręcznego przepisywania.

## Requirements

- R1. **Biblioteka szablonów** — trwała kolekcja stworzeń ze statystykami D&D 5e (HP, AC, ability scores, ataki, cechy specjalne, CR, typ, speed) + możliwość dodania custom pól (klucz-wartość)
- R2. **Tagowanie i filtrowanie** — stworzenia w bibliotece mają tagi (typ: undead/beast/humanoid, źródło: homebrew/SRD, CR range). Wyszukiwarka filtruje po nazwie i tagach
- R3. **Hierarchiczne zestawy (Encounter Sets)** — drzewko folderów o nieograniczonej głębokości (np. Kampania > Akt 1 > Lokacja > Pokój). Stworzenia w zestawie to instancje szablonu
- R4. **Instancje vs szablony** — instancja w zestawie referuje szablon z biblioteki, ale może mieć nadpisane wartości (np. zmienione HP, nadane imię). Edycja szablonu propaguje się do instancji, o ile pole nie zostało nadpisane
- R5. **Drag & drop do mapy i combat trackera** — przeciągnięcie instancji z zestawu na okno mapy tworzy token; przeciągnięcie do combat trackera dodaje stworzenie do inicjatywy
- R6. **Dwu-panelowy layout** — lewy panel: przełączanie między widokiem Biblioteki a widokiem Zestawów (drzewko). Prawy panel: szczegóły wybranego stworzenia / edycja
- R7. **Context menu w drzewku** — prawy klik na folderze: nowy podfolder, zmień nazwę, usuń. Prawy klik na instancji: edytuj, duplikuj, usuń
- R8. **Drag & drop wewnątrz drzewka** — przeciąganie folderów i instancji między folderami do reorganizacji
- R9. **Drag z biblioteki do zestawu** — przeciągnięcie stworzenia z panelu Biblioteki do folderu w drzewku tworzy instancję
- R10. **Awatar stworzenia** — custom image (upload) z fallbackiem na ikonę typu (beast=🐻, undead=💀, humanoid=🧑 itd.) gdy brak obrazka
- R11. **Kolorowanie wg CR** — instancje w drzewku mają automatyczny kolor wg CR (zielony = łatwy, żółty = średni, czerwony = trudny) jako subtelny indicator obok nazwy
- R12. **Usuwanie szablonu** — usunięcie szablonu z biblioteki osieraca instancje w zestawach (zachowują skopiowane dane, tracą link do szablonu i propagację zmian)
- R13. **Formularz z sekcjami** — edycja stworzenia jako scrollowalny formularz z sekcjami: Basic (nazwa, typ, CR, HP, AC, speed, image), Abilities (6 ability scores + saving throws), Actions (lista strukturyzowana), Traits (lista), Custom Fields (klucz-wartość)
- R14. **Tylko nazwa wymagana** — przy tworzeniu stworzenia jedyne obowiązkowe pole to nazwa. Reszta opcjonalna, wypełniana stopniowo
- R15. **Hybrid actions** — akcje/ataki domyślnie strukturyzowane (nazwa, opis, bonus to hit, damage dice), z opcją przełączenia na free-text dla skomplikowanych przypadków

## Success Criteria

- DM może przygotować encounters przed sesją i w trakcie gry jednym gestem przenieść stworzenia na mapę/do walki
- Edycja szablonu w bibliotece aktualizuje wszystkie nie-nadpisane instancje
- Nawigacja po zestawach jest szybka nawet przy 50+ stworzeniach w drzewku

## Scope Boundaries

- Brak importu z plików (np. JSON, D&D Beyond) — na razie tylko ręczne tworzenie
- Brak automatycznego generowania encounterów / CR-balance
- Brak udostępniania biblioteki między kampaniami (jedna globalna biblioteka na aplikację)
- Combat tracker i mapa muszą już istnieć aby integracja działała — bestiary nie implementuje ich logiki
- Brak masowych operacji (multi-select, batch add) — single-item workflow na start

## Key Decisions

- **Szablon + instancja**: edycja szablonu propaguje się, instancje mogą nadpisywać pola
- **Nieograniczona głębokość drzewka**: user sam decyduje o strukturze
- **D&D 5e + custom fields**: stałe pola statblocku + elastyczne rozszerzenia
- **Drag & drop jako główny mechanizm integracji** z mapą i combat trackerem

## Dependencies / Assumptions

- Istniejący drag & drop system na canvas (HTML5 DnD z `application/json`) — już działa w map-display
- ToolType `'bestiary'` już zarejestrowany w `canvas/types.ts`
- SQLite persistence via sql.js — nowe tabele dla creatures i encounter sets

## Outstanding Questions

### Deferred to Planning

- [Affects R1][Needs research] Schemat tabel SQLite — jak modelować szablon/instancję/nadpisania efektywnie
- [Affects R4][Technical] Mechanizm propagacji zmian szablonu do instancji — eager (przy zapisie szablonu) vs lazy (przy renderze instancji)
- [Affects R5][Technical] Format danych w drag & drop payload — rozszerzenie istniejącego `DragPayload` z map-display
- [Affects R3][Technical] Jak persystować drzewko folderów w SQLite (adjacency list vs nested set vs path enumeration)

## Next Steps

-> `/ce:plan` for structured implementation planning
