---
date: 2026-05-15
topic: time-tracker
---

# Tracker Czasu

## Problem Frame

DM potrzebuje kontroli nad czasem w grze: pora dnia, data w custom kalendarzu, oraz mierzenie czasu sesji w realu. Brak tych narzędzi zmusza do ręcznego notowania i mentalnego śledzenia, co rozprasza podczas prowadzenia sesji.

## Requirements

Trzy osobne tool-window na canvasie: Zegar In-Game, Kalendarz, Timer Sesji.

### Ogólne

- R-gen1. Stan czasu in-game (godzina, data) jest niezależny od otwarcia okien — okna to widoki, stan żyje w modelu danych kampanii.
- R-gen2. Cofnięcie czasu in-game cofa również timery in-game (symetrycznie do przesuwania do przodu).

### Zegar In-Game (rozszerzenie R44)

- R44a. Duży łuk nieba 180° dominuje wizualnie w oknie. Słońce (dzień) lub księżyc (noc) płynnie przesuwa się po łuku odpowiednio do pory dnia. Gradient kolorów: pomarańczowy (dzień), fioletowy (noc), przejściowe kolory przy świcie/zmierzchu.
- R44b. Cyfrowy wyświetlacz godziny i minuty pod łukiem nieba.
- R44c. Stały zestaw przycisków przesuwania czasu: +1min, +10min, +1h, +4h, +1 dzień.
- R44d. Lustrzany zestaw przycisków cofania: -1min, -10min, -1h, -4h, -1 dzień.
- R44e. Możliwość definiowania własnych przycisków przesuwania czasu (custom wartość + etykieta). Konfiguracja przez modal ustawień (ikona zębatki w oknie).
- R44f. Przekroczenie północy automatycznie przesuwa datę w Kalendarzu (synchronizacja zegar <-> kalendarz).
- R44g. DM konfiguruje godziny świtu i zmierzchu (w pełni konfigurowalne, nie stałe). Wpływają na kolory łuku i pozycję słońca/księżyca. Konfiguracja w tym samym modalu ustawień.
- R44h. Cztery pory dnia wynikają z konfiguracji: Noc -> Świt -> Dzień -> Zmierzch -> Noc, granice wyznaczane przez ustawione godziny świtu/zmierzchu.

### Kalendarz (rozszerzenie R45)

- R45a. DM wybiera tryb kalendarza przy konfiguracji: Prosty lub Rozbudowany. Konfiguracja przez modal ustawień (ikona zębatki, spójne z zegarem).
- R45b. Tryb Prosty: konfigurowalne nazwy miesięcy, liczba miesięcy, liczba dni w każdym miesiącu, konfigurowalne nazwy dni tygodnia i długość tygodnia, lista świąt/wydarzeń z datą i nazwą.
- R45c. Tryb Rozbudowany: wszystko z Prostego + solstice/pory roku wpływające na długość dnia i nocy w Zegarze.
- R45d. Główny widok: siatka miesięczna z dniami tygodnia jako nagłówkami kolumn. Bieżący dzień wyróżniony. Święta oznaczone kolorową kropką z tooltipem (nazwa święta po najechaniu).
- R45e. Nawigacja między miesiącami (przód/tył) do przeglądania kalendarza.
- R45g. Domyślna opcja kalendarza "Real-world" z 12 miesiącami standardowymi i 7-dniowym tygodniem.

### Timer Sesji (rozszerzenie R46)

- R46a. Stoper sesji jest częścią listy timerów (nie wyróżniony osobną sekcją) — predefiniowany timer real-time odliczający w górę, start/stop/reset.
- R46b. Lista custom timerów: DM tworzy dowolną liczbę timerów z nazwą, czasem docelowym, i trybem (real-time lub in-game). Tworzenie przez formularz inline (przycisk "+").
- R46c. Każdy custom timer może odliczać w górę (stoper) lub w dół (countdown), do wyboru DM.
- R46d. Timery w trybie in-game tykają wyłącznie gdy DM przesuwa zegar in-game (przyciski z R44c-R44e), nie w real-time.
- R46e. Timery w trybie real-time tykają niezależnie od zegara in-game.
- R46f. Countdown timer po dotarciu do 0: zmienia kolor (czerwony), pulsuje/miga, opcjonalny dźwięk (tylko dla trybu real-time). Zostaje na liście aż DM go ręcznie usunie.
- R46g. DM może usunąć dowolny timer z listy (przycisk X lub swipe).

## Success Criteria

- DM może prowadzić sesję z pełną kontrolą nad czasem in-game bez wychodzenia z canvasu.
- Przesunięcie zegara past midnight automatycznie aktualizuje kalendarz — brak desyncu.
- Custom timery in-game poprawnie reagują na przesuwanie czasu (w tym cofanie).
- Konfiguracja custom kalendarza jest intuicyjna i persystentna per kampania.

## Scope Boundaries

- Pogoda (R41-R43) jest osobnym narzędziem — nie wchodzi w zakres.
- Brak automatycznego śledzenia historii sesji (archiwum przeszłych sesji) — tylko bieżący stoper.
- Brak integracji z combat trackerem (automatyczne odliczanie tur) — może być dodane później.
- Lunar tracking i solstice są częścią trybu Rozbudowanego — nie wymagane w MVP trybu Prostego.

## Key Decisions

- **Trzy osobne okna** zamiast jednego z tabami — spójne z architekturą canvasu, DM widzi co chce.
- **Łuk nieba** zamiast tarczy zegara — bardziej klimatyczny, unikalna wizualizacja.
- **Stały + custom przyciski czasu** — pokrywa typowe przypadki, a custom dodaje elastyczność bez kosztu utrzymania.
- **Pełny zestaw minusów** zamiast undo — bardziej precyzyjna kontrola cofania.
- **Tryb kalendarza do wyboru** (Prosty/Rozbudowany) — nie zmusza do konfiguracji solstice gdy DM tego nie potrzebuje.
- **Timery in-game tykają z zegarem** — jedyny sensowny model, bo czas in-game nie płynie sam.
- **Zegar i Kalendarz zsynchronizowane** — przejście przez północ automatycznie przesuwa datę.

## Dependencies / Assumptions

- Współdzielony stan czasu in-game między Zegarem a Kalendarzem — wymaga wspólnego modelu danych per kampania w SQLite.
- Custom timery in-game muszą nasłuchiwać na zmiany zegara in-game — wymaga mechanizmu propagacji (callback/event z zegara).

## Outstanding Questions

### Deferred to Planning

- [Affects R44a][Needs research] Jak renderować łuk nieba — Canvas 2D, SVG, czy czyste CSS/gradient?
- [Affects R45c][Technical] Model danych solstice: jak DM konfiguruje długość dnia/nocy per pora roku? Dwa punkty (solstice letni/zimowy) z interpolacją, czy per-miesiąc?

- [Affects R44f, R46d][Technical] Architektura współdzielonego stanu czasu — shared context, event bus, czy coś innego?
- [Affects R46b][Technical] Persystencja timerów — czy przeżywają zamknięcie aplikacji?

## Next Steps

-> `/ce:plan` for structured implementation planning
