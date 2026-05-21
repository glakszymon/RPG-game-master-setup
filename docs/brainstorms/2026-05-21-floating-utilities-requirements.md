---
date: 2026-05-21
topic: floating-utilities
---

# Floating Utilities

## Problem Frame

Podczas sesji RPG GM potrzebuje natychmiastowego dostępu do drobnych narzędzi (szybka notatka, nagrywanie audio) bez szukania ich na nieskończonym canvasie. Floating utilities to widgety pozycjonowane względem ekranu (nie canvasu) — zawsze widoczne, niezależne od panu/zoomu.

## Requirements

- R1. System floating utilities renderuje widgety w warstwie nad canvasem, w pozycji fixed (nie poruszają się z canvasem)
- R2. Każdy floating widget można swobodnie przeciągać w dowolne miejsce na ekranie
- R3. Floating widget można zminimalizować do małej ikony; kliknięcie ikony przywraca widget
- R4. **Sticky Note** — jeden scratchpad z polem tekstowym; treść jest ulotna (nie przetrwa zamknięcia aplikacji)
- R5. **Audio Recorder** — nagrywanie mikrofonu w modelu segmentów: każde wciśnięcie "record" tworzy osobny plik audio w folderze kampanii
- R6. Audio Recorder wyświetla aktualny czas nagrywania i stan (recording/idle)
- R7. Pozycja widgetów na ekranie persystuje między sesjami (w SQLite, jak reszta stanu)

## Scope Boundaries

- Timer NIE migruje do floating utilities — zostaje jako okienko canvasowe
- Sticky Note to NIE jest Notatnik (notebook/block editor) — celowo tymczasowy, bez zapisu
- Floating utilities nie mają systemu zakładek ani dockingu — to proste samodzielne widgety
- Brak limitów ilości jednoczesnych floating widgets (w praktyce: 1 sticky + 1 recorder)

## Success Criteria

- GM może nagrać segment sesji jednym kliknięciem i plik ląduje w folderze kampanii
- Szybka notatka jest dostępna natychmiast bez otwierania nowego narzędzia na canvasie
- Widgety nie przeszkadzają w pracy z canvasem (małe, przeciągalne, minimalizowalne)

## Key Decisions

- Swobodne przeciąganie (nie snap-to-corner): daje pełną kontrolę nad layoutem
- Ulotny sticky note: celowa prostota, odróżnienie od pełnego Notatnika
- Segmenty audio (nie jeden ciągły plik): łatwiejsze zarządzanie nagraniami po sesji
- Zapis audio do folderu kampanii: nagrania powiązane z kontekstem sesji

## Outstanding Questions

### Deferred to Planning

- [Affects R5][Technical] Jaki format audio (webm/opus, wav, mp3)? Zależy od możliwości MediaRecorder API w Electronie
- [Affects R2][Technical] Jak persystować pozycję widgetów — osobna tabela vs rozszerzenie canvas state?
- [Affects R3][Technical] Gdzie renderować zminimalizowane ikony — stały dock, czy ikona zostaje w miejscu widgetu?

## Next Steps

→ `/ce:plan` for structured implementation planning
