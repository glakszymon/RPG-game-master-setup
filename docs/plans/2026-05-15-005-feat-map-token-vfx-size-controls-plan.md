---
title: "feat: Add token size controls and VFX cursor preview to map"
type: feat
status: active
date: 2026-05-15
---

# feat: Add token size controls and VFX cursor preview to map

## Overview

Dodanie kontroli rozmiaru tokenów (per-token suwak scale) oraz podglądu okręgu przy kursorze podczas stawiania tokenów i efektów VFX na mapie. Pozwala GM-owi wizualnie dopasować rozmiar postaci/potworów do skali mapy i precyzyjnie umieszczać efekty.

## Problem Statement / Motivation

Obecnie tokeny mają stały rozmiar (`TOKEN_RADIUS = 24`, scale zawsze 1) bez możliwości zmiany z UI. Przy różnych mapach (korytarz vs arena) ten sam rozmiar tokena jest nieadekwatny. Dodatkowo, stawiając VFX efekty, GM nie widzi ich rozmiaru przed kliknięciem — musi zgadywać, co prowadzi do wielokrotnego usuwania i ponownego umieszczania.

## Proposed Solution

1. **Per-token size slider** — w panelu tokenów (toolbar) każdy token na liście dostaje suwak scale (0.5–3.0), który modyfikuje `token.scale` w stanie i natychmiast zmienia rozmiar renderowanego tokena.
2. **Cursor preview circle** — w trybie VFX i Tokens wyświetlany jest okrąg wokół kursora o średnicy odpowiadającej rozmiarowi aktywnego elementu (VFX size lub token scale × TOKEN_RADIUS × 2).

## Technical Considerations

### Architektura

- `MapToken.scale` już istnieje w typach i jest uwzględniany w rendererze (`TOKEN_RADIUS * token.scale`) — trzeba jedynie dodać UI do jego modyfikacji
- Cursor preview wymaga śledzenia pozycji myszy w world-space i rysowania okręgu w odpowiedniej warstwie (UI overlay, rysowany po wszystkim innym)

### Implementacja

**Token size slider** (`MapDisplay.tsx` toolbar, panel Tokens ~linie 600-627):
- Dodaj slider `<input type="range" min="0.5" max="3" step="0.1">` przy każdym tokenie na liście
- `onChange` → `patchState({ tokens: tokens.map(t => t.id === id ? {...t, scale: val} : t) })`
- Wyświetl aktualną wartość scale obok suwaka

**Cursor preview circle** (`useCanvasRenderer.ts` lub nowy hook `useCursorPreview.ts`):
- Nowy state: `cursorWorldPos: {x, y} | null` — aktualizowany w `onMouseMove` po przeliczeniu `screenToWorld`
- Rysowany jako ostatnia warstwa (po UI overlay):
  - Okrąg stroke (biały/jasny, linia przerywana `setLineDash([6, 4])`, grubość `2 / zoom`)
  - Średnica: 
    - VFX tool: `vfxSettings.size`
    - Tokens tool: `TOKEN_RADIUS * 2 * currentTokenScale` (domyślny scale dla nowych tokenów, np. z dodatkowego suwaka "default size" lub ostatnio ustawiony scale)
- Ukrycie preview gdy kursor opuści canvas (`onMouseLeave → cursorWorldPos = null`)

**Pliki do modyfikacji:**
- `src/ui/tools/map-display/MapDisplay.tsx` — toolbar panel tokenów (suwak), mouse event handlers
- `src/ui/tools/map-display/hooks/useCanvasRenderer.ts` — rysowanie cursor preview circle
- `src/ui/tools/map-display/types.ts` — ewentualnie `defaultTokenScale` w state

### Wydajność

- Cursor preview wymaga przerysowania canvasa przy każdym ruchu myszy — obecnie canvas i tak przerysowuje się przez `requestAnimationFrame` w `useVfxRenderer`, więc dodanie jednego `arc()` jest pomijalnym kosztem
- Alternatywa: osobny canvas overlay wyłącznie dla cursora (unika przerysowywania warstw tła/FoW) — warto rozważyć jeśli będą problemy z wydajnością

### Bezpieczeństwo

- Brak ryzyk — feature czysto frontend, bez I/O

## Acceptance Criteria

- [ ] Każdy token na liście w panelu Tokens ma suwak scale (zakres 0.5–3.0, step 0.1)
- [ ] Zmiana suwaka natychmiast zmienia rozmiar tokena na mapie
- [ ] Scale tokena jest persystowany w stanie (przetrwa restart okna)
- [ ] W trybie VFX widać okrąg (stroke, przerywana linia) przy kursorze o średnicy = `vfxSettings.size`
- [ ] W trybie Tokens widać okrąg przy kursorze o średnicy = rozmiar nowego tokena
- [ ] Okrąg preview znika gdy kursor opuści canvas
- [ ] Okrąg skaluje się poprawnie przy zoom (linia o stałej grubości wizualnej)
- [ ] Hit testing tokenów uwzględnia zmieniony scale (już działa — `TOKEN_RADIUS * t.scale`)

## Success Metrics

- GM może dopasować rozmiar tokena do mapy bez edycji kodu
- GM widzi dokładny rozmiar efektu/tokena przed postawieniem — mniej prób i błędów

## Dependencies & Risks

- **Zależność:** Canvas 2D rewrite (plan 003) — jeśli rewrite jest w toku, ten feature powinien być implementowany na nowym kodzie, nie starym Pixi.js
- **Ryzyko:** Przerysowywanie canvasa przy każdym mousemove może obciążyć CPU na dużych mapach — mitygacja: dedykowany overlay canvas lub throttle do 30fps

## Sources & References

- Token renderer: `src/ui/tools/map-display/hooks/useTokenRenderer.ts:6` (`TOKEN_RADIUS`), `:179` (scale usage)
- VFX renderer: `src/ui/tools/map-display/hooks/useVfxRenderer.ts:96-131` (placement)
- Toolbar tokens panel: `src/ui/tools/map-display/MapDisplay.tsx:600-627`
- Types: `src/ui/tools/map-display/types.ts:16-25` (MapToken with scale field)
- VFX size control: `src/ui/tools/map-display/MapDisplay.tsx:481-494`
- Related plan: `docs/plans/2026-05-15-003-refactor-map-display-canvas2d-rewrite-plan.md`
