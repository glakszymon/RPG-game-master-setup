import { useRef, useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { Sprite, Assets, Container } from 'pixi.js';
import { usePixiApp } from './hooks/usePixiApp';
import { useGridLayer } from './hooks/useGridLayer';
import { useFowLayer } from './hooks/useFowLayer';
import { useTokenLayer } from './hooks/useTokenLayer';
import { useVfxLayer, VFX_PRESETS } from './hooks/useVfxLayer';
import { DEFAULT_MAP_STATE } from './types';
import type { MapDisplayState, GridConfig, MapTool, MapToken, MapDropPayload, VfxSettings } from './types';
import type { VfxInstance, VfxPreset } from './hooks/useVfxLayer';
import styles from './MapDisplay.module.css';

interface MapDisplayProps {
  toolState: MapDisplayState | undefined;
  onToolStateChange: (state: MapDisplayState) => void;
  campaignId: string;
}

const MIN_ZOOM = 0.05;
const MAX_ZOOM = 5;

export function MapDisplay({ toolState, onToolStateChange }: MapDisplayProps) {
  const state: MapDisplayState = { ...DEFAULT_MAP_STATE, ...toolState };
  const canvasAreaRef = useRef<HTMLDivElement | null>(null);
  const [appRef, isReady] = usePixiApp(canvasAreaRef);

  const worldRef = useRef<Container | null>(null);
  const mapSpriteRef = useRef<Sprite | null>(null);

  const stateRef = useRef(state);
  useLayoutEffect(() => {
    stateRef.current = state;
  });

  /** Patch state atomically — prevents imagePath loss from stale ref */
  const patchState = useCallback((patch: Partial<MapDisplayState>) => {
    const current = stateRef.current;
    const next = { ...current, ...patch };
    // Safety: never silently erase imagePath if it existed
    if (current.imagePath && !next.imagePath && !('imagePath' in patch)) {
      console.warn('[MapDisplay] patchState would erase imagePath — BLOCKED');
      next.imagePath = current.imagePath;
    }
    onToolStateChange(next);
  }, [onToolStateChange]);

  const [zoom, setZoom] = useState(state.viewport.zoom);
  const [mapSize, setMapSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  // Grid overlay
  useGridLayer(worldRef, state.grid, mapSize.w, mapSize.h);

  // FoW overlay
  const handleFowChange = useCallback((dataUrl: string) => {
    patchState({ fowDataUrl: dataUrl });
  }, [patchState]);

  const { revealAll, concealAll } = useFowLayer(
    appRef,
    worldRef,
    mapSize.w,
    mapSize.h,
    state.activeTool,
    state.brushSettings,
    state.fowDataUrl,
    handleFowChange,
  );

  // Token layer
  const handleTokensChange = useCallback((newTokens: MapToken[]) => {
    patchState({ tokens: newTokens });
  }, [patchState]);

  const { addToken, addTokenWithSync, removeToken } = useTokenLayer(
    appRef,
    worldRef,
    state.tokens,
    state.activeTool,
    handleTokensChange,
  );

  // VFX layer
  const handleVfxChange = useCallback((newVfx: VfxInstance[]) => {
    patchState({ vfxInstances: newVfx });
  }, [patchState]);

  const { clearAllVfx } = useVfxLayer(
    appRef,
    worldRef,
    state.vfxInstances,
    state.activeTool,
    state.vfxSettings.selectedPreset,
    state.vfxSettings.size,
    state.vfxSettings.mode,
    state.vfxSettings.duration,
    handleVfxChange,
  );

  const updateVfxSettings = useCallback((patch: Partial<VfxSettings>) => {
    patchState({
      vfxSettings: { ...stateRef.current.vfxSettings, ...patch },
    });
  }, [patchState]);

  // ── Drop handler (cross-tool: Party Tracker → Map) ──
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/json');
    console.log('[MapDisplay] handleDrop — raw:', raw);
    if (!raw) return;
    try {
      const data = JSON.parse(raw) as MapDropPayload;
    console.log('[MapDisplay] handleDrop — parsed:', data.type, data.name);

      let sourceType: MapToken['sourceType'];
      switch (data.type) {
        case 'party-character':
          sourceType = 'party';
          break;
        case 'bestiary-creature':
          sourceType = 'bestiary';
          break;
        default:
          return; // Unknown drop type — ignore
      }

      const world = worldRef.current;
      const container = canvasAreaRef.current;
      if (!world || world.destroyed || !container) return;

      const rect = container.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const mapX = (cx - world.x) / world.scale.x;
      const mapY = (cy - world.y) / world.scale.y;

      const token: MapToken = {
        id: `token-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sourceType,
        sourceId: data.id,
        name: data.name,
        avatarPath: data.portraitPath ?? null,
        x: mapX,
        y: mapY,
        scale: 1,
      };
      console.log('[MapDisplay] handleDrop — adding token:', token.name, 'at', mapX, mapY);
      addTokenWithSync(token);
    } catch (err) {
      console.error('[MapDisplay] handleDrop — error:', err);
    }
  }, [addTokenWithSync]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // Add manual token at center of viewport
  const addManualToken = useCallback(() => {
    const world = worldRef.current;
    const container = canvasAreaRef.current;
    if (!world || world.destroyed || !container) return;

    const cx = container.clientWidth / 2;
    const cy = container.clientHeight / 2;
    const mapX = (cx - world.x) / world.scale.x;
    const mapY = (cy - world.y) / world.scale.y;

    const name = `Token ${state.tokens.length + 1}`;
    const token: MapToken = {
      id: `token-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      sourceType: 'manual',
      sourceId: '',
      name,
      avatarPath: null,
      x: mapX,
      y: mapY,
      scale: 1,
    };
    addToken(token);
  }, [addToken, state.tokens.length]);

  // ── Helpers ──

  const applyZoom = useCallback((newZoom: number) => {
    const world = worldRef.current;
    const container = canvasAreaRef.current;
    if (!world || !container) return;

    const clamped = Math.min(Math.max(newZoom, MIN_ZOOM), MAX_ZOOM);
    const sprite = mapSpriteRef.current;
    if (!sprite || sprite.destroyed) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const mapW = sprite.texture.width * clamped;
    const mapH = sprite.texture.height * clamped;

    world.scale.set(clamped);
    world.x = (cw - mapW) / 2;
    world.y = (ch - mapH) / 2;

    setZoom(clamped);
    patchState({
      viewport: { x: world.x, y: world.y, zoom: clamped },
    });
  }, [patchState]);

  const fitToContainer = useCallback(() => {
    const sprite = mapSpriteRef.current;
    const container = canvasAreaRef.current;
    const world = worldRef.current;
    if (!sprite || sprite.destroyed || !container || !world || world.destroyed) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const iw = sprite.texture.width;
    const ih = sprite.texture.height;

    const scale = Math.min(cw / iw, ch / ih);

    world.scale.set(scale);
    world.x = (cw - iw * scale) / 2;
    world.y = (ch - ih * scale) / 2;

    setZoom(scale);
    patchState({
      viewport: { x: world.x, y: world.y, zoom: scale },
    });
  }, [patchState]);

  // Ref to break loadImage → fitToContainer → patchState dependency chain
  const fitToContainerRef = useRef(fitToContainer);
  useLayoutEffect(() => { fitToContainerRef.current = fitToContainer; });

  // ── Initialize world container once Pixi is ready ──
  useEffect(() => {
    const app = appRef.current;
    if (!isReady || !app) return;

    // Check if existing world is still valid (strict mode may have destroyed it)
    if (worldRef.current && !worldRef.current.destroyed) return;

    const world = new Container();
    world.label = 'world';
    app.stage.addChild(world);
    worldRef.current = world;
    // Reset map sprite ref since old one was destroyed with previous world
    mapSpriteRef.current = null;

    // No cleanup — world is destroyed when app is destroyed.
    // Nulling refs here causes cascading restore effects in strict mode.
  }, [isReady, appRef]);

  // ── Load map image ──
  const loadingImageRef = useRef(false);
  const loadImage = useCallback(async (filePath: string, shouldFit: boolean, signal?: { cancelled: boolean }) => {
    if (loadingImageRef.current) return;
    loadingImageRef.current = true;
    try {
      const app = appRef.current;
      const world = worldRef.current;
      if (!app || !world || world.destroyed) return;

      const dataUrl = await window.electronAPI?.dialog.readImage(filePath);
      if (!dataUrl || signal?.cancelled) return;

      const texture = await Assets.load(dataUrl);
      if (world.destroyed || signal?.cancelled) return;
      if (mapSpriteRef.current) {
        mapSpriteRef.current.destroy();
      }

      const sprite = new Sprite(texture);
      world.addChildAt(sprite, 0);
      mapSpriteRef.current = sprite;
      setMapSize({ w: texture.width, h: texture.height });

      if (shouldFit) {
        fitToContainerRef.current();
      }
    } finally {
      loadingImageRef.current = false;
    }
  }, [appRef]);

  // Ref to break restore/handler dependency on loadImage identity
  const loadImageRef = useRef(loadImage);
  useLayoutEffect(() => { loadImageRef.current = loadImage; });

  // Restore saved map on mount (once Pixi + world are ready)
  useEffect(() => {
    const signal = { cancelled: false };
    if (state.imagePath && isReady && worldRef.current && !mapSpriteRef.current) {
      loadImageRef.current(state.imagePath, true, signal);
    }
    return () => { signal.cancelled = true; };
  }, [state.imagePath, isReady]);

  // File picker handler
  const handleLoadMap = useCallback(async () => {
    const filePath = await window.electronAPI?.dialog.openImageFile();
    if (!filePath) return;

    await loadImageRef.current(filePath, true);
    patchState({ imagePath: filePath });
  }, [patchState]);

  // ── Pan (middle mouse drag) ──
  useEffect(() => {
    const canvas = appRef.current?.renderer ? appRef.current.canvas : null;
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
      if (!world || world.destroyed) return;

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
      if (world && !world.destroyed) {
        patchState({
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
  }, [isReady, appRef, patchState]);

  // ── Control handlers ──
  const handleZoomIn = useCallback(() => applyZoom(zoom * 1.25), [zoom, applyZoom]);
  const handleZoomOut = useCallback(() => applyZoom(zoom / 1.25), [zoom, applyZoom]);
  const handleSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    applyZoom(parseFloat(e.target.value));
  }, [applyZoom]);

  const zoomPercent = Math.round(zoom * 100);

  const updateGrid = useCallback((patch: Partial<GridConfig>) => {
    const newGrid = { ...stateRef.current.grid, ...patch };
    patchState({ grid: newGrid });
  }, [patchState]);

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

  // ── Tool switching ──
  const setActiveTool = useCallback((tool: MapTool) => {
    patchState({ activeTool: tool });
  }, [patchState]);

  const handleBrushSizeChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    if (!Number.isNaN(val) && val > 0) {
      patchState({
        brushSettings: { ...stateRef.current.brushSettings, size: val },
      });
    }
  }, [patchState]);

  const hasImage = Boolean(state.imagePath);
  const isFowTool = state.activeTool === 'fow-reveal' || state.activeTool === 'fow-conceal';

  return (
    <div className={styles.wrapper}>
      {/* ── Left toolbar (GIMP-style) ── */}
      {hasImage && (
        <div className={styles.toolbar}>
          {/* ── Icon grid (top) ── */}
          <div className={styles.iconGrid}>
            {/* Move / Pan */}
            <button
              className={`${styles.iconBtn} ${state.activeTool === 'navigate' ? styles.iconBtnActive : ''}`}
              onClick={() => setActiveTool('navigate')}
              title="Navigate (pan &amp; zoom)"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2v12M2 8h12M8 2l-2 2M8 2l2 2M8 14l-2-2M8 14l2-2M2 8l2-2M2 8l2 2M14 8l-2-2M14 8l-2 2"/>
              </svg>
            </button>
            {/* Eye open — reveal fog */}
            <button
              className={`${styles.iconBtn} ${state.activeTool === 'fow-reveal' ? styles.iconBtnActive : ''}`}
              onClick={() => setActiveTool('fow-reveal')}
              title="Reveal fog (erase)"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/>
                <circle cx="8" cy="8" r="2"/>
              </svg>
            </button>
            {/* Eye closed — conceal fog */}
            <button
              className={`${styles.iconBtn} ${state.activeTool === 'fow-conceal' ? styles.iconBtnActive : ''}`}
              onClick={() => setActiveTool('fow-conceal')}
              title="Conceal (paint fog)"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/>
                <path d="M3 3l10 10"/>
              </svg>
            </button>
            {/* Image / load map */}
            <button
              className={styles.iconBtn}
              onClick={handleLoadMap}
              title="Load map image"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="12" height="12" rx="1"/>
                <circle cx="5.5" cy="5.5" r="1.5"/>
                <path d="M14 11l-3-3-4 4-2-2-3 3"/>
              </svg>
            </button>
            {/* Token tool */}
            <button
              className={`${styles.iconBtn} ${state.activeTool === 'tokens' ? styles.iconBtnActive : ''}`}
              onClick={() => setActiveTool('tokens')}
              title="Tokens (drag &amp; drop)"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="6" r="3"/>
                <path d="M3 14c0-2.8 2.2-5 5-5s5 2.2 5 5"/>
              </svg>
            </button>
            {/* VFX tool */}
            <button
              className={`${styles.iconBtn} ${state.activeTool === 'vfx' ? styles.iconBtnActive : ''}`}
              onClick={() => setActiveTool('vfx')}
              title="VFX effects"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M8 2l1.5 4.5L14 8l-4.5 1.5L8 14l-1.5-4.5L2 8l4.5-1.5z"/>
              </svg>
            </button>
          </div>

          <div className={styles.toolDivider} />

          {/* ── Context panel (below icons, depends on active tool) ── */}
          <div className={styles.contextPanel}>

            {/* Navigate context */}
            {state.activeTool === 'navigate' && (
              <div className={styles.toolSection}>
                <span className={styles.sectionLabel}>Navigate</span>
                <span className={styles.toolHint}>Middle-click drag to pan</span>
                <span className={styles.toolHint}>Use zoom controls below</span>
              </div>
            )}

            {/* FoW context */}
            {isFowTool && (
              <div className={styles.toolSection}>
                <span className={styles.sectionLabel}>
                  {state.activeTool === 'fow-reveal' ? 'Reveal Fog' : 'Conceal Fog'}
                </span>
                <label className={styles.toolLabel}>
                  Brush Size
                  <input
                    className={styles.toolInput}
                    type="number"
                    min={4}
                    max={200}
                    value={state.brushSettings.size}
                    onChange={handleBrushSizeChange}
                  />
                </label>
                <label className={styles.toolLabel}>
                  <input
                    className={styles.toolSlider}
                    type="range"
                    min={4}
                    max={200}
                    step={1}
                    value={state.brushSettings.size}
                    onChange={handleBrushSizeChange}
                  />
                </label>
                <div className={styles.toolDivider} />
                <button className={styles.fowActionBtn} onClick={revealAll}>
                  Reveal All
                </button>
                <button className={styles.fowActionBtn} onClick={concealAll}>
                  Conceal All
                </button>
              </div>
            )}

            {/* VFX context */}
            {state.activeTool === 'vfx' && (
              <div className={styles.toolSection}>
                <span className={styles.sectionLabel}>VFX Effects</span>
                <span className={styles.toolHint}>Click on map to place effect</span>

                <label className={styles.toolLabel}>
                  Preset
                  <select
                    className={styles.toolSelect}
                    value={state.vfxSettings.selectedPreset}
                    onChange={(e) => updateVfxSettings({ selectedPreset: e.target.value as VfxPreset })}
                  >
                    {VFX_PRESETS.map((p) => (
                      <option key={p.id} value={p.id}>{p.icon} {p.label}</option>
                    ))}
                  </select>
                </label>

                <label className={styles.toolLabel}>
                  Size
                  <input
                    className={styles.toolInput}
                    type="number"
                    min={20}
                    max={400}
                    value={state.vfxSettings.size}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!Number.isNaN(v) && v > 0) updateVfxSettings({ size: v });
                    }}
                  />
                </label>

                <label className={styles.toolLabel}>
                  Mode
                  <select
                    className={styles.toolSelect}
                    value={state.vfxSettings.mode}
                    onChange={(e) => updateVfxSettings({ mode: e.target.value as 'one-shot' | 'persistent' })}
                  >
                    <option value="persistent">Persistent</option>
                    <option value="one-shot">One-shot</option>
                  </select>
                </label>

                {state.vfxSettings.mode === 'one-shot' && (
                  <label className={styles.toolLabel}>
                    Duration (s)
                    <input
                      className={styles.toolInput}
                      type="number"
                      min={0.5}
                      max={30}
                      step={0.5}
                      value={state.vfxSettings.duration}
                      onChange={(e) => {
                        const v = parseFloat(e.target.value);
                        if (!Number.isNaN(v) && v > 0) updateVfxSettings({ duration: v });
                      }}
                    />
                  </label>
                )}

                {state.vfxInstances.length > 0 && (
                  <>
                    <div className={styles.toolDivider} />
                    <span className={styles.toolHint}>{state.vfxInstances.length} active effect(s)</span>
                    <button className={styles.fowActionBtn} onClick={clearAllVfx}>
                      Clear All VFX
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* ── Grid settings (pushed to bottom) ── */}
          <div className={styles.gridSectionBottom}>
            <div className={styles.toolDivider} />
            <div className={styles.toolSection}>
            <span className={styles.sectionLabel}>Grid</span>
            <select
              className={styles.toolSelect}
              value={state.grid.type}
              onChange={handleGridTypeChange}
            >
              <option value="none">Off</option>
              <option value="square">Square</option>
              <option value="hex">Hex</option>
            </select>
            {state.grid.type !== 'none' && (
              <>
                <label className={styles.toolLabel}>
                  Cell Size
                  <input
                    className={styles.toolInput}
                    type="number"
                    min={16}
                    max={512}
                    value={state.grid.cellSize}
                    onChange={handleCellSizeChange}
                  />
                </label>
                <label className={styles.toolLabel}>
                  Opacity
                  <input
                    className={styles.toolSlider}
                    type="range"
                    min={0.05}
                    max={1}
                    step={0.05}
                    value={state.grid.opacity}
                    onChange={handleGridOpacityChange}
                  />
                </label>
              </>
            )}
          </div>
          </div>
        </div>
      )}

      {/* ── Canvas area ── */}
      <div
        className={styles.canvasArea}
        ref={canvasAreaRef}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        {!hasImage && (
          <button className={styles.loadButton} onClick={handleLoadMap}>
            Load Map
          </button>
        )}

        {/* ── Zoom controls (bottom-right overlay) ── */}
        {hasImage && (
          <div className={styles.zoomControls}>
            <button className={styles.zoomBtn} onClick={handleZoomOut}>−</button>
            <input
              className={styles.zoomSlider}
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={0.01}
              value={zoom}
              onChange={handleSlider}
            />
            <button className={styles.zoomBtn} onClick={handleZoomIn}>+</button>
            <span className={styles.zoomLabel}>{zoomPercent}%</span>
            <button className={styles.zoomBtn} onClick={fitToContainer} title="Fit to window">⊡</button>
          </div>
            )}

            {/* Token context */}
            {state.activeTool === 'tokens' && (
              <div className={styles.toolSection}>
                <span className={styles.sectionLabel}>Tokens</span>
                <span className={styles.toolHint}>Drag from Party Tracker or add manually</span>
                <button className={styles.fowActionBtn} onClick={addManualToken}>
                  + Add Token
                </button>
                {state.tokens.length > 0 && (
                  <>
                    <div className={styles.toolDivider} />
                    <div className={styles.tokenList}>
                      {state.tokens.map((t) => (
                        <div key={t.id} className={styles.tokenListItem}>
                          <span className={styles.tokenName}>{t.name}</span>
                          <button
                            className={styles.tokenRemoveBtn}
                            onClick={() => removeToken(t.id)}
                            title="Remove token"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
    </div>
  );
}
