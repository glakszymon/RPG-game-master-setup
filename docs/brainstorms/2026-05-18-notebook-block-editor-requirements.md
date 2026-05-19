---
date: 2026-05-18
topic: notebook-block-editor
---

# Notatnik — Block Editor & Session Orchestrator

## Problem Frame

GM przygotowujący sesję RPG potrzebuje centralnego miejsca do pisania scenariuszy, które integruje się z mapą, combat trackerem, soundboardem i kalendarzem. Notatnik w Game Master Panel to "cockpit sesji" — tekst scenariusza z osadzonymi presetami scen, referencjami do postaci i wizualizacją powiązań między scenami.

## Requirements

### Faza 1: Core Editor

- R1. Block editor oparty na Tiptap (ProseMirror) z blokami: paragraph, H1-H3, bullet list, numbered list, task list (checkboxy), table, code block, horizontal separator
- R2. Slash commands menu (/) do wstawiania bloków
- R3. Drag & drop reorder bloków
- R4. Callout blocks z kolorowym paskiem bocznym (predefiniowane kolory: niebezpieczeństwo, uwaga, skarb, info, itp.)
- R5. Sidebar z drzewem plików i folderów (tworzenie, usuwanie, przenoszenie, rename)
- R6. Wyszukiwanie po tytule i treści notatek
- R7. Autozapis — debounced zapis po edycji, brak przycisku "Zapisz"
- R8. Przechowywanie w SQLite: struktura folderów/plików w osobnej tabeli, treść notatki jako Tiptap JSON
- R9. Notatnik jako tool window w InfiniteCanvas (integracja z systemem okien)

### Faza 2: Graf & Powiązania

- R10. Layout 3-kolumnowy: lewy panel (taby Graph/Files) | edytor | prawy panel powiązań
- R11. Slash link — wpisanie /nazwa-notatki w tekście tworzy inline link do innej notatki i automatycznie generuje krawędź w grafie
- R12. Story Graph — interaktywna wizualizacja w lewym panelu pokazująca notatki jako węzły i slash-linki jako krawędzie
- R13. Referencje @postać — inline mention autocomplete z istniejących postaci/potworów w bibliotece/kampanii
- R14. Prawy panel automatycznie zbiera i wyświetla WSZYSTKIE @postacie, mapy i muzykę referencowane w aktualnej notatce
- R15. Przycisk "Utwórz Encounter Set" w prawym panelu — zbiera wszystkie @postacie z notatki i tworzy grupę w module Encounter Sets (nazwa z inputu lub nazwa pliku)

### Faza 3: Presety, Makra & Integracje

- R16. Preset mapy — przycisk otwierający pełnoprawne okno mapy w trybie planowania; użytkownik ustawia mapę, tokeny, FoW, VFX, klika "Zapisz preset"; preset linkowany do notatki i widoczny w prawym panelu
- R17. Wiele presetów mapy per notatka (np. "początek walki", "faza 2 — boss")
- R18. Jednoklickowe załadowanie presetu — przycisk w prawym panelu ładuje zapisany stan do aktywnego okna mapy
- R19. Builder makra jako blok Tiptap — wizualna lista kroków (ustaw mapę, rozstaw tokeny, włącz muzykę, zmień ambient) z przyciskiem "Play" wykonującym sekwencję
- R20. Referencje muzyki — inline mention (analogicznie do @postać) linkujące do utworów z biblioteki dźwięków, widoczne w prawym panelu z przyciskiem Play
- R21. Muzyka jako krok w builderze makra
- R22. Inline data/wydarzenie — tag z datą in-game w tekście automatycznie tworzący event w module time-calendar
- R23. Kliknięcie eventu w kalendarzu otwiera powiązaną notatkę

## Success Criteria

- GM może napisać pełny scenariusz sesji bez przełączania do zewnętrznych narzędzi
- Jednym kliknięciem (preset lub makro) przygotowuje scenę: mapa + tokeny + muzyka
- Story graph wizualizuje strukturę narracji i pozwala nawigować między scenami
- Treść persystuje między sesjami (SQLite)
- Prawy panel daje natychmiastowy dostęp do postaci/map/muzyki z notatki

## Scope Boundaries

- **Nie:** Współpraca wieloosobowa / real-time sync
- **Nie:** Export do PDF/Markdown
- **Nie:** Import z Notion/OneNote
- **Nie:** Osadzanie obrazów inline (poza przyszłymi iteracjami)
- **Nie:** AI-assisted writing
- **Nie:** Warstwy widoczności DM/Gracz (notatnik jest prywatny dla GM)

## Key Decisions

- **Tiptap (ProseMirror):** Pełna kontrola nad custom blokami (graf, macro builder, presety). Headless = własny UI pasujący do glassmorphism design systemu.
- **3-kolumnowy layout:** Lewy panel z tabami Graph/Files, środek edytor, prawy panel powiązań.
- **Slash link (/nazwa):** Tworzenie powiązań między notatkami i krawędzi grafu przez wpisanie /nazwa w tekście.
- **Preset mapy (nie mini-podgląd):** Użytkownik otwiera pełne okno mapy w trybie planowania, ustawia stan, zapisuje. Prostszy UX, reużycie istniejącego kodu mapy.
- **Kontekstowy panel = cała notatka:** Prawy panel zbiera wszystkie referencje z aktualnej notatki (nie per sekcję).
- **Callout-style kolorystyka:** Bloki z kolorowym paskiem bocznym zamiast warstw widoczności.
- **3 fazy implementacji:** Core → Graf & Powiązania → Presety/Makra/Integracje.

## Dependencies / Assumptions

- Soundboard musi mieć API do programmatycznego uruchomienia dźwięku (R19-R21)
- Combat tracker / Encounter Sets musi przyjmować zewnętrzne grupy postaci (R15)
- Moduł mapy musi udostępniać: zapis/odczyt pełnego stanu jako preset, załadowanie presetu (R16-R18)
- Time-calendar module ma API do tworzenia eventów (R22-R23)
- Biblioteka postaci/potworów ma API do listowania i wyszukiwania (R13)

## Outstanding Questions

### Resolve Before Planning
(brak — wszystkie decyzje produktowe podjęte)

### Deferred to Planning

- [Affects R1][Needs research] Konfiguracja Tiptap extensions — które wbudowane, które custom
- [Affects R8][Technical] Schema SQLite: tabela notatek (id, folder_id, title, content_json, timestamps) + tabela folderów + tabela presetów
- [Affects R12][Needs research] Biblioteka do renderowania grafu (React Flow, D3, custom canvas?)
- [Affects R14][Technical] Jak prawy panel parsuje referencje z Tiptap JSON (observer na dokument vs analiza przy renderze)
- [Affects R16][Technical] Format przechowywania presetu mapy (pełny snapshot stanu MapDisplayState?)
- [Affects R19][Technical] Architektura makr — jak makro wywołuje akcje w innych tool windows (IPC dispatcher?)
- [Affects R11][Technical] Autocomplete dla slash-linków — skąd lista notatek (query SQLite? cache?)

## Next Steps

→ `/ce:plan` for structured implementation planning (start from Phase 1: Core Editor)
