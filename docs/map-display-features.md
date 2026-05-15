# Map Display — Feature & Code Reference

> Dokument referencyjny do migracji na inną bibliotekę renderingu.
> Stan na: 2026-05-15

---

## Pliki modułu

| Plik | Opis | Linie |
|---|---|---|
| `src/ui/tools/map-display/MapDisplay.tsx` | Główny komponent — orkiestruje warstwy, toolbar, zoom, drop, pan, ładowanie obrazu, przełączanie narzędzi | ~725 |
| `src/ui/tools/map-display/types.ts` | Definicje typów i stałe domyślne | 71 |
| `src/ui/tools/map-display/MapDisplay.module.css` | Style: layout, toolbar, ikony, panele kontekstowe, zoom, lista tokenów | 322 |
| `src/ui/tools/map-display/hooks/usePixiApp.ts` | Montuje Pixi.js `Application` w div, ResizeObserver | 61 |
| `src/ui/tools/map-display/hooks/useGridLayer.ts` | Rysuje siatkę kwadratową lub heksagonalną | 143 |
| `src/ui/tools/map-display/hooks/useFowLayer.ts` | Fog of War: maska RenderTexture, pędzel, reveal/conceal | 265 |
| `src/ui/tools/map-display/hooks/useTokenLayer.ts` | Tokeny: renderowanie, drag, CRUD, synchronizacja avatar | 366 |
| `src/ui/tools/map-display/hooks/useVfxLayer.ts` | System cząsteczek VFX: 7 presetów, animacja, click-to-place | 325 |

### Pliki integracji z Canvas System

| Plik | Linie | Rola |
|---|---|---|
| `src/ui/canvas/InfiniteCanvas.tsx` | 29–30, 63–70 | Import MapDisplay, routing w ToolContent switch |
| `src/ui/canvas/CanvasWindow.tsx` | 34 | `map-display` w `FULL_BLEED_TOOLS` — brak paddingu, Pixi canvas wypełnia okno |
| `src/ui/canvas/types.ts` | 10, 70, 84, 98 | `'map-display'` w ToolType, min 400x400, default 600x500, ikona 🗺️ |
| `src/ui/canvas/Minimap.tsx` | 26 | Kolor na minimapie: `#4ade80` (zielony) |

---

## Funkcjonalności

### 1. Ładowanie obrazu mapy

**Opis:** Użytkownik wybiera obraz przez Electron file picker. Obraz czytany przez IPC jako base64 data URL, wyświetlany jako Pixi Sprite.

**Kod:**
- `MapDisplay.tsx` linia 258–286 — `loadImage` (async: readImage IPC → Assets.load → Sprite → world.addChildAt(sprite, 0))
- `MapDisplay.tsx` linia 293–299 — restore effect (przywraca zapisany obraz po ponownym montowaniu)
- `MapDisplay.tsx` linia 302–308 — `handleLoadMap` (otwiera file picker)

**Stan:** `MapDisplayState.imagePath: string | null`

---

### 2. Zoom (przybliżanie/oddalanie)

**Opis:** Suwak (0.05x–5x), przyciski +/−, przycisk dopasowania do okna, wyświetlanie procentu.

**Kod:**
- `MapDisplay.tsx` linia 186–208 — `applyZoom` (clamping, centrowanie, zapis viewport)
- `MapDisplay.tsx` linia 210–231 — `fitToContainer` (oblicza skalę dopasowania)
- `MapDisplay.tsx` linia 369–373 — `handleZoomIn`, `handleZoomOut`, `handleSlider`
- `MapDisplay.tsx` linia 675–690 — JSX: zoom controls (overlay w prawym dolnym rogu)

**Stan:** `MapDisplayState.viewport: { x, y, zoom }`

---

### 3. Panoramowanie (pan)

**Opis:** Przeciąganie środkowym przyciskiem myszy. Pointer capture dla płynności.

**Kod:**
- `MapDisplay.tsx` linia 311–366 — effect z event listenerami (pointerdown/move/up na canvas, button === 1)

**Stan:** `MapDisplayState.viewport: { x, y, zoom }`

---

### 4. Siatka (Grid Overlay)

**Opis:** Kwadratowa lub heksagonalna siatka. Konfigurowalna wielkość komórki (16–512) i przezroczystość (0.05–1.0). Możliwość wyłączenia.

**Kod:**
- `hooks/useGridLayer.ts` linia 13–68 — główny hook, tworzy Graphics na world child index 1
- `hooks/useGridLayer.ts` linia 72–88 — `drawSquareGrid` (linie pionowe + poziome)
- `hooks/useGridLayer.ts` linia 92–119 — `drawHexGrid` (flat-top, kolumny/wiersze)
- `hooks/useGridLayer.ts` linia 121–143 — `drawHex` (rysuje pojedynczy heksagon z 6 wierzchołków)
- `MapDisplay.tsx` linia 377–393 — handlery: `updateGrid`, `handleGridTypeChange`, `handleCellSizeChange`, `handleGridOpacityChange`
- `MapDisplay.tsx` linia 615–656 — JSX: panel ustawień siatki (dół toolbaru)

**Stan:** `MapDisplayState.grid: { type: 'square' | 'hex' | 'none', cellSize: number, opacity: number }`

**Domyślne:** type='square', cellSize=64, opacity=0.3

---

### 5. Fog of War (Mgła Wojny)

**Opis:** System maskowy oparty na RenderTexture. Pędzel do odsłaniania/zakrywania. Interpolacja liniowa dla gładkich kresek. Debounced zapis jako PNG data URL. Przyciski "Reveal All" / "Conceal All".

**Kod:**
- `hooks/useFowLayer.ts` linia 42–105 — tworzenie maskRT, maskSprite, fogContainer (czarny rect, alpha 0.7), ładowanie zapisanej maski
- `hooks/useFowLayer.ts` linia 108–117 — `scheduleSave` (debounce 500ms, extract canvas → PNG data URL)
- `hooks/useFowLayer.ts` linia 120–137 — `paintAt` (stempluje okrąg: czarny=reveal, biały=conceal)
- `hooks/useFowLayer.ts` linia 140–151 — `paintLine` (interpolacja między punktami)
- `hooks/useFowLayer.ts` linia 154–215 — event handlery (pointerdown/move/up, lewy przycisk, pointer capture)
- `hooks/useFowLayer.ts` linia 218–227 — `revealAll` (wypełnia maskę czarnym)
- `hooks/useFowLayer.ts` linia 229–238 — `concealAll` (wypełnia maskę białym)
- `hooks/useFowLayer.ts` linia 251–265 — `loadMaskFromDataUrl` (przywraca zapisaną maskę)
- `MapDisplay.tsx` linia 63–76 — setup FoW hooka, `handleFowChange`
- `MapDisplay.tsx` linia 500–535 — JSX: panel FoW (brush size, slider, Reveal All, Conceal All)

**Stan:**
- `MapDisplayState.fowDataUrl: string | null`
- `MapDisplayState.activeTool: 'fow-reveal' | 'fow-conceal'`
- `MapDisplayState.brushSettings: { size: number, opacity: number }`

**Domyślne:** brushSize=40

---

### 6. Tokeny (postacie na mapie)

**Opis:** Tokeny to kolorowe kółka z inicjałami (fallback) lub avatarem. Można je dodawać ręcznie, drag&drop z Party Trackera lub Bestiariusza. Przeciąganie tokenów na mapie. Lista z przyciskiem usuwania. Synchronizacja nazwy/avatara między tokenami tego samego źródła.

**Kod:**
- `hooks/useTokenLayer.ts` linia 71–289 — główny hook
- `hooks/useTokenLayer.ts` linia 86–102 — `ensureLayer` (lazy creation Container 'token-layer')
- `hooks/useTokenLayer.ts` linia 105–158 — sync effect (reconcilia kontenerów Pixi z danymi tokenów)
- `hooks/useTokenLayer.ts` linia 160–258 — drag handling (hit test, offset tracking, visual update, persist)
- `hooks/useTokenLayer.ts` linia 172–181 — `toMapCoords` (konwersja screen → map coords)
- `hooks/useTokenLayer.ts` linia 183–195 — `hitTest` (reverse-order, circle radius)
- `hooks/useTokenLayer.ts` linia 261–263 — `addToken`
- `hooks/useTokenLayer.ts` linia 266–273 — `addTokenWithSync`
- `hooks/useTokenLayer.ts` linia 275–277 — `removeToken`
- `hooks/useTokenLayer.ts` linia 279–286 — `updateTokensBySource`
- `hooks/useTokenLayer.ts` linia 292–322 — `createTokenVisual` (Container: kolorowe kółko, initials Text, name label)
- `hooks/useTokenLayer.ts` linia 33–53 — `nameToColor` (deterministyczny hash name → HSL → hex)
- `hooks/useTokenLayer.ts` linia 325–366 — `loadTokenAvatar` (async: base64/IPC → Sprite z circular mask)
- `MapDisplay.tsx` linia 79–90 — setup token hooka
- `MapDisplay.tsx` linia 106–152 — `handleDrop` (cross-tool drag&drop, parsowanie MapDropPayload)
- `MapDisplay.tsx` linia 160–182 — `addManualToken` (token na środku viewport)
- `MapDisplay.tsx` linia 693–720 — JSX: panel tokenów (Add Token, lista z remove)

**Stan:** `MapDisplayState.tokens: MapToken[]`

```typescript
interface MapToken {
  id: string;                           // unikalny identyfikator
  sourceType: 'party' | 'bestiary' | 'manual';
  sourceId: string;                     // ID postaci/stworzenia ze źródła
  name: string;
  avatarPath: string | null;            // ścieżka pliku lub base64 data URL
  x: number; y: number;                // pozycja w map-space
  scale: number;
}
```

---

### 7. VFX (efekty wizualne)

**Opis:** 7 presetów cząsteczek (fire, explosion, smoke, lightning, glow, fog, ice). Kliknięcie na mapę umieszcza efekt. Każdy ma indywidualną fizykę (prędkość, czas życia, skala). Tryb persistent lub one-shot. Konfigurowalny rozmiar i czas trwania. Blur filter na smoke/fog. Przycisk Clear All.

**Kod:**
- `hooks/useVfxLayer.ts` linia 31–39 — `VFX_PRESETS` (7 presetów: id, label, icon)
- `hooks/useVfxLayer.ts` linia 48–56 — `PRESET_COLORS` (4 kolory per preset)
- `hooks/useVfxLayer.ts` linia 58–218 — główny hook
- `hooks/useVfxLayer.ts` linia 77–90 — `ensureLayer` (lazy creation Container 'vfx-layer')
- `hooks/useVfxLayer.ts` linia 93–127 — sync effect (spawns particles, obsługa one-shot timerów)
- `hooks/useVfxLayer.ts` linia 130–161 — animation loop (requestAnimationFrame: pozycja, alpha, skala, respawn)
- `hooks/useVfxLayer.ts` linia 164–195 — click-to-place (pointerdown when activeTool==='vfx')
- `hooks/useVfxLayer.ts` linia 235–269 — `spawnParticles` (12–20 cząsteczek, losowy kolor, blur dla fog/smoke)
- `hooks/useVfxLayer.ts` linia 271–325 — `resetParticle` (per-preset physics: fire rises, explosion radiates, lightning flickers...)
- `MapDisplay.tsx` linia 92–107 — setup VFX hooka
- `MapDisplay.tsx` linia 538–611 — JSX: panel VFX (preset select, size, mode, duration, Clear All)

**Stan:**
- `MapDisplayState.vfxInstances: VfxInstance[]`
- `MapDisplayState.vfxSettings: { selectedPreset, size, mode, duration }`

```typescript
type VfxPreset = 'fire' | 'explosion' | 'smoke' | 'lightning' | 'glow' | 'fog' | 'ice';

interface VfxInstance {
  id: string;
  preset: VfxPreset;
  x: number; y: number;
  size: number;
  mode: 'one-shot' | 'persistent';
  duration: number;
}
```

**Domyślne:** preset='fire', size=60, mode='persistent', duration=2s

---

### 8. Drag & Drop (cross-tool)

**Opis:** Party Tracker i Bestiariusz mogą przeciągać postacie na mapę. Protokół JSON przez `application/json` dataTransfer.

**Kod:**
- `MapDisplay.tsx` linia 106–152 — `handleDrop` (parsuje MapDropPayload, konwertuje coords, tworzy token)
- `MapDisplay.tsx` linia 154–157 — `handleDragOver` (dropEffect='copy')
- `src/ui/tools/party-tracker/CharacterCard.tsx` — `onDragStart` ustawia payload

**Protokół:**
```typescript
interface MapDropPayload {
  type: 'party-character' | 'bestiary-creature';
  id: string;
  name: string;
  portraitPath: string | null;
  meta?: Record<string, unknown>;
}
```

---

### 9. Toolbar (GIMP-style)

**Opis:** Lewy panel z ikonami narzędzi i kontekstowym panelem opcji poniżej. 6 narzędzi: navigate, fow-reveal, fow-conceal, load-map, tokens, vfx.

**Kod:**
- `MapDisplay.tsx` linia 396–398 — `setActiveTool`
- `MapDisplay.tsx` linia 412–658 — JSX: icon grid (SVG ikony), context panels, grid settings

**Stan:** `MapDisplayState.activeTool: MapTool`

```typescript
type MapTool = 'navigate' | 'fow-reveal' | 'fow-conceal' | 'tokens' | 'vfx';
```

---

### 10. Persystencja stanu

**Opis:** Cały stan MapDisplayState jest przechowywany w `WindowState.toolState` systemu canvas. Autosave z debounce 500ms przez Electron IPC.

**Kod:**
- `src/ui/canvas/hooks/useCanvasPersistence.ts` — debounced save/load przez `window.electronAPI.canvas.save/load`
- `MapDisplay.tsx` linia 36–45 — `patchState` (atomowy update z ochroną imagePath)

---

## Hierarchia Pixi.js (scene graph)

```
app.stage
  └── world (Container, label='world')
       ├── [0] Map Sprite (z załadowanego obrazu)
       ├── [1] Grid overlay (Graphics, label='grid-overlay')
       ├── [~2] FoW mask sprite + fog container (label='fow-layer')
       ├── [n] Token layer (Container, label='token-layer')
       │    └── per-token Container: circle bg + initials + avatar + name label
       └── [n+1] VFX layer (Container, label='vfx-layer')
            └── per-instance: 12–20 particle Graphics
```

---

## Pełny kształt stanu

```typescript
interface MapDisplayState {
  imagePath: string | null;
  grid: GridConfig;
  viewport: ViewportState;
  tokens: MapToken[];
  fowDataUrl: string | null;
  activeTool: MapTool;
  brushSettings: BrushSettings;
  vfxInstances: VfxInstance[];
  vfxSettings: VfxSettings;
}

const DEFAULT_MAP_STATE: MapDisplayState = {
  imagePath: null,
  grid: { type: 'square', cellSize: 64, opacity: 0.3 },
  viewport: { x: 0, y: 0, zoom: 1 },
  tokens: [],
  fowDataUrl: null,
  activeTool: 'navigate',
  brushSettings: { size: 40, opacity: 1 },
  vfxInstances: [],
  vfxSettings: { selectedPreset: 'fire', size: 60, mode: 'persistent', duration: 2 },
};
```

---

## Style / Design System

- **Plik:** `MapDisplay.module.css` (322 linie)
- **Motyw:** Dark — `rgba(15,17,23,0.92)` tła, `backdrop-filter: blur(8px)`
- **Akcent:** `var(--accent, #C9B06B)` (złoty)
- **Tekst:** `var(--text-primary, #E8E6E3)`
- **Kluczowe klasy:** `.wrapper`, `.canvasArea`, `.toolbar`, `.iconGrid`, `.iconBtn`, `.iconBtnActive`, `.contextPanel`, `.toolSection`, `.zoomControls`, `.tokenList`, `.fowActionBtn`
