---
title: "feat: Replace circle VFX with animated sprite sheet effects"
type: feat
status: active
date: 2026-05-15
origin: docs/brainstorms/2026-05-15-map-vfx-sprite-effects-requirements.md
---

# feat: Replace circle VFX with animated sprite sheet effects

## Overview

Zamiana obecnego systemu cząsteczkowego (kółka via `ctx.arc()`) na animowane sprite sheety dla wszystkich 7 presetów VFX. Każdy efekt to jedna animacja sprite sheet odtwarzana w miejscu kliknięcia na mapie. Podejście wybrane w brainstormie: "jeden sprite na cały efekt" zamiast cząsteczek z teksturą (see origin: `docs/brainstorms/2026-05-15-map-vfx-sprite-effects-requirements.md`).

## Problem Statement / Motivation

Efekty na mapie wyglądają prymitywnie — kolorowe kółka nie budują immersji w sesji RPG. Sprite sheety dadzą zjawiskowe animacje (płonący ogień, unoszący się dym, wybuch) przy minimalnym koszcie wydajnościowym — 1× `drawImage()` na efekt zamiast 50-100× `arc()` na efekt.

## Proposed Solution

### Architecture Change

Zastąpienie object-pooled particle system (512 cząsteczek) prostszym systemem: każda `VfxInstance` = jedna animacja sprite sheet. Renderer iteruje po instancjach, oblicza bieżącą klatkę na podstawie czasu, rysuje `ctx.drawImage()` z odpowiednim source rectangle.

### Sprite Sheet Manifest

Każdy preset definiuje metadane sprite sheetu:

```typescript
// src/ui/tools/map-display/vfx/spriteSheetManifest.ts
interface SpriteSheetMeta {
  src: string;           // Vite asset import URL
  cols: number;          // kolumny w sprite sheet
  rows: number;          // wiersze w sprite sheet
  frameCount: number;    // całkowita liczba klatek
  fps: number;           // klatki na sekundę
  frameWidth: number;    // px szerokość jednej klatki
  frameHeight: number;   // px wysokość jednej klatki
}

const SPRITE_SHEET_MANIFEST: Record<VfxPreset, SpriteSheetMeta> = {
  fire: { src: fireSheet, cols: 8, rows: 8, frameCount: 64, fps: 24, frameWidth: 128, frameHeight: 128 },
  explosion: { /* ... */ },
  // ...
};
```

### Asset Loading Strategy

- **Eager preload na starcie** — ładuj wszystkie 7 sprite sheetów jako `HTMLImageElement` przy montowaniu `MapDisplay`
- **Fallback**: jeśli obraz nie załadowany → rysuj kolorowe kółko (obecne zachowanie) jako fallback
- **Budżet**: max ~512×512 per sprite sheet, ~7 plików = ~2-5 MB łącznie

### Frame Calculation

```typescript
// W drawVfx():
const elapsed = (time - instance.startTime) / 1000;
const totalFrames = meta.frameCount;
const frameDuration = 1 / meta.fps;

let frameIndex: number;
if (instance.mode === 'persistent') {
  frameIndex = Math.floor(elapsed / frameDuration) % totalFrames; // loop
} else {
  frameIndex = Math.min(Math.floor(elapsed / frameDuration), totalFrames - 1);
  if (frameIndex >= totalFrames - 1) {
    // animation complete → remove instance
  }
}

const sx = (frameIndex % meta.cols) * meta.frameWidth;
const sy = Math.floor(frameIndex / meta.cols) * meta.frameHeight;

ctx.drawImage(img, sx, sy, meta.frameWidth, meta.frameHeight,
  instance.x - halfSize, instance.y - halfSize, instance.size, instance.size);
```

### Duration Semantics

- **One-shot**: `duration` jest usunięty z UI dla one-shot — animacja trwa tyle ile ma klatek w sprite sheecie. Czas = `frameCount / fps`
- **Persistent**: animacja się zapętla bez końca, `duration` nie stosuje się

### Instance Cap

- Max **50 jednoczesnych instancji VFX** (vs obecne 512 cząsteczek). Przy próbie dodania 51. → najstarszy one-shot usuwany, lub odmowa dla persistent.

## Technical Considerations

### Files to Modify

| Plik | Zmiana |
|------|--------|
| `src/ui/tools/map-display/hooks/useVfxRenderer.ts` | Przepisanie — usunięcie particle systemu, nowy sprite sheet renderer |
| `src/ui/tools/map-display/types.ts` | Dodanie `startTime` do `VfxInstance`, usunięcie `duration` z `VfxSettings` dla one-shot |
| `src/ui/tools/map-display/MapDisplay.tsx` | Aktualizacja UI panelu VFX (usunięcie duration dla one-shot), preload sprite sheetów |

### New Files

| Plik | Cel |
|------|-----|
| `src/ui/tools/map-display/vfx/spriteSheetManifest.ts` | Manifest z metadanymi i importami sprite sheetów |
| `src/ui/tools/map-display/vfx/assets/*.png` | 7 sprite sheetów (bundled via Vite) |

### Dead Code Removal

Usunąć z `useVfxRenderer.ts`:
- Cały object pool (`particles[]`, `MAX_PARTICLES`, `resetParticle()`)
- `blurredSpriteCache` i `getBlurredSprite()`
- `PRESET_COLORS` (kolory fallbackowe mogą zostać dla fallback renderingu)
- `instanceParticlesRef` mapping

### Performance

- **Lepiej niż obecny system**: 1× `drawImage()` per efekt vs 50-100× (`arc()` + `fill()` + blend)
- 50 efektów = 50 `drawImage()` na klatkę — absolutnie bezpieczne dla Canvas 2D
- Sprite sheety preloadowane jako `HTMLImageElement` — zero alokacji w render loop
- `imageSmoothingEnabled = true` (domyślne) — akceptowalne przy skalowaniu 512px sprite sheetów

### Scaling Quality

- Sprite sheety 512×512 wyglądają dobrze do `size ~300px` w world-space
- Przy bardzo dużych rozmiarach (>400px) może być lekka pikselizacja — akceptowalne dla v1
- Przyszłościowo: można dodać warianty HD (@2x) per preset

## Acceptance Criteria

- [ ] Wszystkie 7 presetów renderowanych jako animacje sprite sheet zamiast kółek
- [ ] Persistent mode: animacja się zapętla bez końca
- [ ] One-shot mode: animacja odtwarza się raz i instancja jest usuwana
- [ ] Parametr `size` skaluje sprite proporcjonalnie w world-space
- [ ] Fallback do kolorowego kółka gdy sprite sheet nie załadowany
- [ ] Max 50 jednoczesnych instancji VFX
- [ ] Brak zauważalnego spadku FPS przy 10+ aktywnych efektach
- [ ] Stary kod particle systemu usunięty (brak dead code)
- [ ] UI panelu VFX zaktualizowany (duration ukryty dla one-shot)

## Dependencies & Risks

- **Sprite sheety**: trzeba znaleźć 7 darmowych sprite sheetów z kompatybilnymi licencjami (MIT/CC0/CC-BY). Ryzyko: nie wszystkie presety mogą mieć dobre darmowe assety (szczególnie: lightning, ice, glow)
- **Format sprite sheetów**: różni autorzy używają różnych layoutów (grid, strip). Manifest musi być elastyczny
- **Bundle size**: ~2-5 MB dodatkowych assetów w aplikacji Electron — akceptowalne

## Sources & References

- **Origin document:** [docs/brainstorms/2026-05-15-map-vfx-sprite-effects-requirements.md](docs/brainstorms/2026-05-15-map-vfx-sprite-effects-requirements.md) — Key decisions: jeden sprite na efekt (nie cząsteczki), Canvas 2D bez WebGL, gotowe darmowe assety
- Current VFX renderer: `src/ui/tools/map-display/hooks/useVfxRenderer.ts`
- Canvas render loop: `src/ui/tools/map-display/hooks/useCanvasRenderer.ts`
- VFX types: `src/ui/tools/map-display/types.ts`
- Asset loading pattern (map image): `src/ui/tools/map-display/MapDisplay.tsx:120-160`
