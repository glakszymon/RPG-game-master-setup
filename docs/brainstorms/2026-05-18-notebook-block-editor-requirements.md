---
date: 2026-05-18
topic: notebook-block-editor
---

# Notatnik — Block Editor & Session Orchestrator

## Problem Frame

GM przygotowujący sesję RPG potrzebuje centralnego miejsca do pisania scenariuszy, które jednocześnie integruje się z innymi narzędziami (mapa, combat tracker, soundboard, kalendarz). Obecne rozwiązania (Word, Notion, papier) wymuszają przełączanie kontekstu. Notatnik w Game Master Panel powinien być "cockpitem sesji" — tekst scenariusza z osadzonymi wyzwalaczami, linkami do postaci i makrami automatyzacji.

## Requirements

### Faza 1: Core Editor

- R1. Block editor oparty na Tiptap (ProseMirror) z typami bloków: paragraph, H1-H3, bullet list, numbered list, task list (checkboxy), table, code block, horizontal separator
- R2. Slash commands menu (/) do wstawiania bloków
- R3. Drag & drop reorder bloków
- R4. Sidebar z drzewem plików i folderów (tworzenie, usuwanie, przenoszenie, rename)
- R5. Wyszukiwanie po tytule i treści notatek
- R6. Autozapis — zapis automatyczny po edycji (debounce), brak przycisku "Zapisz"
- R7. Przechowywanie w SQLite: struktura folderów/plików w osobnej tabeli, treść notatki jako Tiptap JSON
- R8. Notatnik jako tool window w InfiniteCanvas (integracja z istniejącym systemem okien)

### Faza 2: Warstwy & Powiązania

- R9. Warstwy DM/Gracz: każdy blok ma atrybut widoczności (dm-only / player-visible). Bloki DM-only oznaczone wizualnie kolorem tła. Przycisk toggle ukrywa/pokazuje warstwę DM
- R10. Stały prawy panel obok edytora wyświetlający karty powiązanych elementów (NPC, potwory, przedmioty) z aktualnej notatki
- R11. Ręczne linkowanie elementów w tekście (inline mention/tag) — kliknięcie otwiera kartę w side-panelu
- R12. Automatyczne wykrywanie znanych nazw NPC/potworów w tekście (opcjonalne, secondary)

### Faza 3: Makra & Triggers

- R13. Audio Trigger blok: przycisk osadzony w tekście, kliknięcie uruchamia przypisany dźwięk/ambient z soundboardu
- R14. Encounter Set blok: grupowanie postaci/potworów z side-panelu, przycisk przenosi je do combat trackera
- R15. Super-Trigger blok (makro): wizualny builder akcji — przycisk wykonujący sekwencję: zmiana mapy, rozstawienie tokenów, zmiana muzyki, uruchomienie VFX
- R16. Wizualny builder makr: lista kroków do wyboru (select map, place tokens, play music, set ambient, toggle FoW) z parametrami per krok

### Faza 4: Story Graph

- R17. Story Graph jako custom blok wewnątrz notatki — interaktywny mini-canvas z węzłami (scenami) i krawędziami (przejściami)
- R18. Węzły grafu linkują do innych notatek lub sekcji w aktualnej notatce
- R19. Zarządzanie alternatywnymi ścieżkami fabularnymi — oznaczanie aktywnej ścieżki w trakcie sesji
- R20. Wizualne przełączanie aktywnej linii fabularnej (highlight aktywnej ścieżki, dimming nieaktywnych)

### Faza 5: Integracja z Kalendarzem

- R21. Blok daty/wydarzenia: inline element linkujący do konkretnego dnia w istniejącym module time-calendar
- R22. Zależności czasowe (Deadlines): blok warunkowy "jeśli przed dniem X → A, w przeciwnym razie → B" z wizualnym statusem (zielony/czerwony)
- R23. Automatyczna synchronizacja — dodanie daty w notatce tworzy event w kalendarzu i odwrotnie

## Success Criteria

- GM może napisać pełny scenariusz sesji w edytorze bez przełączania do zewnętrznych narzędzi
- Jednym kliknięciem (makro) przygotowuje scenę: mapa + tokeny + muzyka
- Treść notatek persystuje między sesjami aplikacji (SQLite)
- Side-panel daje natychmiastowy dostęp do statystyk postaci bez opuszczania tekstu

## Scope Boundaries

- **Nie:** Współpraca wieloosobowa / real-time sync
- **Nie:** Export do PDF/Markdown (może w przyszłości, ale poza zakresem)
- **Nie:** Import z Notion/OneNote
- **Nie:** Osadzanie obrazów inline w Fazie 1 (dodać w późniejszej iteracji)
- **Nie:** AI-assisted writing / autogeneracja treści

## Key Decisions

- **Tiptap (ProseMirror):** Wybrana nad BlockNote ze względu na pełną kontrolę nad custom blokami (graf canvas, builder makr, audio triggers). Headless = budujemy własny UI pasujący do design systemu aplikacji.
- **Blok grafu wewnątrz notatki:** Story Graph nie jest osobnym oknem, lecz custom blokiem Tiptap z interaktywnym canvasem.
- **Warstwy via kolorowe oznaczenie + toggle:** Bloki DM mają kolorowe tło, jeden przycisk przełącza widoczność całej warstwy.
- **Stały prawy panel:** Karty NPC/potworów w panelu obok edytora (nie popup/hover).
- **Wizualny builder makr:** Nie skryptowy, użytkownik buduje sekwencję akcji z listy.
- **Fazy implementacji:** Editor → Powiązania → Makra → Graf → Kalendarz.
- **Storage:** Tiptap JSON w SQLite, struktura folderów w osobnej tabeli.

## Dependencies / Assumptions

- Soundboard musi mieć API pozwalające programmatycznie uruchomić dźwięk (dla audio triggers i makr)
- Combat tracker musi przyjmować zewnętrzne zestawy postaci (dla Encounter Sets)
- Moduł mapy musi udostępniać API do zmiany mapy i rozstawienia tokenów (dla Super-Triggers)
- Istniejący time-calendar module ma API do tworzenia wydarzeń

## Outstanding Questions

### Resolve Before Planning
(brak — wszystkie decyzje produktowe podjęte)

### Deferred to Planning

- [Affects R1][Needs research] Dokładna konfiguracja Tiptap extensions — które wbudowane, które custom
- [Affects R7][Technical] Schema SQLite dla notatek: jedna tabela (id, folder_id, title, content_json, timestamps) czy bardziej znormalizowana
- [Affects R10][Technical] Jak side-panel komunikuje się z edytorem — event bus, shared state, czy props drilling
- [Affects R15-R16][Technical] Architektura systemu makr — jak makro wywołuje akcje w innych tool windows (IPC? shared dispatcher?)
- [Affects R17][Needs research] Biblioteka do node-based grafu wewnątrz bloku (React Flow? custom canvas? D3?)
- [Affects R12][Needs research] Algorytm automatycznego wykrywania nazw — fuzzy match po known entities z bazy?
- [Affects R1][Technical] Jak zbudować UI toolbara i slash menu pasujący do istniejącego design systemu (glassmorphism, CSS Modules)

## Next Steps

→ `/ce:plan` for structured implementation planning (start from Phase 1: Core Editor)
