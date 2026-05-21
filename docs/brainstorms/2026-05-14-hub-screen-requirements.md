---
date: 2026-05-21
topic: hub-screen
---

# Hub Screen (Ekran Startowy)

## Problem Frame

DM uruchamiający aplikację potrzebuje szybkiego dostępu do kampanii i kreatora map. Hub musi być przejrzysty, wizualnie atrakcyjny i dawać natychmiastowy przegląd stanu kampanii. Nowi użytkownicy powinni zobaczyć demo kampanię oraz guided onboarding przy tworzeniu kampanii, żeby zrozumieć możliwości aplikacji.

## Requirements

- R1. Full-screen grid kart kampanii jako główny layout Huba
- R2. Header z tytułem aplikacji i przyciskiem wejścia do Kreatora Map
- R3. Każda karta kampanii wyświetla: nazwę, system RPG, ikonę, datę ostatniej sesji, status (aktywna/archiwalna)
- R4. Karta "+" (New Campaign) w gridzie otwiera Campaign Wizard
- R5. Campaign Wizard krok 1 (wymagany): nazwa kampanii, system RPG, ikona (predefiniowane ikony fantasy + upload własnego obrazka)
- R6. Campaign Wizard krok 2 (przeskakiwalny): dodanie członków drużyny — guided onboarding pokazujący możliwości party trackera
- R7. Grid sortowany po dacie ostatniej sesji (najnowsze pierwsze)
- R8. Three dots menu na każdej karcie: usuń, archiwizuj, quick edit (nazwa/ikona)
- R9. Demo Campaign: predefiniowana kampania z przykładowymi danymi, stała karta z labelką "Demo", usuwalna manualnie przez użytkownika
- R10. Animacja przejścia Hub → Canvas: zoom-in na klikniętą kartę, karta rozszerza się do pełnego canvasa
- R11. Animacja przejścia Hub → Kreator Map: slide lub fade (wizualnie odróżniona od wejścia w kampanię)
- R12. Powrót z canvasa i kreatora map zawsze prowadzi do Huba (brak bezpośredniego przełączania między nimi)

## Powiązania z głównym dokumentem wymagań

- Rozszerza: R10, R11, R54, R55, R68 z `2026-05-13-game-master-panel-requirements.md`

## Success Criteria

- Nowy użytkownik widzi Demo Campaign i rozumie możliwości aplikacji bez dokumentacji
- DM z wieloma kampaniami szybko znajduje właściwą (sortowanie + status)
- Przejście Hub → Canvas jest płynne i wizualnie satysfakcjonujące (<300ms perceived)
- Tworzenie kampanii z minimalnym krokiem zajmuje <15 sekund
- Wizard krok 2 (drużyna) komunikuje że jest opcjonalny i przeskakiwalny

## Scope Boundaries

- Brak wyszukiwarki kampanii (grid wystarczy przy typowej liczbie kampanii)
- Brak tagów/folderów
- Brak eksportu/importu kampanii
- Wizard nie obejmuje konfiguracji walki — to się robi na canvasie
- Wizard nie definiuje pól postaci — używa domyślnych pól systemu

## Key Decisions

- **Guided onboarding wizard:** Krok 1 tworzy kampanię, krok 2 jest opcjonalny i pokazuje co można zrobić z party trackerem. Niski próg wejścia + demonstracja możliwości.
- **Zoom-in jako animacja wejścia:** Karta staje się canvasem — naturalna metafora "wchodzenia" w kampanię.
- **Inna animacja dla Kreatora Map:** Slide/fade odróżnia narzędzie od kampanii.
- **Kreator Map w headerze:** Wizualne oddzielenie od kampanii podkreśla osobne narzędzie (R68).
- **Demo Campaign stała z labelką:** Nie znika automatycznie, użytkownik decyduje kiedy usunąć.

## Outstanding Questions

### Resolve Before Planning

(Brak)

### Deferred to Planning

- [Affects R5][Needs research] Jakie predefiniowane ikony fantasy dołączyć (zestaw, licencja, format)
- [Affects R9][Technical] Zawartość Demo Campaign — jakie przykładowe postacie, mapa, notatki
- [Affects R10][Needs research] Implementacja animacji zoom-in (CSS transitions vs Framer Motion vs FLIP)
- [Affects R1][Technical] Responsywność grida — ile kolumn przy różnych rozdzielczościach okna
- [Affects R6][Technical] Jakie domyślne pola postaci oferować w kroku 2 wizarda

## Next Steps

→ `/ce:plan` for structured implementation planning
