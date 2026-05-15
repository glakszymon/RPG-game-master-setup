---
date: 2026-05-15
topic: map-canvas2d-rewrite
---

# Przepisanie modulu mapy z Pixi.js na Canvas 2D

## Problem Frame
Obecna implementacja mapy oparta na Pixi.js (WebGL) ma liczne bugi renderowania: tokeny nie wyswietlaja sie poprawnie, FoW (maskowanie/malowanie) dziala niestabilnie, efekty VFX sa zbuggowane, a canvas czasem nie startuje lub crashuje. Zamiast naprawiania kolejnych problemow Pixi.js, modul zostanie przepisany od zera z uzyciem natywnego HTML Canvas 2D API, ktore daje pelna kontrole, prostote i stabilnosc.

## Requirements

### Rendering i warstwy
- R1. Mapa renderowana przez natywny HTML Canvas 2D API (bez zewnetrznych bibliotek renderowania)
- R2. Warstwy rysowane imperartywnie w stalej kolejnosci: obraz tla -> siatka -> tokeny -> Fog of War -> UI overlay
- R3. Przerysowanie canvasa wyzwalane przez zmiane stanu React (useEffect/useCallback pattern)

### Ladowanie obrazu mapy
- R4. Obraz mapy ladowany przez Electron file picker (IPC readImage), wyswietlany jako Image na canvas
- R5. Fallback: systemowy file picker (Electron dialog) dopoki biblioteka map nie istnieje

### Zoom i Pan
- R6. Zoom: scroll = zoom (zakres 0.05x-5x), przyciski +/-, suwak, przycisk dopasowania do okna
- R7. Pan: przeciaganie srodkowym przyciskiem myszy z pointer capture
- R8. Zoom i pan realizowane przez ctx.translate() + ctx.scale(), dzialaja wewnatrz okienka mapy

### Siatka (Grid Overlay)
- R9. Konfigurowalny typ siatki: kwadratowa, heksagonalna, brak
- R10. Konfigurowalny rozmiar komorki (16-512) i przezroczystosc (0.05-1.0)
- R11. Siatka jest czysto wizualna — nie wplywa na pozycjonowanie tokenow

### Fog of War
- R12. FoW jako osobny offscreen canvas, compositing przez globalCompositeOperation
- R13. Dwa narzedzia: "Reveal" (odslanianie) i "Conceal" (zakrywanie) z regulowanym rozmiarem pedzla
- R14. Malowanie freehand z interpolacja liniowa miedzy punktami (gladkie kreski)
- R15. Bulk actions: "Odslon cala mape" i "Zakryj cala mape"
- R16. Zapis maski FoW jako PNG data URL (debounced 500ms) do persystencji
- R17. Przywracanie zapisanej maski FoW z PNG data URL przy ponownym montowaniu

### Tokeny
- R18. Tokeny dodawane przez drag&drop z Party Trackera i Bestiariusza (protokol MapDropPayload bez zmian)
- R19. Wyglad tokena: okragly avatar (obrazek), fallback na kolorowe kolo z inicjalami, nazwa pod tokenem
- R20. Swobodne przesuwanie tokenow po mapie (reczny hit testing + drag tracking)
- R21. Manualne dodawanie tokenow (przycisk "Add Token")
- R22. Lista tokenow z przyciskiem usuwania
- R23. Synchronizacja nazwy/avatara miedzy tokenami tego samego zrodla

### VFX (efekty wizualne)
- R24. 7 presetow czasteczek: fire, explosion, smoke, lightning, glow, fog, ice
- R25. Klikniecie na mape umieszcza efekt w wybranym punkcie
- R26. Animacja czasteczek przez requestAnimationFrame (12-20 czasteczek per instancja)
- R27. Tryb persistent (zostaje az GM usunie) lub one-shot (gra i znika)
- R28. Konfigurowalny rozmiar i czas trwania per efekt
- R29. Przycisk "Clear All VFX"

### Toolbar
- R30. Lewy panel z ikonami narzedzi i kontekstowym panelem opcji ponizej
- R31. Narzedzia: navigate, fow-reveal, fow-conceal, load-map, tokens, vfx
- R32. Aktywne narzedzie blokuje domyslne zachowanie canvasa (np. tryb pedzla: drag = malowanie)
- R33. Toolbar wyswietla panel ustawien aktywnego narzedzia

### Persystencja stanu
- R34. Stan mapy zapisywany w WindowState.toolState systemu canvas (autosave debounced 500ms)
- R35. Zapisywane dane: sciezka do obrazka, konfiguracja siatki, pozycje tokenow, maska FoW, instancje VFX, viewport, ustawienia narzedzi
- R36. Pelny stan przywracany przy ponownym otwarciu okna mapy

### Integracja z Canvas System
- R37. Modul mapy integruje sie z InfiniteCanvas (ToolContent switch) i CanvasWindow (FULL_BLEED_TOOLS)
- R38. Zachowanie istniejacych rozmiarow okna (min 400x400, default 600x500) i koloru na minimapie

## Success Criteria
- Wszystkie 10 funkcjonalnosci obecnej implementacji dzialaja bez bugow renderowania
- FoW malowanie jest plynne i stabilne — brak artefaktow, poprawne reveal/conceal
- Tokeny renderuja sie poprawnie, drag&drop dziala, avatary laduja sie bez bledow
- VFX czasteczki animuja sie plynnie, preset'y dzialaja zgodnie z konfiguracja
- Canvas startuje niezawodnie — zero bialych ekranow i crashy
- Plynne dzialanie (60fps) na mapach do 4000x4000px
- Stan przetrwa zamkniecie i ponowne otwarcie sesji
- Zero zewnetrznych zaleznosci renderowania (bez Pixi.js, Konva, itp.)

## Scope Boundaries
- **Poza scope:** Nowe funkcjonalnosci wykraczajace poza obecna implementacje (snap-to-grid, pomiar odleglosci, line of sight, multiplayer)
- **Poza scope:** Globalna biblioteka map, edytor map
- **Poza scope:** Tworzenie wlasnych efektow VFX (tylko preset library)
- **W scope:** Pelne odtworzenie wszystkich 10 istniejacych funkcjonalnosci na Canvas 2D

## Migration Strategy
- Big bang: usuniecie starych plikow Pixi.js i napisanie nowych od zera w tym samym katalogu (`src/ui/tools/map-display/`)
- Stary modul nie dziala w trakcie przepisania — akceptowalne
- Zachowanie istniejacych interfejsow (MapDisplayState, MapDropPayload, MapToken) zapewnia kompatybilnosc z reszta systemu
- Usuwane zaleznosci: `pixi.js`, `@pixi/react` (jesli istnieje)

## Key Decisions
- **Canvas 2D zamiast Pixi.js (WebGL):** Eliminuje cala warstwe abstrakcji powodujaca bugi. Pelna kontrola nad renderowaniem, zero zewnetrznych zaleznosci, latwiejsze debugowanie
- **Offscreen canvas dla FoW:** Naturalny pattern Canvas 2D — globalCompositeOperation do reveal/conceal, prosty export do PNG
- **Reczny hit testing dla tokenow:** ~60 linii kodu zamiast calej biblioteki, pelna kontrola nad zachowaniem drag&drop
- **requestAnimationFrame dla VFX:** Standardowy pattern animacji, bez zaleznosci od ticker'a biblioteki
- **Zachowanie istniejacego stanu i interfejsow:** MapDisplayState, MapDropPayload, MapToken — bez zmian, minimalizacja wplywu na reszte systemu

## Dependencies / Assumptions
- Electron IPC do odczytu plikow obrazow (readImage) — bez zmian
- Party Tracker i Bestiariusz eksponuja dane przez MapDropPayload — bez zmian
- Canvas System (InfiniteCanvas, CanvasWindow) — integracja bez zmian
- useCanvasPersistence hook — bez zmian
- Canvas 2D API wystarcza wydajnosciowo dla map do 4000x4000px (potwierdzone — Canvas 2D radzi sobie z obrazami tej wielkosci)

## Outstanding Questions

### Resolve Before Planning
(all resolved)

### Deferred to Planning
- [Affects R2][Technical] Jak zorganizowac warstwy rysowania — jeden canvas z wieloma renderami vs wiele nakladajacych sie canvasow (stacked canvases)?
- [Affects R12][Technical] Czy offscreen canvas dla FoW powinien byc w pelnej rozdzielczosci mapy czy skalowany?
- [Affects R26][Needs research] Czy requestAnimationFrame z Canvas 2D da plynne 60fps dla 7+ jednoczesnych instancji VFX po 20 czasteczek?
- [Affects R20][Technical] Optymalna strategia hit testing dla tokenow — iteracja po tablicy vs spatial index?

## Next Steps
-> `/ce:plan` for structured implementation planning
