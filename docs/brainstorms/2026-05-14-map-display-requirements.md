---
date: 2026-05-14
topic: map-display-tool
---

# Mapa Rozgrywki (Map Display Tool)

## Problem Frame
GM potrzebuje interaktywnego narzędzia do wyświetlania battlemap podczas sesji RPG — z Fog of War do kontrolowania widoczności, tokenami graczy/potworów oraz efektami wizualnymi. Moduł jest częścią Game Master Panel i integruje się z Party Trackerem, Bestiariuszem oraz Combat Trackerem (R23-R26).

## Requirements

### Rendering i warstwy
- R1. Mapa renderowana przez Pixi.js (WebGL) w stosie warstw: obraz tła → siatka → tokeny → Fog of War → UI overlay
- R2. Obraz mapy ładowany z globalnej biblioteki map (osobny moduł, poza scope) — moduł przyjmuje ścieżkę do pliku obrazka. Fallback: systemowy file picker (Electron dialog) dopóki biblioteka map nie istnieje

### Siatka
- R3. Konfigurowalny typ siatki: kwadratowa, heksagonalna, brak
- R4. Konfigurowalny rozmiar komórki siatki
- R5. Siatka jest czysto wizualna — nie wpływa na pozycjonowanie tokenów (brak snap-to-grid)

### Fog of War
- R6. Warstwa FoW pokrywa całą mapę domyślnie (pełne zakrycie)
- R7. Dwa osobne narzędzia: "Reveal" (odsłanianie) i "Conceal" (zakrywanie)
- R8. Każde narzędzie FoW ma regulowany rozmiar pędzla i przezroczystość (100% = pełne odsłonięcie, 50% = mgła, 0% = pełne zakrycie)
- R9. Malowanie freehand — pociągnięcia pędzlem o dowolnym kształcie
- R10. Bulk actions: "Odsłoń całą mapę" i "Zakryj całą mapę"

### Tokeny
- R11. Tokeny dodawane przez drag&drop z paneli Party Tracker i Bestiariusz
- R12. Wygląd tokena: okrągły avatar (obrazek postaci/potwora), fallback na kolorowe koło z inicjałami, nazwa wyświetlana pod tokenem
- R13. Swobodne przesuwanie tokenów po mapie (drag&drop, bez snap-to-grid)
- R14. Integracja z Combat Trackerem — ładowanie uczestników walki jako tokeny na mapę (R26)

### Nawigacja
- R15. Tryb nawigacji: scroll = zoom, drag = pan
- R16. Zoom i pan działają wewnątrz okienka mapy (nie wpływają na resztę UI)

### Toolbar
- R17. Toolbar z przełączaniem trybów/narzędzi: Nawigacja, Pędzel FoW (Reveal/Conceal), Tokeny, Efekty VFX
- R18. Aktywne narzędzie blokuje domyślne zachowanie canvasa (np. w trybie pędzla drag = malowanie, nie pan)
- R19. Toolbar wyświetla panel ustawień aktywnego narzędzia (rozmiar, styl, opacity, i inne parametry specyficzne dla narzędzia)

### Efekty VFX
- R20. Preset library z 5-10 gotowymi efektami (ogień, eksplozja, mgła, błyskawica, dym, światło itp.)
- R21. GM umieszcza efekt w wybranym punkcie na mapie
- R22. Konfiguracja per efekt: tryb (one-shot / persistent), opóźnienie startu / trigger manualny, rozmiar, czas trwania
- R23. Efekty persistent pozostają na mapie aż GM je usunie; one-shot grają i znikają automatycznie

### Zapis stanu
- R24. Stan mapy zapisywany między sesjami w SQLite (sql.js)
- R25. Zapisywane dane: ścieżka do obrazka, konfiguracja siatki (typ, rozmiar, opacity), pozycje tokenów (JSON), maska FoW (PNG blob)
- R26. FoW: hybryda — trwały zapis jako PNG blob w SQLite + tymczasowy stroke buffer w pamięci dla undo/redo w bieżącej sesji

## Success Criteria
- GM może załadować mapę, nałożyć siatkę, rozstawić tokeny i odsłaniać FoW pędzlem w płynny sposób (60fps na mapach do 4000x4000px)
- Stan mapy (tokeny, FoW, siatka) przetrwa zamknięcie i ponowne otwarcie sesji
- Tokeny można przeciągnąć z Party Trackera/Bestiariusza na mapę
- VFX efekty działają z pełną konfiguracją (timing, rozmiar, czas trwania)

## Scope Boundaries
- **Poza scope:** Globalna biblioteka map (osobny moduł), edytor map (tile-based, R20-R22 z głównych requirements), snap-to-grid, cell brush FoW, pomiar odległości, linia wzroku (line of sight), multiplayer/sieciowe udostępnianie mapy
- **Poza scope:** Tworzenie własnych efektów VFX (tylko preset library)

## Key Decisions
- **Pixi.js jako renderer:** WebGL daje wydajność potrzebną do dużych map + natywne wsparcie dla layerów, filtrów i animacji sprite'owych
- **Freehand brush only (bez cell brush):** Upraszcza implementację, FoW niezależny od siatki
- **Brak snap-to-grid:** Siatka jest czysto wizualna, tokeny pozycjonowane swobodnie
- **Hybryda PNG+stroke dla FoW:** PNG blob zapewnia niezawodny zapis, stroke buffer daje undo w sesji
- **Toolbar z panelem ustawień:** Każde narzędzie ma dedykowany panel opcji w toolbarze (rozmiar, opacity, styl)

## Dependencies / Assumptions
- Globalna biblioteka map musi istnieć lub moduł musi mieć fallback (np. file picker) do załadowania obrazka
- Party Tracker i Bestiariusz muszą eksponować dane (avatar, nazwa, ID) potrzebne do tworzenia tokenów
- Combat Tracker musi udostępniać listę uczestników walki do R14
- Pixi.js `@pixi/react` lub manual mounting do integracji z React 19

## Outstanding Questions

### Resolve Before Planning
(all resolved)

### Deferred to Planning
- [Affects R1][Needs research] Jaka wersja Pixi.js (v7 vs v8) i czy `@pixi/react` jest stabilne z React 19?
- [Affects R20][Needs research] Jakie sprite sheety/formaty animacji użyć dla preset VFX? Sprite sheet, Lottie, particle system Pixi?
- [Affects R26][Technical] Optymalny format PNG blob — czy `renderer.extract` z Pixi.js daje wystarczającą kontrolę nad rozdzielczością maski?
- [Affects R11][Technical] Jak zaimplementować cross-component drag&drop (z panelu React do canvasa Pixi.js)?
- [Affects R14][Technical] Jaki interfejs IPC/event między Combat Trackerem a mapą do synchronizacji tokenów?

## Next Steps
→ `/ce:plan` for structured implementation planning
