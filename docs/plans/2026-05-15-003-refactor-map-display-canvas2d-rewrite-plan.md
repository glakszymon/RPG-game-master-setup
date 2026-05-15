---
title: "refactor: Rewrite Map Display from Pixi.js to Canvas 2D"
type: refactor
status: active
date: 2026-05-15
origin: docs/brainstorms/2026-05-15-map-canvas2d-rewrite-requirements.md
deepened: 2026-05-15
---

# Rewrite Map Display from Pixi.js to Canvas 2D

## Enhancement Summary

**Deepened on:** 2026-05-15
**Sections enhanced:** 6 phases + architecture
**Research areas:** Canvas 2D render patterns, FoW masking, token interaction, particle systems

### Key Improvements
1. Dirty-flag render loop (zero CPU when idle) zamiast always-render
2. HiDPI/devicePixelRatio handling — ostre renderowanie na Retina/4K
3. `getCoalescedEvents()` dla plynnych kresek FoW
4. Object pooling dla czasteczek VFX (zero GC pressure)
5. Pre-blurred OffscreenCanvas sprites zamiast per-frame `ctx.filter`
6. `createImageBitmap` dla ladowania avatarow (dekodowanie off-thread)
7. `toBlob()` async zamiast blokujacego `toDataURL()` dla zapisu FoW

## Overview

Przepisanie modulu mapy z Pixi.js (WebGL) na natywne HTML Canvas 2D API. Obecna implementacja ma liczne bugi renderowania (tokeny, FoW, VFX, crashe canvasa). Zamiast naprawiania, modul zostanie przepisany od zera z zachowaniem 1:1 wszystkich funkcjonalnosci. Migracja big bang — usuniecie starych plikow i napisanie nowych w tym samym katalogu.

## Problem Statement / Motivation

Pixi.js powoduje niestabilne renderowanie we wszystkich warstwach mapy: tokeny nie wyswietlaja sie poprawnie, FoW maskowanie/malowanie jest bugged, efekty VFX nie dzialaja prawidlowo, a canvas czasem nie startuje lub crashuje. Zewnetrzna abstrakcja WebGL dodaje zlozonosc bez proporcjonalnej wartosci dla tego zastosowania. Canvas 2D jest prostszy, stabilniejszy, latwiejszy do debugowania i wystarczajacy wydajnosciowo dla map do 4000x4000px (see origin: docs/brainstorms/2026-05-15-map-canvas2d-rewrite-requirements.md).

## Proposed Solution

Przepisanie 5 hookow Pixi.js + glownego komponentu MapDisplay.tsx na natywny Canvas 2D. Zachowanie istniejacych typow (`types.ts`), stanu (`MapDisplayState`), interfejsow integracji (`onToolStateChange`, `MapDropPayload`) i stylow (`MapDisplay.module.css`). Usuniecie zaleznosci `pixi.js` z package.json.

## Technical Approach

### Architektura

Jeden `<canvas>` element w DOM, renderowany imperatywnie przez `CanvasRenderingContext2D`. Offscreen canvas dla FoW mask. Render loop oparty na dirty-flag pattern — przerysowanie tylko gdy stan sie zmieni, self-terminating gdy nic sie nie zmienia (zero CPU idle).

**Render loop pattern:**

```typescript
// Dirty-flag pattern — canvas przerysowywany TYLKO gdy markDirty() zostanie wywolane
let dirty = true;
let animating = false; // true gdy VFX sa aktywne
let rafId = 0;

function markDirty() {
  dirty = true;
  if (!rafId) rafId = requestAnimationFrame(tick);
}

function tick(time: number) {
  rafId = 0;
  if (dirty) {
    dirty = false;
    render();
  }
  // Kontynuuj loop TYLKO jesli sa aktywne animacje VFX
  if (animating) rafId = requestAnimationFrame(tick);
}
```

**Render function:**

```typescript
function render() {
  const { width, height, dpr } = getSize();
  // Reset transform do identity + DPR
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // World-space: camera transform (DPR + zoom + pan w jednym setTransform)
  ctx.setTransform(
    viewport.zoom * dpr, 0,
    0, viewport.zoom * dpr,
    viewport.x * dpr,
    viewport.y * dpr
  );
  drawMapImage(ctx);
  drawGrid(ctx);
  drawTokens(ctx);
  drawFoW(ctx);
  drawVfxParticles(ctx);

  // Screen-space: UI overlay (tylko DPR)
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  // zoom controls, cursor itp. rysowane w JSX overlay, nie na canvasie
}
```

**HiDPI handling:**

```typescript
function setupCanvas(canvas: HTMLCanvasElement, container: HTMLElement) {
  const ro = new ResizeObserver(() => {
    const rect = container.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * dpr);   // physical pixels
    canvas.height = Math.floor(rect.height * dpr);
    canvas.style.width = `${rect.width}px`;         // CSS pixels
    canvas.style.height = `${rect.height}px`;
    markDirty();
  });
  ro.observe(container);
  return () => ro.disconnect();
}
```

**Konwersja wspolrzednych:**

```typescript
function screenToWorld(sx: number, sy: number, viewport: ViewportState): [number, number] {
  return [
    (sx - viewport.x) / viewport.zoom,
    (sy - viewport.y) / viewport.zoom,
  ];
}

function worldToScreen(wx: number, wy: number, viewport: ViewportState): [number, number] {
  return [
    wx * viewport.zoom + viewport.x,
    wy * viewport.zoom + viewport.y,
  ];
}
```

### Implementation Phases

#### Phase 1: Foundation — Canvas setup, obraz, zoom/pan

**Pliki:**
- Usun `hooks/usePixiApp.ts`
- Utworz `hooks/useCanvasRenderer.ts` — nowy glowny hook

**Zadania:**
- [ ] `useCanvasRenderer.ts`: Utworz `<canvas>`, pobierz `CanvasRenderingContext2D`, ResizeObserver z HiDPI handling (`devicePixelRatio`)
- [ ] Dirty-flag render loop z self-termination (zero CPU gdy idle)
- [ ] `markDirty()` — wywolywane z kazdego handlera ktory zmienia stan
- [ ] Ladowanie obrazu mapy: `new Image()` → `ctx.drawImage()` (zamiast Pixi Sprite)
- [ ] Zoom centrowany na kursorze:
  ```typescript
  // World point pod kursorem PRZED zoomem
  const [wx, wy] = screenToWorld(sx, sy, viewport);
  // Zastosuj nowy zoom
  viewport.zoom = clamp(viewport.zoom * factor, 0.05, 5);
  // Dostosuj pan zeby (wx,wy) pozostalo pod (sx,sy)
  viewport.x = sx - wx * viewport.zoom;
  viewport.y = sy - wy * viewport.zoom;
  ```
- [ ] Pan: `pointerdown/move/up` na srodkowy przycisk myszy z `setPointerCapture`
- [ ] Fit-to-container: obliczenie skali dopasowania obrazu do rozmiaru canvasa
- [ ] Cleanup: `cancelAnimationFrame(rafId)`, `ro.disconnect()` w useEffect cleanup
- [ ] Aktualizacja `MapDisplay.tsx` — usuniecie importow Pixi, montowanie nowego hooka

**Kryteria sukcesu:** Obraz mapy wyswietla sie ostro na HiDPI, zoom centruje na kursorze, pan dziala plynnie, canvas reaguje na resize okna.

#### Phase 2: Siatka (Grid Overlay)

**Pliki:**
- Usun `hooks/useGridLayer.ts`
- Utworz `hooks/useGridRenderer.ts`

**Zadania:**
- [ ] `drawSquareGrid(ctx, config, imageWidth, imageHeight)`: linie pionowe + poziome
  ```typescript
  ctx.beginPath();
  ctx.strokeStyle = `rgba(255,255,255,${config.opacity})`;
  ctx.lineWidth = 1 / viewport.zoom; // stala grubosc niezaleznie od zoomu
  for (let x = 0; x <= imageWidth; x += config.cellSize) {
    ctx.moveTo(x, 0); ctx.lineTo(x, imageHeight);
  }
  for (let y = 0; y <= imageHeight; y += config.cellSize) {
    ctx.moveTo(0, y); ctx.lineTo(imageWidth, y);
  }
  ctx.stroke();
  ```
- [ ] `drawHexGrid(ctx, config, imageWidth, imageHeight)`: flat-top heksy, kolumny/wiersze
- [ ] Konfigurowalna opacity — ustawiana jako `strokeStyle` z alpha
- [ ] Integracja z glownym render loop (wywolanie po `drawMapImage`)

**Kryteria sukcesu:** Siatka kwadratowa i heksagonalna rysuja sie poprawnie, linie maja stala grubosc niezaleznie od zoomu, opacity dziala.

#### Phase 3: Fog of War

**Pliki:**
- Usun `hooks/useFowLayer.ts`
- Utworz `hooks/useFowRenderer.ts`

**Zadania:**
- [ ] Offscreen canvas (`document.createElement('canvas')`) w rozmiarze obrazu mapy
- [ ] Inicjalizacja: wypelnienie czarnym (fog color) — `concealAll()`
- [ ] Przywrocenie z `fowDataUrl` przy montowaniu:
  ```typescript
  // Uzyj createImageBitmap dla dekodowania off-thread
  const resp = await fetch(fowDataUrl);
  const blob = await resp.blob();
  const bitmap = await createImageBitmap(blob);
  fogCtx.globalCompositeOperation = 'copy'; // replace entirely
  fogCtx.drawImage(bitmap, 0, 0);
  fogCtx.globalCompositeOperation = 'source-over';
  bitmap.close(); // zwolnij pamiec
  ```
- [ ] `paintAt(x, y, size, mode)`: rysowanie okregu na offscreen canvas
  - Reveal: `globalCompositeOperation = 'destination-out'` z `rgba(0,0,0, opacity)` (alpha kontroluje sile odslanania)
  - Conceal: `globalCompositeOperation = 'source-over'` z fog color
- [ ] `paintLine(from, to, size, mode)`: interpolacja liniowa z spacing = `radius * 0.5`
  ```typescript
  const dist = Math.hypot(to.x - from.x, to.y - from.y);
  const spacing = Math.max(1, size * 0.25);
  const steps = Math.floor(dist / spacing);
  for (let i = 1; i <= steps; i++) {
    const t = i / steps;
    paintAt(lerp(from.x, to.x, t), lerp(from.y, to.y, t), size, mode);
  }
  ```
- [ ] Event handlery z `getCoalescedEvents()` dla sub-frame precision:
  ```typescript
  canvas.addEventListener('pointermove', (e) => {
    if (!painting) return;
    const events = e.getCoalescedEvents?.() ?? [e];
    for (const ce of events) {
      const [wx, wy] = screenToWorld(ce.offsetX, ce.offsetY, viewport);
      paintLine(lastPoint, { x: wx, y: wy }, brushSize, mode);
      lastPoint = { x: wx, y: wy };
    }
    markDirty();
  });
  ```
- [ ] `revealAll()`: `fogCtx.clearRect(0, 0, w, h)`
- [ ] `concealAll()`: wypelnienie fog color
- [ ] Compositing na glownym canvasie: `ctx.drawImage(fowOffscreen, 0, 0)` — fog canvas ma wlasny alpha w kolorze
- [ ] Zapis async: `fowOffscreen.toBlob()` → `FileReader.readAsDataURL()` z debounce 500ms (nie blokuje UI)
  ```typescript
  function saveFogAsync(fogCanvas: HTMLCanvasElement): Promise<string> {
    return new Promise((resolve, reject) => {
      fogCanvas.toBlob((blob) => {
        if (!blob) { reject(new Error('toBlob null')); return; }
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
      }, 'image/png');
    });
  }
  ```

**Kryteria sukcesu:** Malowanie pedzlem odslania/zakrywa fog plynnie bez przerw, `getCoalescedEvents` eliminuje luki przy szybkim rysowaniu, zapis/odtwarzanie dziala, partial opacity dziala.

#### Phase 4: Tokeny

**Pliki:**
- Usun `hooks/useTokenLayer.ts`
- Utworz `hooks/useTokenRenderer.ts`

**Zadania:**
- [ ] `drawToken(ctx, token, avatarCache)`:
  ```typescript
  ctx.save();
  ctx.beginPath();
  ctx.arc(token.x, token.y, radius, 0, Math.PI * 2);
  ctx.clip();
  const avatar = avatarCache.get(token.avatarPath);
  if (avatar instanceof HTMLImageElement) {
    ctx.drawImage(avatar, token.x - radius, token.y - radius, radius * 2, radius * 2);
  } else {
    ctx.fillStyle = nameToColor(token.name);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${radius}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(token.name.charAt(0).toUpperCase(), token.x, token.y);
  }
  ctx.restore(); // CRITICAL — removes clip region
  // Nazwa pod tokenem (poza clip)
  ctx.fillStyle = '#E8E6E3';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  ctx.fillText(token.name, token.x, token.y + radius + 4);
  ```
- [ ] `nameToColor(name)`: przenosimy istniejaca funkcje hash → HSL → hex (bez zmian)
- [ ] Async avatar cache z `Map<string, HTMLImageElement | Promise>`:
  - Zwroc `null` gdy ladowanie trwa (renderuj fallback z inicjalami)
  - Po zaladowaniu wywolaj `markDirty()` zeby przerysowac z avatarem
  - Rozwazyc `createImageBitmap` zamiast `new Image()` dla dekodowania off-thread + `bitmap.close()` przy cleanup
- [ ] Hit testing: squared distance (bez `Math.sqrt`):
  ```typescript
  function hitTest(mx: number, my: number, tokens: MapToken[], radius: number): number {
    for (let i = tokens.length - 1; i >= 0; i--) { // top-most first
      const dx = mx - tokens[i].x, dy = my - tokens[i].y;
      if (dx * dx + dy * dy <= radius * radius) return i;
    }
    return -1;
  }
  ```
- [ ] Drag tracking z offset (zapobiega "skokowi" tokena do kursora):
  ```typescript
  // pointerdown: offsetX = mx - token.x, offsetY = my - token.y
  // pointermove: token.x = mx - offsetX, token.y = my - offsetY
  ```
- [ ] Konwersja `screenToWorld` dla wspolrzednych (uzyj wspolnej funkcji z Phase 1)
- [ ] `addToken`, `removeToken`, `updateTokensBySource` — operacje na tablicy tokenow w stanie
- [ ] Cross-component drag&drop: `onDragOver` z `e.preventDefault()` (WYMAGANE zeby drop dzialal) + `onDrop` parsujacy `MapDropPayload`

**Kryteria sukcesu:** Tokeny renderuja sie poprawnie z clipping, drag nie powoduje skoku, avatary laduja sie async i canvas przerysowuje po zaladowaniu, drag&drop z zewnetrznych komponentow dziala.

#### Phase 5: VFX

**Pliki:**
- Usun `hooks/useVfxLayer.ts`
- Utworz `hooks/useVfxRenderer.ts`

**Zadania:**
- [ ] `VFX_PRESETS` i `PRESET_COLORS` — przenosimy (bez zmian)
- [ ] Object pool dla czasteczek (zero alokacji w trakcie animacji):
  ```typescript
  interface Particle {
    alive: boolean; x: number; y: number;
    vx: number; vy: number; alpha: number;
    scale: number; life: number; maxLife: number;
    color: string;
  }
  // Pool tworzony raz: Array.from({ length: MAX }, () => createParticle())
  // acquire(): znajdz pierwsza !alive czasteczke
  ```
- [ ] `spawnParticles(instance, pool)`: 12-20 czasteczek z losowym kolorem z palety presetu
- [ ] `resetParticle(p, preset, instance)`: per-preset fizyka
- [ ] `dt` cap: `Math.min((now - lastTime) / 1000, 0.05)` — zapobiega eksplozji po tab-switch
- [ ] Pre-blurred sprites dla smoke/fog (zamiast per-frame `ctx.filter`):
  ```typescript
  // Utworz raz przy init:
  function createBlurredDot(radius: number, color: string): OffscreenCanvas {
    const size = (radius + 8) * 2;
    const oc = new OffscreenCanvas(size, size);
    const octx = oc.getContext('2d')!;
    octx.filter = 'blur(3px)';
    octx.fillStyle = color;
    octx.beginPath();
    octx.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
    octx.fill();
    return oc;
  }
  // W renderze: ctx.drawImage(blurredDot, ...) — szybki texture blit
  ```
- [ ] Animation loop: `requestAnimationFrame` + flaga `animating` w glownym renderze
  - Gdy sa aktywne instancje VFX: `animating = true`, loop dziala ciagle
  - Gdy brak instancji: `animating = false`, loop sie zatrzymuje (dirty-flag only)
- [ ] Rysowanie czasteczek: `ctx.globalAlpha = p.alpha` + `ctx.arc()` + `ctx.fill()` (lub `ctx.drawImage(blurredDot)` dla smoke/fog)
- [ ] One-shot timer: po uplywie `duration` oznacz instancje jako martwa
- [ ] Persistent: animuj do manualnego usuniecia
- [ ] Click-to-place: `pointerdown` w trybie VFX tworzy nowa instancje
- [ ] Clear All: usun wszystkie instancje, `animating = false`
- [ ] **Zawsze przywracaj stan canvasa:** `ctx.globalAlpha = 1` po rysowaniu czasteczek

**Kryteria sukcesu:** 7 presetow animuje sie plynnie, smoke/fog z blur, zero GC pauses, animacja zatrzymuje sie gdy brak aktywnych VFX.

#### Phase 6: Toolbar + integracja + cleanup

**Pliki:**
- `MapDisplay.tsx` — finalne porzadki
- `MapDisplay.module.css` — bez zmian (lub minimalne)
- `package.json` — usuniecie `pixi.js`

**Zadania:**
- [ ] Toolbar JSX: zachowanie istniejacego layoutu ikon i paneli kontekstowych (bez zmian wizualnych)
- [ ] Przelaczanie narzedzi: `setActiveTool` zmienia zachowanie event handlerow na canvasie
- [ ] Panele ustawien: grid settings, FoW brush size, VFX preset/size/mode/duration, token list — zachowanie istniejacego JSX
- [ ] Zoom controls overlay (prawy dolny rog) — zachowanie istniejacego JSX
- [ ] Integracja z InfiniteCanvas: `ToolContent` case `'map-display'` — interfejs props bez zmian
- [ ] Integracja z CanvasWindow: `FULL_BLEED_TOOLS` — bez zmian
- [ ] Persystencja: `onToolStateChange(newState)` wywolywane z debounce przy kazdej zmianie stanu
- [ ] Usun `hooks/usePixiApp.ts` (jesli nie usuniete wczesniej)
- [ ] Usun `pixi.js` z `package.json`: `npm uninstall pixi.js`
- [ ] Weryfikacja: build przechodzi bez bledow, zero importow pixi.js w codebase
- [ ] Cleanup w useEffect return: `cancelAnimationFrame`, `ResizeObserver.disconnect()`, `ImageBitmap.close()` na zaladowanych avatarach

**Kryteria sukcesu:** Pelna funkcjonalnosc mapy dziala, toolbar przelacza narzedzia, stan sie zapisuje, pixi.js usuniete, zero memory leaks.

## System-Wide Impact

- **Interaction graph:** MapDisplay ← InfiniteCanvas (renders as ToolContent) ← CanvasWindow (provides resize/drag). MapDisplay → onToolStateChange → useCanvasPersistence → Electron IPC save. Party Tracker/Bestiariusz → drag → MapDisplay onDrop. Zadne z tych nie zmienia sie — tylko wnetrze MapDisplay.
- **Error propagation:** Bledy ladowania obrazu (IPC readImage) — istniejacy try/catch w MapDisplay. Bledy canvasa 2D sa prostsze niz WebGL — brak context lost event. `toBlob()` moze zwrocic null — obsluz gracefully.
- **State lifecycle risks:** Brak — `MapDisplayState` i `types.ts` nie zmieniaja sie. Istniejace zapisane stany (tokeny, fowDataUrl, viewport) sa kompatybilne.
- **API surface parity:** Jedyny interfejs to `props: { toolState, onToolStateChange, campaignId }` — bez zmian.

## Acceptance Criteria

### Functional Requirements
- [ ] Obraz mapy laduje sie i wyswietla poprawnie (ostro na HiDPI)
- [ ] Zoom (scroll centrowany na kursorze, +/-, suwak, fit) dziala plynnie w zakresie 0.05x-5x
- [ ] Pan (srodkowy przycisk myszy) dziala z pointer capture
- [ ] Siatka kwadratowa i heksagonalna rysuje sie poprawnie z konfigurowalnym rozmiarem i opacity
- [ ] FoW reveal/conceal pedzlem dziala plynnie bez artefaktow i luk
- [ ] FoW Reveal All / Conceal All dzialaja
- [ ] Tokeny wyswietlaja sie jako okragle avatary lub kolorowe kola z inicjalami
- [ ] Drag&drop tokenow z Party Trackera i Bestiariusza na mape dziala
- [ ] Przesuwanie tokenow na mapie dziala (bez skoku do kursora)
- [ ] Dodawanie/usuwanie tokenow reczne dziala
- [ ] 7 presetow VFX animuje sie poprawnie (fire, explosion, smoke, lightning, glow, fog, ice)
- [ ] VFX persistent i one-shot tryby dzialaja
- [ ] Toolbar przelacza narzedzia, panele kontekstowe wyswietlaja ustawienia
- [ ] Stan mapy (obraz, siatka, tokeny, FoW, VFX, viewport) przetrwa zamkniecie i ponowne otwarcie

### Non-Functional Requirements
- [ ] 60fps na mapach do 4000x4000px
- [ ] Zero CPU gdy idle (dirty-flag pattern, brak animacji)
- [ ] Zero zewnetrznych zaleznosci renderowania (bez Pixi.js)
- [ ] Canvas startuje niezawodnie — zero bialych ekranow i crashy
- [ ] Build przechodzi bez bledow po migracji
- [ ] Zero memory leaks (cleanup w useEffect, ImageBitmap.close())

### Quality Gates
- [ ] Zero importow `pixi.js` w codebase po migracji
- [ ] `pixi.js` usuniety z package.json
- [ ] Istniejace zapisane stany map laduja sie poprawnie (backward compatibility)

## Dependencies & Prerequisites

- Electron IPC `readImage` — bez zmian (see origin)
- Party Tracker / Bestiariusz `MapDropPayload` — bez zmian
- Canvas System (`InfiniteCanvas`, `CanvasWindow`, `useCanvasPersistence`) — bez zmian
- `types.ts` (`MapDisplayState`, `MapToken`, `MapDropPayload`) — bez zmian

## Risk Analysis & Mitigation

| Risk | Prawdopodobienstwo | Wplyw | Mitygacja |
|------|-------------------|-------|-----------|
| VFX 7+ instancji po 20 czasteczek moze lagowac na Canvas 2D | Niskie | Sredni | Object pooling (zero GC), pre-blurred sprites, skip frames jesli FPS < 30 |
| `ctx.filter = 'blur()'` per-frame jest wolny | Srednie | Niski | Pre-rendered blurred OffscreenCanvas sprites (blur raz przy init) |
| Offscreen canvas FoW 4000x4000 zajmuje ~64MB | Niskie | Niski | Akceptowalne dla Electron. Dodatkowy stroke buffer +64MB jesli potrzebny — max 2 offscreen |
| Hit testing tokenow O(n) | Bardzo niskie | Niski | 5-20 tokenow — squared distance bez sqrt, iteracja wystarczajaca |
| `toBlob()` zwraca null | Niskie | Niski | Graceful error handling, retry |
| HiDPI blurriness | Srednie | Sredni | `canvas.width = cssWidth * dpr` + `setTransform` z DPR factor |

## Outstanding Questions (from origin — all resolved)

- **Architektura warstw:** Jeden canvas, painter's algorithm. Dwie transformacje per frame: world-space (camera + DPR) i screen-space (DPR only).
- **Offscreen canvas FoW:** Pelna rozdzielczosc mapy. Restore przez `createImageBitmap` + `copy` compositing.
- **VFX wydajnosc:** 140 czasteczek per frame to trywialne. Object pooling eliminuje GC. Pre-blurred sprites eliminuja per-frame filter.
- **Token hit testing:** Squared distance, reverse iteration. Wystarczajace dla 5-20 tokenow.

## Sources & References

### Origin
- **Origin document:** [docs/brainstorms/2026-05-15-map-canvas2d-rewrite-requirements.md](docs/brainstorms/2026-05-15-map-canvas2d-rewrite-requirements.md) — Key decisions: Canvas 2D zamiast Pixi.js, offscreen canvas dla FoW, reczny hit testing, big bang migration.

### Internal References
- Typy i stan: `src/ui/tools/map-display/types.ts`
- Integracja canvas: `src/ui/canvas/InfiniteCanvas.tsx:63-70` (ToolContent switch)
- Full bleed: `src/ui/canvas/CanvasWindow.tsx:34`
- Persystencja: `src/ui/canvas/hooks/useCanvasPersistence.ts`
- Istniejaca implementacja Pixi: `src/ui/tools/map-display/hooks/` (5 hookow do zastapienia)

### Research References
- Canvas 2D dirty-flag render loop pattern
- `getCoalescedEvents()` API for smooth freehand drawing
- `globalCompositeOperation: 'destination-out'` for eraser/reveal pattern
- `createImageBitmap()` for off-thread image decoding
- `OffscreenCanvas` for pre-blurred VFX sprites
- Object pooling pattern for particle systems (zero GC allocation)
