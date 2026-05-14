import { useRef, useCallback, useEffect, useState } from 'react';
import { Sprite, Assets, Container } from 'pixi.js';
import { usePixiApp } from './hooks/usePixiApp';
import { useGridLayer } from './hooks/useGridLayer';
import { DEFAULT_MAP_STATE } from './types';
import type { MapDisplayState, GridConfig } from './types';
import styles from './MapDisplay.module.css';

interface MapDisplayProps {
  toolState: MapDisplayState | undefined;
  onToolStateChange: (state: MapDisplayState) => void;
  campaignId: string;
}

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 5;

export function MapDisplay({ toolState, onToolStateChange, campaignId: _campaignId }: MapDisplayProps) {
  const state = toolState ?? DEFAULT_MAP_STATE;
  const canvasAreaRef = useRef<HTMLDivElement | null>(null);
  const [appRef, isReady] = usePixiApp(canvasAreaRef);

  const worldRef = useRef<Container | null>(null);
  const mapSpriteRef = useRef<Sprite | null>(null);

  const stateRef = useRef(state);
  stateRef.current = state;

  const [zoom, setZoom] = useState(state.viewport.zoom);
  const [mapSize, setMapSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  // Grid overlay
  useGridLayer(worldRef.current, state.grid, mapSize.w, mapSize.h);

  // ── Helpers ──

  const applyZoom = useCallback((newZoom: number) => {
    const world = worldRef.current;
    const container = canvasAreaRef.current;
    if (!world || !container) return;

    const clamped = Math.min(Math.max(newZoom, MIN_ZOOM), MAX_ZOOM);
    const sprite = mapSpriteRef.current;
    if (!sprite) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const mapW = sprite.texture.width * clamped;
    const mapH = sprite.texture.height * clamped;

    world.scale.set(clamped);
    world.x = (cw - mapW) / 2;
    world.y = (ch - mapH) / 2;

    setZoom(clamped);
    onToolStateChange({
      ...stateRef.current,
      viewport: { x: world.x, y: world.y, zoom: clamped },
    });
  }, [onToolStateChange]);

  const fitToContainer = useCallback(() => {
    const sprite = mapSpriteRef.current;
    const container = canvasAreaRef.current;
    const world = worldRef.current;
    if (!sprite || !container || !world) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const iw = sprite.texture.width;
    const ih = sprite.texture.height;

    const scale = Math.min(cw / iw, ch / ih);

    world.scale.set(scale);
    world.x = (cw - iw * scale) / 2;
    world.y = (ch - ih * scale) / 2;

    setZoom(scale);
    onToolStateChange({
      ...stateRef.current,
      viewport: { x: world.x, y: world.y, zoom: scale },
    });
  }, [onToolStateChange]);

  // ── Initialize world container once Pixi is ready ──
  useEffect(() => {
    const app = appRef.current;
    if (!isReady || !app || worldRef.current) return;

    const world = new Container();
    app.stage.addChild(world);
    worldRef.current = world;
  }, [isReady, appRef]);

  // ── Load map image ──
  const loadImage = useCallback(async (filePath: string, shouldFit: boolean) => {
    const app = appRef.current;
    const world = worldRef.current;
    if (!app || !world) return;

    const dataUrl = await window.electronAPI?.dialog.readImage(filePath);
    if (!dataUrl) return;

    const texture = await Assets.load(dataUrl);

    if (mapSpriteRef.current) {
      mapSpriteRef.current.destroy();
    }

    const sprite = new Sprite(texture);
    world.addChildAt(sprite, 0);
    mapSpriteRef.current = sprite;
    setMapSize({ w: texture.width, h: texture.height });

    if (shouldFit) {
      fitToContainer();
    }
  }, [appRef, fitToContainer]);

  // Restore saved map on mount (once Pixi + world are ready)
  useEffect(() => {
    if (state.imagePath && isReady && worldRef.current && !mapSpriteRef.current) {
      loadImage(state.imagePath, true);
    }
  }, [state.imagePath, isReady, loadImage]);

  // File picker handler
  const handleLoadMap = useCallback(async () => {
    const filePath = await window.electronAPI?.dialog.openImageFile();
    if (!filePath) return;

    await loadImage(filePath, true);
    onToolStateChange({ ...stateRef.current, imagePath: filePath });
  }, [loadImage, onToolStateChange]);

  // ── Pan (middle mouse drag) ──
  useEffect(() => {
    const canvas = appRef.current?.canvas;
    if (!isReady || !canvas) return;

    const onWheel = (e: WheelEvent) => { e.preventDefault(); };

    let isPanning = false;
    let lastX = 0;
    let lastY = 0;

    const onPointerDown = (e: PointerEvent) => {
      if (e.button === 1) {
        isPanning = true;
        lastX = e.clientX;
        lastY = e.clientY;
        canvas.setPointerCapture(e.pointerId);
        e.preventDefault();
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isPanning) return;
      const world = worldRef.current;
      if (!world) return;

      world.x += e.clientX - lastX;
      world.y += e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isPanning) return;
      isPanning = false;
      canvas.releasePointerCapture(e.pointerId);

      const world = worldRef.current;
      if (world) {
        onToolStateChange({
          ...stateRef.current,
          viewport: { x: world.x, y: world.y, zoom: world.scale.x },
        });
      }
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);

    return () => {
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
    };
  }, [isReady, appRef, onToolStateChange]);

  // ── Control handlers ──
  const handleZoomIn = useCallback(() => applyZoom(zoom * 1.25), [zoom, applyZoom]);
  const handleZoomOut = useCallback(() => applyZoom(zoom / 1.25), [zoom, applyZoom]);
  const handleSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    applyZoom(parseFloat(e.target.value));
  }, [applyZoom]);

  const zoomPercent = Math.round(zoom * 100);

  const updateGrid = useCallback((patch: Partial<GridConfig>) => {
    const newGrid = { ...stateRef.current.grid, ...patch };
    onToolStateChange({ ...stateRef.current, grid: newGrid });
  }, [onToolStateChange]);

  const handleGridTypeChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    updateGrid({ type: e.target.value as GridConfig['type'] });
  }, [updateGrid]);

  const handleCellSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!Number.isNaN(val) && val > 0) updateGrid({ cellSize: val });
  }, [updateGrid]);

  const handleGridOpacityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    updateGrid({ opacity: parseFloat(e.target.value) });
  }, [updateGrid]);

  const hasImage = Boolean(state.imagePath);

  return (
    <div className={styles.wrapper}>
      {/* ── Left toolbar ── */}
      {hasImage && (
        <div className={styles.toolbar}>
          {/* Zoom section */}
          <div className={styles.toolSection}>
            <span className={styles.sectionLabel}>Zoom</span>
            <button className={styles.toolBtn} onClick={handleZoomIn} title="Zoom in">+</button>
            <button className={styles.toolBtn} onClick={handleZoomOut} title="Zoom out">−</button>
            <button className={styles.toolBtn} onClick={fitToContainer} title="Fit to window">⊡</button>
            <input
              className={styles.verticalSlider}
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={handleSlider}
            />
            <span className={styles.toolValue}>{zoomPercent}%</span>
          </div>

          <div className={styles.toolDivider} />

          {/* Grid section */}
          <div className={styles.toolSection}>
            <span className={styles.sectionLabel}>Grid</span>
            <select
              className={styles.toolSelect}
              value={state.grid.type}
              onChange={handleGridTypeChange}
            >
              <option value="none">Off</option>
              <option value="square">Sq</option>
              <option value="hex">Hex</option>
            </select>
            {state.grid.type !== 'none' && (
              <>
                <input
                  className={styles.toolInput}
                  type="number"
                  min={16}
                  max={512}
                  value={state.grid.cellSize}
                  onChange={handleCellSizeChange}
                  title="Cell size"
                />
                <input
                  className={styles.verticalSlider}
                  type="range"
                  min={0.05}
                  max={1}
                  step={0.05}
                  value={state.grid.opacity}
                  onChange={handleGridOpacityChange}
                  title="Grid opacity"
                />
              </>
            )}
          </div>

          <div className={styles.toolDivider} />

          {/* Load new map */}
          <div className={styles.toolSection}>
            <button className={styles.toolBtn} onClick={handleLoadMap} title="Load new map">
              📁
            </button>
          </div>
        </div>
      )}

      {/* ── Canvas area ── */}
      <div className={styles.canvasArea} ref={canvasAreaRef}>
        {!hasImage && (
          <button className={styles.loadButton} onClick={handleLoadMap}>
            Load Map
          </button>
        )}
      </div>
    </div>
  );
}
