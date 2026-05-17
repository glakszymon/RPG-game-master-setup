---
date: 2026-05-17
topic: soundboard
---

# Soundboard (Panel Dzwieku)

## Problem Frame

DM potrzebuje narzedzia do tworzenia immersyjnej atmosfery dzwiekowej podczas sesji RPG. Obecnie brak jakiegokolwiek wsparcia audio w aplikacji. Soundboard powinien umozliwiac layering wielu sciezek ambient + okazjonalne efekty dzwiekowe, z mozliwoscia zapisywania presetow scen i plynnego przechodzenia miedzy nimi.

## Requirements

Bazuje na R38-R41 z glownego dokumentu wymagan, rozszerzone o ustalenia z brainstormu.

### Import i formaty

- R1. Import wlasnych plikow audio przez dialog systemowy (MP3, WAV, OGG)
- R2. Wbudowana biblioteka sampli CC0 bundlowana z aplikacja: deszcz, las, loch, bitwa, ogien, wiatr, rzeka, tawerna. Prezentowana jako grid z ikonami i filtrem po kategorii.
- R3. Zaimportowane pliki kopiowane do folderu kampanii na dysku; sciezki przechowywane w SQLite
- R4. Uzytkownik moze tagowac zaimportowane tracki (np. "combat", "ambient", "horror") do organizacji i filtrowania

### Odtwarzanie

- R5. Play/pause per track
- R6. Loop per track (domyslnie wlaczony)
- R7. Volume slider per track
- R8. Master volume skalujacy wszystkie tracki proporcjonalnie
- R9. Maksymalnie 8-12 trackow jednoczesnie (konfigurowalny limit)
- R10. Stacking — wiele instancji tego samego dzwieku grajacych jednoczesnie (dla SFX), max 6-8 instancji per track
- R11. Dedykowany przycisk "Fire" per track do triggerowania kolejnych instancji stackingu
- R12. Jitter — slider "intensity" (0-100%) kontrolujacy zakres losowej modulacji pitch i timing przy stackingu

### Presety scen

- R13. Zapisywanie aktualnej kombinacji trackow + ustawien glosnosci jako preset (nazwa nadawana przez usera)
- R14. Presety per-kampania (kazda kampania ma swoje)
- R15. Crossfade przy przelaczaniu miedzy presetami (plynne fade out starych, fade in nowych)
- R16. Lista zapisanych presetow z mozliwoscia szybkiego przelaczania
- R17. Edycja presetow: overwrite (zapisz ponownie pod ta sama nazwa) lub usun i stworz nowy. Brak edycji in-place.

### UI

- R18. Lista trackow z kontrolkami: play/pause, volume slider, loop toggle, nazwa, tagi
- R19. Mozliwosc zmiany nazwy, reorder (drag & drop), usuwania trackow
- R20. Waveform visualization (canvas) dla master output (suma wszystkich trackow)
- R21. Przycisk dodawania tracku (+ / Add Track) z opcja importu lub wyboru z biblioteki CC0
- R22. Sekcja master volume widoczna zawsze

### Tryby pracy

- R23. Dwa oddzielne layouty przelaczane w ustawieniach:
  - **Tryb prosty**: lista z play/volume/loop — bez stacking, jitter, crossfade controls
  - **Tryb miksera**: pelna kontrola — stacking, jitter, fire button, nazwy kanalow, grupowanie

## Success Criteria

- DM moze w < 5 sekund uruchomic ambient scene z presetu
- Wiele trackow gra jednoczesnie bez slyszalnych artefaktow
- Crossfade miedzy presetami jest plynny (brak ciszy miedzy scenami)
- Waveform wizualizacja reaguje w czasie rzeczywistym
- Stacking SFX (np. kilka eksplozji) brzmi naturalnie dzieki jitter

## Scope Boundaries

- Brak streamingu audio z sieci (tylko lokalne pliki)
- Brak edycji audio (trimming, normalizacja) — to nie DAW
- Brak synchronizacji audio miedzy urzadzeniami (single-device)
- Brak nagrywania audio
- Pogoda (R42-R43) to osobne narzedzie
- Presety nie sa wspoldzielone miedzy kampaniami

## Key Decisions

- **Web Audio API**: Wymagane dla stacking, jitter, crossfade, i waveform visualization. HTML5 Audio nie wystarczy.
- **Bundlowane sample**: Wbudowane w app dla offline access, kosztem wiekszego rozmiaru
- **Pliki na dysku**: Import kopiuje do folderu kampanii, nie do SQLite blob (unika rozdmuchania bazy)
- **Crossfade**: Plynne przejscia miedzy presetami zamiast hard-cut
- **Stacking + Jitter**: Od pierwszej wersji z dedykowanym przyciskiem Fire i sliderem intensity
- **Dwa layouty**: Tryb prosty i mikser jako oddzielne widoki, nie ukrywane kontrolki
- **Presety per-kampania**: Nie globalne, kazda kampania ma wlasne zestawy
- **Overwrite preset**: Brak edycji in-place, tylko nadpisanie lub delete+create
- **Waveform master only**: Jedna wizualizacja dla sumy outputu, nie per-track
- **Tagi na trackach**: Uzytkownik moze tagowac importy dla organizacji

## Dependencies / Assumptions

- Web Audio API dostepne w Electron (Chromium) — potwierdzone
- Sample CC0 musza byc znalezione/nagrane przed release (8 plikow)
- Folder kampanii musi istniec na dysku (tworzony przy tworzeniu kampanii)

## Outstanding Questions

### Deferred to Planning

- [Affects R15][Technical] Jaki czas trwania crossfade? (1-2s sugerowane, moze konfigurowalne)
- [Affects R20][Technical] Czy waveform to AnalyserNode frequency data czy time-domain?
- [Affects R2][Needs research] Zrodla sampli CC0 — freesound.org? Wlasne nagrania?
- [Affects R3][Technical] Struktura folderow kampanii na dysku dla plikow audio
- [Affects R23][Technical] Jakie dokladnie kontrolki ukryc w trybie prostym vs pokazac w mikserze

## Next Steps

-> `/ce:plan` for structured implementation planning
