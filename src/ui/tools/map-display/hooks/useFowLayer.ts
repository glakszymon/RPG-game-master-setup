import { useEffect, useRef, useCallback } from 'react';
import { Graphics, RenderTexture, Sprite, Container, Application } from 'pixi.js';
import type { MapTool, BrushSettings } from '../types';

/** Helper to set cursor without ESLint tracing back to ref params */
function setCursor(el: HTMLElement, cursor: string) {
  el.style.cursor = cursor;
}

/**
 * useFowLayer — Fog of War via mask-based approach.
 *
 * Instead of using 'erase' blend mode (unreliable in Pixi v8 renderer.render()),
 * we use a standard alpha mask:
 *
 * - fogSprite: a solid black rectangle covering the map (the visual fog)
 * - maskRT: a RenderTexture used as the fog sprite's mask
 *   - White pixels (alpha=1) → fog is VISIBLE (hidden area)
 *   - Black pixels (alpha=0) → fog is INVISIBLE (revealed area)
 * - Reveal: paint black circles on maskRT
 * - Conceal: paint white circles on maskRT
 */
export function useFowLayer(
  appRef: React.RefObject<Application | null>,
  worldContainerRef: React.RefObject<Container | null>,
  mapWidth: number,
  mapHeight: number,
  activeTool: MapTool,
  brushSettings: BrushSettings,
  fowDataUrl: string | null,
  onFowChange: (dataUrl: string) => void,
) {
  const fogSpriteRef = useRef<Sprite | null>(null);
  const maskSpriteRef = useRef<Sprite | null>(null);
  const maskRtRef = useRef<RenderTexture | null>(null);
  const brushGfxRef = useRef<Graphics | null>(null);
  const isPaintingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Create / resize FoW layers ──
  useEffect(() => {
    const app = appRef.current;
    const worldContainer = worldContainerRef.current;
    if (!app || !app.renderer || !worldContainer || mapWidth === 0 || mapHeight === 0) return;

    // 1. Create the mask RenderTexture (white = fog visible)
    const maskRt = RenderTexture.create({
      width: mapWidth,
      height: mapHeight,
      antialias: false,
    });
    maskRtRef.current = maskRt;

    // Fill mask with white (full fog everywhere)
    const fill = new Graphics();
    fill.rect(0, 0, mapWidth, mapHeight).fill({ color: 0xffffff, alpha: 1 });
    app.renderer.render({ container: fill, target: maskRt, clear: true });
    fill.destroy();

    // 2. Create the mask sprite (displays the maskRT, used as mask source)
    const maskSprite = new Sprite(maskRt);
    worldContainer.addChild(maskSprite);
    maskSpriteRef.current = maskSprite;

    // 3. Create the fog sprite (solid black rect, visually the fog)
    const fogGfx = new Graphics();
    fogGfx.rect(0, 0, mapWidth, mapHeight).fill({ color: 0x000000, alpha: 1 });
    // Use a container to hold the fog graphics
    const fogContainer = new Container();
    fogContainer.addChild(fogGfx);

    const fogSprite = fogContainer as unknown as Sprite;
    fogContainer.alpha = 0.7;
    fogContainer.label = 'fow-layer';

    // Apply mask: maskSprite controls visibility of fogContainer
    fogContainer.mask = maskSprite;

    // Insert fog layer at position 2 (after map[0], grid[1])
    const insertIndex = Math.min(2, worldContainer.children.length - 1); // -1 because maskSprite already added
    worldContainer.addChildAt(fogContainer, insertIndex);
    fogSpriteRef.current = fogSprite;

    // 4. Brush graphics (reusable)
    const brushGfx = new Graphics();
    brushGfxRef.current = brushGfx;

    // 5. Load saved mask if exists
    if (fowDataUrl) {
      loadMaskFromDataUrl(app, maskRt, fowDataUrl);
    }

    return () => {
      fogContainer.destroy({ children: true });
      fogSpriteRef.current = null;
      maskSprite.destroy();
      maskSpriteRef.current = null;
      maskRt.destroy(true);
      maskRtRef.current = null;
      brushGfx.destroy();
      brushGfxRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- fowDataUrl intentionally excluded: only load on init
  }, [appRef, worldContainerRef, mapWidth, mapHeight]);

  // ── Debounced save ──
  const scheduleSave = useCallback(() => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      const app = appRef.current;
      if (!app || !maskRtRef.current) return;
      const canvas = app.renderer.extract.canvas(maskRtRef.current) as HTMLCanvasElement;
      const dataUrl = canvas.toDataURL('image/png');
      onFowChange(dataUrl);
    }, 500);
  }, [appRef, onFowChange]);

  // ── Paint a brush stamp at map-local coords ──
  const paintAt = useCallback((mapX: number, mapY: number) => {
    const maskRt = maskRtRef.current;
    const brushGfx = brushGfxRef.current;
    const app = appRef.current;
    if (!app || !maskRt || !brushGfx) return;

    const isReveal = activeTool === 'fow-reveal';
    const radius = brushSettings.size / 2;

    // Reveal → paint BLACK on mask (hide the fog in that area)
    // Conceal → paint WHITE on mask (show the fog in that area)
    const color = isReveal ? 0x000000 : 0xffffff;

    brushGfx.clear();
    brushGfx.circle(mapX, mapY, radius).fill({ color, alpha: 1 });

    app.renderer.render({ container: brushGfx, target: maskRt, clear: false });
  }, [appRef, activeTool, brushSettings.size]);

  // ── Interpolate between two points for smooth strokes ──
  const paintLine = useCallback((x0: number, y0: number, x1: number, y1: number) => {
    const dx = x1 - x0;
    const dy = y1 - y0;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const step = Math.max(brushSettings.size / 4, 2);
    const steps = Math.ceil(dist / step);

    for (let i = 0; i <= steps; i++) {
      const t = steps === 0 ? 0 : i / steps;
      paintAt(x0 + dx * t, y0 + dy * t);
    }
  }, [paintAt, brushSettings.size]);

  // ── Pointer event handlers ──
  useEffect(() => {
    const app = appRef.current;
    const worldContainer = worldContainerRef.current;
    const canvas = app?.renderer ? app.canvas : null;
    if (!canvas || !worldContainer) return;

    const isFowTool = activeTool === 'fow-reveal' || activeTool === 'fow-conceal';
    if (!isFowTool) return;

    const toMapCoords = (e: PointerEvent): { x: number; y: number } | null => {
      if (worldContainer.destroyed) return null;
      const rect = canvas.getBoundingClientRect();
      const canvasX = e.clientX - rect.left;
      const canvasY = e.clientY - rect.top;
      const mapX = (canvasX - worldContainer.x) / worldContainer.scale.x;
      const mapY = (canvasY - worldContainer.y) / worldContainer.scale.y;
      return { x: mapX, y: mapY };
    };

    const onPointerDown = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const pos = toMapCoords(e);
      if (!pos) return;
      isPaintingRef.current = true;
      canvas.setPointerCapture(e.pointerId);
      lastPosRef.current = pos;
      paintAt(pos.x, pos.y);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isPaintingRef.current) return;
      const pos = toMapCoords(e);
      if (!pos) return;
      const last = lastPosRef.current;
      if (last) {
        paintLine(last.x, last.y, pos.x, pos.y);
      } else {
        paintAt(pos.x, pos.y);
      }
      lastPosRef.current = pos;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isPaintingRef.current) return;
      isPaintingRef.current = false;
      canvas.releasePointerCapture(e.pointerId);
      lastPosRef.current = null;
      scheduleSave();
    };

    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);
    setCursor(canvas, 'crosshair');

    return () => {
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      setCursor(canvas, '');
    };
  }, [appRef, worldContainerRef, activeTool, paintAt, paintLine, scheduleSave]);

  // ── Reveal all / Conceal all ──
  const revealAll = useCallback(() => {
    const app = appRef.current;
    const maskRt = maskRtRef.current;
    if (!app || !maskRt) return;
    const gfx = new Graphics();
    gfx.rect(0, 0, maskRt.width, maskRt.height).fill({ color: 0x000000, alpha: 1 });
    app.renderer.render({ container: gfx, target: maskRt, clear: true });
    gfx.destroy();
    scheduleSave();
  }, [appRef, scheduleSave]);

  const concealAll = useCallback(() => {
    const app = appRef.current;
    const maskRt = maskRtRef.current;
    if (!app || !maskRt) return;
    const gfx = new Graphics();
    gfx.rect(0, 0, maskRt.width, maskRt.height).fill({ color: 0xffffff, alpha: 1 });
    app.renderer.render({ container: gfx, target: maskRt, clear: true });
    gfx.destroy();
    scheduleSave();
  }, [appRef, scheduleSave]);

  // Cleanup save timer
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return { revealAll, concealAll };
}

// ── Helper: load saved PNG mask into the mask RenderTexture ──
async function loadMaskFromDataUrl(
  app: Application,
  rt: RenderTexture,
  dataUrl: string,
) {
  try {
    const { Assets, Sprite: SpriteCls } = await import('pixi.js');
    const texture = await Assets.load(dataUrl);
    const tempSprite = new SpriteCls(texture);
    app.renderer.render({ container: tempSprite, target: rt, clear: true });
    tempSprite.destroy();
  } catch {
    // If loading fails, keep full fog
  }
}
