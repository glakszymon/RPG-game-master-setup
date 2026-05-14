---
date: 2026-05-13
topic: game-master-panel
---

# Game Master Panel - Aplikacja do prowadzenia gier RPG

## Problem Frame

Dungeon Masterzy potrzebuja jednego narzedzia do zarzadzania sesjami RPG: sledzenia postaci, map, walki, czasu, pogody i dzwieku. Istniejace rozwiazania (np. MITHOS) sa platne, zamkniete i nie oferuja pelnej kontroli nad udostepnianiem widoku graczom w sieci lokalnej. Game Master Panel to darmowa, open-source, system-agnostic aplikacja desktopowa (Electron + React) z killer feature: konfigurowalne udostepnianie widoku graczom przez LAN.

## Kluczowe decyzje

- **Platforma:** Electron + React, build na Linux (glowny) i Windows
- **Baza danych:** SQLite wbudowana w aplikacje
- **System RPG:** System-agnostic - DM definiuje wlasne pola i statystyki
- **Nazwa:** Game Master Panel
- **Glowny wyroznik:** Udostepnianie widoku graczom w LAN z pelna kontrola DM
- **Styl UI:** Dark mode only, nowoczesny minimalistyczny z subtelnymi akcentami fantasy
- **Nawigacja:** Menu wejsciowe jako hub - wejscie do kampanii (plotno) lub kreatora map (osobne widoki bez polaczenia)
- **Otwieranie narzedzi:** Right-click context menu na plotnie
- **Mapy:** Globalna biblioteka map wspoldzielona miedzy kampaniami
- **Zapis:** Autozapis ciagle
- **Undo/Redo:** Globalny Ctrl+Z/Ctrl+Y
- **Skroty klawiszowe:** Pelny zestaw skrotow do nawigacji i akcji
- **Animacje:** Polished - plynne przejscia, animacje okien, hover efekty
- **Jezyk:** Angielski

## Wymagania

### Architektura i platforma

- R1. Aplikacja desktopowa w Electron + React, zoptymalizowana wydajnosciowo
- R2. Build na Linux i Windows
- R3. Dane kampanii przechowywane w SQLite lokalnie
- R4. Podzial na kampanie - kazda kampania ma wlasne dane, layouty, postacie, mapy

### Nieskonczone plotno (Canvas)

- R5. Nieskonczone plotno jako glowny workspace - okienka ustawiane swobodnie bez ustalonego layoutu
- R6. Okienka sa przesuwalne, resizowalne, minimalizowalne, zamykalne (klasyczny title bar: nazwa + ikona + minimize/close)
- R7. Zoom in/out i panowanie po plotnie (scroll, drag)
- R8. Jeden layout per kampania, zapisywany automatycznie (autozapis)
- R9. Tlo canvasa konfigurowalne (ciemne czyste, siatka kropek, siatka linii)
- R63. Wiele instancji tego samego narzedzia (np. 2x notatnik obok siebie)
- R64. Z-order: click-to-front + opcja pin (always on top) per okienko
- R65. Pelna swoboda pozycjonowania - brak snap-to-grid, brak guidelines
- R66. Minimapa w rogu ekranu pokazujaca polozenie wszystkich okienek na plotnie
- R67. Brak maximize/fullscreen okienek - tylko reczny resize

### Menu wejsciowe (Hub)

- R10. Ekran startowy jako hub: lista kampanii do zaladowania LUB wejscie do kreatora map
- R11. Kreator kampanii: prosty formularz (nazwa, system, ikona) - minimum na start, konfiguracja wewnatrz kampanii
- R68. Plotno sesji i kreator map to calkowicie osobne widoki - brak bezposredniego przelaczania, powrot do hub
- R69. Context menu na plotnie: flat lista wszystkich narzedzi (bez grupowania w kategorie)

### Party Tracker (Panel Sledzenia Druzyny)

- R12. Karty postaci ustawione obok siebie w rzedzie
- R13. Kazda karta: nazwa postaci + zdjecie (wycentrowane na gorze), ponizej 3 stale pola (HP, Armor, Initiative), ponizej customowe pola ulozone przez usera
- R14. Przycisk ustawien w prawym gornym rogu z opcja "Edytuj karte postaci"
- R15. Edytor karty postaci: dwie kolumny - lewa: podglad na zywo, prawa: opcje edycji
- R16. Dostepne typy pol do dodania: Number, Bubbles (kolka do zaznaczania), Text Field, Text Box, Radio
- R17. Pola mozna przesuwac drag&drop aby zmienic kolejnosc
- R18. Kazde pole ma opcje: naglowek, szerokosc panelu, pozycja (lewa/srodek/prawa)
- R19. Przyciski Cancel i Save w edytorze

### Kreator Map

- R20. Oddzielna zakladka aplikacji do tworzenia map
- R21. Dwa tryby: edytor kafelkowy (tile-based z tilesetow) ORAZ import gotowego obrazka
- R22. Nakladanie siatki na mape (kwadratowa, heksagonalna, brak)

### Mapa Rozgrywki (wyswietlacz sesyjny)

- R23. Wyswietlanie mapy z Fog of War
- R24. FoW: pedzel z regulowana przezroczystoscia (100% = pelne odsloniecie, 50% = mgla, 0% = pelne zakrycie)
- R25. Swobodne rozstawianie tokenow graczy i potworow na mapie (drag&drop)
- R26. Integracja z Combat Trackerem - ladowanie uczestnikow walki jako tokeny

### Combat Tracker (Sledzenie Walki)

- R27. Kolejka inicjatywy z oznaczeniem aktywnego uczestnika
- R28. Sledzenie HP z edycja (damage/heal popup)
- R29. Warunki/statusy na uczestnikach (stunned, poisoned, itp.) - konfigurowalne
- R30. Dodawanie uczestnikow z: Party Tracker, Bestiariusz, reczne
- R31. Drag&drop sortowanie kolejnosci lub automatyczny rzut inicjatywy

### Bestiariusz (Biblioteka Potworow)

- R32. Pusta biblioteka - DM dodaje potwory recznie lub importuje z JSON
- R33. Wyszukiwanie, filtrowanie, organizacja w foldery i tagi
- R34. Przeciaganie potworow na mape lub do Combat Trackera

### Notatnik

- R35. Block editor w stylu Notion (tekst, naglowki, listy, tabele, checkboxy, drag&drop blokow)
- R36. Organizacja w foldery, wyszukiwanie
- R37. Autozapis

### Soundboard (Panel Dzwieku)

- R38. Import wlasnych plikow audio (MP3, WAV, OGG)
- R39. Wbudowana biblioteka darmowych sampli ambient CC0 (deszcz, las, loch, bitwa, ogien, wiatr, rzeka, tawerna)
- R40. Wiele sciezek grajacych jednoczesnie z osobnymi suwakami glosnosci
- R41. Master volume, loop, play/pause per track

### Generator Pogody

- R42. DM wpisuje parametry (temperatura, zachmurzenie, wiatr, wilgotnosc)
- R43. System analizuje parametry i sugeruje opis klimatu/biome (np. "przypomina klimat subtropikalny z monsunami")

### Tracker Czasu

- R44. Zegar in-game: godzina, dzien, pora dnia z wizualizacja dnia/nocy
- R45. Custom kalendarz (nazwy miesiecy, dlugosci, swieta)
- R46. Timer sesji real-time

### Generator Sklepow

- R47. Generator losowych sklepow z parametrami: typ sklepu, cena, ekonomia miasta, asortyment
- R48. Lista przedmiotow z nazwa, cena, opis, kategoria

### Udostepnianie LAN (Killer Feature)

- R49. Aplikacja stawia lokalny serwer HTTP - gracze lacza sie przegladarka z innego urzadzenia w tej samej sieci
- R50. DM ma dedykowane okno "Widok Gracza" w ktorym ustawia co dokladnie widza gracze
- R51. DM konfiguruje per-sesje: ktore elementy sa widoczne (mapa, inicjatywa, statystyki), ktore interaktywne (przesuwanie tokenu, edycja pol)
- R52. Aktualizacja w czasie rzeczywistym (WebSocket)

### UI/UX i nawigacja

- R54. Dark mode only - nowoczesny minimalistyczny styl z subtelnymi akcentami fantasy
- R55. Menu wejsciowe jako hub: wybor kampanii LUB kreator map (osobne widoki, brak bezposredniego przelaczania)
- R56. Otwieranie okienek na plotnie przez right-click context menu z lista narzedzi pogrupowanych kategorii
- R57. Globalna biblioteka map - mapy z kreatora dostepne we wszystkich kampaniach
- R58. Autozapis ciagle - kazda zmiana zapisuje sie automatycznie
- R59. Globalny undo/redo (Ctrl+Z / Ctrl+Y)
- R60. Pelny zestaw skrotow klawiszowych (zoom, nawigacja, akcje sesyjne)
- R61. Polished animacje - plynne przejscia okien, hover efekty, micro-interakcje
- R62. Interfejs w jezyku angielskim

### Dice Roller (niski priorytet)

- R53. Opcjonalny wbudowany rzut koscmi (d4, d6, d8, d10, d12, d20, d100) - niski priorytet, moze byc dodany pozniej

## Scope Boundaries (Co NIE jest w zakresie)

- Brak integracji z chmura / synchronizacji online
- Brak wbudowanej bazy potworow (SRD) - tylko import
- Brak integracji z OneNote/Obsidian
- Brak generatora NPC z losowymi imionami (moze pozniej)
- Brak roll tables (moze pozniej)
- Brak biblioteki PDF
- Aplikacja nie jest przeznaczona do gry online (tylko LAN)

## Success Criteria

- DM moze przeprowadzic pelna sesje RPG uzywajac tylko Game Master Panel
- Gracze przy stole widza mape z FoW na swoich urzadzeniach przez przegladarke
- Aplikacja dziala plynnie z wieloma otwartymi okienkami na plotnie
- Dane kampanii sa trwale zapisane i laduja sie poprawnie po restarcie
- Buduje sie i dziala na Linux i Windows

## Fazy implementacji

### Faza 1 - MVP (Core Gameplay Loop)
- Plotno z systemem okienek (R5-R9)
- Menu wejsciowe + kampanie (R10-R11)
- Party Tracker z edytorem kart (R12-R19)
- Mapa rozgrywki z FoW i tokenami (R23-R26)
- Combat Tracker (R27-R31)
- Udostepnianie LAN - mapa + inicjatywa (R49-R52)

### Faza 2 - Rozszerzenie
- Kreator map tile-based (R20-R22)
- Bestiariusz z importem JSON (R32-R34)
- Notatnik block editor (R35-R37)
- Soundboard (R38-R41)

### Faza 3 - Swiata
- Generator pogody (R42-R43)
- Tracker czasu + kalendarz (R44-R46)
- Generator sklepow (R47-R48)
- Dice roller (R53)

## Outstanding Questions

### Resolve Before Planning
(Wszystkie pytania rozwiazane)

### Deferred to Planning
- [Affects R21][Deferred] Tilesety do kreatora map - decyzja odlozona do fazy implementacji kreatora
- [Affects R49-R52][Needs research] Wybor technologii WebSocket vs Server-Sent Events dla LAN sharing
- [Affects R5-R9][Needs research] Biblioteka do infinite canvas (react-flow, pixi.js, custom canvas?)
- [Affects R35][Needs research] Biblioteka do block editora (tiptap, blocknote, custom?)
- [Affects R3][Technical] Struktura bazy SQLite - schemat tabel
- [Affects R21][Needs research] Podejscie do tile-based map editora - gotowa biblioteka vs custom
- [Affects R38-R41][Technical] Web Audio API vs biblioteka do miksowania audio

## Next Steps

-> `/ce:plan` for structured implementation planning (no blocking questions remain)
