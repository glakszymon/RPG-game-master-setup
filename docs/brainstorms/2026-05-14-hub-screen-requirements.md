---
date: 2026-05-14
topic: hub-screen
---

# Hub Screen (Ekran Startowy)

## Problem Frame

DM uruchamiający aplikację potrzebuje szybkiego dostępu do swoich kampanii i kreatora map. Hub musi być przejrzysty, wizualnie atrakcyjny i dać natychmiastowy przegląd stanu kampanii. Nowi użytkownicy powinni zobaczyć gotową demo kampanię, żeby zrozumieć możliwości aplikacji bez konfiguracji.

## Requirements

- R1. Full-screen grid kart kampanii jako główny layout Huba
- R2. Header z tytułem i przyciskiem wejścia do Kreatora Map
- R3. Każda karta kampanii wyświetla: nazwę, system RPG, ikonę, datę ostatniej sesji, status (aktywna/archiwalna)
- R4. Karta "+" (New Campaign) w gridzie otwiera kreator kampanii
- R5. Kreator kampanii: minimalny formularz - nazwa, system RPG, ikona (predefiniowane ikony fantasy + upload własnego obrazka)
- R6. Grid sortowany po dacie ostatniej sesji (najnowsze pierwsze)
- R7. Three dots menu na każdej karcie z akcjami: usuń, archiwizuj, quick edit (nazwa/ikona bez wchodzenia w kampanię)
- R8. Demo Campaign: predefiniowana kampania z przykładowymi postaciami, mapą i notatkami, pojawia się przy pierwszym uruchomieniu, usuwalna przez użytkownika
- R9. Animacja przejścia Hub → Canvas: zoom-in na klikniętą kartę, która rozszerza się do pełnego canvasa
- R10. Animacja przejścia Hub → Kreator Map: inna niż zoom-in (slide/fade), żeby wizualnie odróżnić od wchodzenia w kampanię
- R11. Powrót z canvasa/kreatora map zawsze prowadzi do Huba (R68 z głównego doc)

## Powiązania z głównym dokumentem wymagań

- Rozszerza: R10, R11, R54, R55, R68
- Styl wizualny: dark mode, minimalistyczny z akcentami fantasy (R54)

## Success Criteria

- Nowy użytkownik widzi Demo Campaign i rozumie co aplikacja oferuje bez czytania dokumentacji
- DM z wieloma kampaniami szybko znajduje i otwiera właściwą (sortowanie + status)
- Przejście Hub → Canvas jest płynne i wizualnie satysfakcjonujące
- Tworzenie nowej kampanii zajmuje <30 sekund

## Scope Boundaries

- Brak wyszukiwarki kampanii (przy małej liczbie kampanii grid wystarczy)
- Brak tagów/folderów na kampanie
- Brak eksportu/importu kampanii
- Wizard nie obejmuje konfiguracji postaci ani walki - to się robi na canvasie

## Key Decisions

- **Minimalny wizard:** Tylko nazwa+system+ikona przy tworzeniu, reszta konfigurowana w kampanii. Zmniejsza próg wejścia.
- **Demo Campaign przy pierwszym uruchomieniu:** Pokazuje pełne możliwości bez wysiłku użytkownika. Usuwalna żeby nie zaśmiecać.
- **Zoom-in jako animacja:** Karta kampanii staje się canvasem - naturalna metafora "wchodzenia" w kampanię.
- **Kreator map w headerze, nie w gridzie:** Wizualne oddzielenie od kampanii podkreśla że to osobne narzędzie (R68).

## Outstanding Questions

### Resolve Before Planning
(Brak)

### Deferred to Planning
- [Affects R5][Needs research] Jakie predefiniowane ikony fantasy dołączyć (zestaw, licencja, format)
- [Affects R8][Technical] Zawartość Demo Campaign - jakie przykładowe postacie, mapa, notatki
- [Affects R9][Needs research] Implementacja animacji zoom-in (CSS transitions vs Framer Motion vs FLIP)
- [Affects R1][Technical] Responsywność grida - ile kolumn przy różnych rozdzielczościach okna

## Next Steps

→ `/ce:plan` for structured implementation planning
