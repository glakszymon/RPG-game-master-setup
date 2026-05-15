---
date: 2026-05-15
topic: map-vfx-sprite-effects
---

# Sprite-based Map VFX Effects

## Problem Frame
Efekty wizualne na mapie (ogień, eksplozja, dym, błyskawica, poświata, mgła, lód) są renderowane jako wypełnione kółka (`ctx.arc()`), co wygląda prymitywnie. Gracze i GM potrzebują zjawiskowych, pełnoprawnych efektów wizualnych, które budują immersję w sesji RPG.

## Requirements
- R1. Każdy z 7 presetów VFX (fire, explosion, smoke, lightning, glow, fog, ice) powinien być renderowany jako animacja sprite sheet zamiast kółek
- R2. Każdy efekt to jedna animacja sprite sheet odtwarzana w miejscu kliknięcia (nie system cząsteczkowy z wieloma sprite'ami)
- R3. Tryby persistent i one-shot działają jak dotychczas — persistent zapętla animację, one-shot odtwarza raz i znika
- R4. Parametr `size` skaluje sprite proporcjonalnie w world-space (jak obecne efekty)
- R5. Sprite sheety pochodzą z gotowych darmowych assetów (itch.io, OpenGameArt itp.)
- R6. Wydajność musi być porównywalna lub lepsza niż obecny system — brak zauważalnego spadku FPS przy 10+ aktywnych efektach

## Success Criteria
- Efekty wizualnie wyglądają jak pełnoprawne animacje (ogień płonie, dym unosi się, eksplozja wybucha) zamiast kolorowych kółek
- Brak spadku wydajności vs. obecny system przy typowym użyciu (kilka-kilkanaście efektów)
- Istniejący UX (kliknij na mapę → efekt się pojawia, wybierz preset, ustaw rozmiar) pozostaje bez zmian

## Scope Boundaries
- Nie przechodzimy na WebGL/WebGPU — zostajemy na Canvas 2D
- Nie budujemy systemu cząsteczkowego z teksturami — jeden sprite sheet = jeden efekt
- Nie tworzymy własnych sprite sheetów — używamy gotowych assetów
- Nie zmieniamy UI panelu VFX (poza ewentualnym podglądem efektu)

## Key Decisions
- **Jeden sprite na efekt zamiast cząsteczek z teksturą**: Drastycznie niższy koszt renderowania (1 drawImage vs 50-100 na efekt), prostsze w implementacji, gotowe sprite sheety i tak wyglądają kompletnie
- **Canvas 2D pozostaje**: Brak potrzeby migracji do WebGL — `drawImage()` jest wystarczająco szybkie dla tego przypadku użycia
- **Gotowe assety**: Szybko, tanio, łatwo podmienić na lepsze w przyszłości

## Outstanding Questions

### Deferred to Planning
- [Affects R1][Needs research] Jakie konkretne sprite sheety użyć dla każdego z 7 presetów? Trzeba znaleźć assety z kompatybilnymi licencjami
- [Affects R2][Technical] Jak obsłużyć różne formaty sprite sheetów (grid vs strip, różne rozmiary klatek)?
- [Affects R1][Technical] Jak preloadować sprite sheety żeby nie było opóźnienia przy pierwszym użyciu efektu?

## Next Steps
→ `/ce:plan` for structured implementation planning
