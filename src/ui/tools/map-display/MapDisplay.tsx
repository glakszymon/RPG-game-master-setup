import { useRef, useCallback, useEffect, useLayoutEffect, useState } from 'react';
import { useCanvasRenderer, screenToWorld } from './hooks/useCanvasRenderer';
import type { RenderContext } from './hooks/useCanvasRenderer';
import { drawGrid } from './hooks/useGridRenderer';
import { useFowRenderer } from './hooks/useFowRenderer';
import { useTokenRenderer, TOKEN_RADIUS } from './hooks/useTokenRenderer';
import { useVfxRenderer, VFX_PRESETS } from './hooks/useVfxRenderer';
import { DEFAULT_MAP_STATE } from './types';
import type { MapDisplayState, GridConfig, MapTool, MapToken, VfxSettings, VfxPreset } from './types';
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

  const stateRef = useRef(state);
  useLayoutEffect(() => { stateRef.current = state; });

  /** Patch state atomically — prevents imagePath loss from stale ref */
  const patchState = useCallback((patch: Partial<MapDisplayState>) => {
    const current = stateRef.current;
    const next = { ...current, ...patch };
    if (current.imagePath && !next.imagePath && !('imagePath' in patch)) {
      console.warn('[MapDisplay] patchState would erase imagePath — BLOCKED');
      next.imagePath = current.imagePath;
    }
    onToolStateChange(next);
  }, [onToolStateChange]);

  const [zoom, setZoom] = useState(state.viewport.zoom);
  const [mapImage, setMapImage] = useState<HTMLImageElement | null>(null);
  const [mapSize, setMapSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });

  /** Cursor world-space position for preview circle (null = cursor outside canvas) */
  const cursorWorldRef = useRef<{ x: number; y: number } | null>(null);

  // ── Viewport change handler ──
  const handleViewportChange = useCallback((vp: { x: number; y: number; zoom: number }) => {
    setZoom(vp.zoom);
    patchState({ viewport: vp });
  }, [patchState]);

  // ── Canvas renderer (Phase 1) ──
  const onDraw = useCallback((rc: RenderContext, time: number) => {
    // Grid (Phase 2)
    drawGrid(rc, stateRef.current.grid, mapSize.w, mapSize.h);
    // Tokens (Phase 4)
    tokenActions.drawTokens(rc);
    // FoW (Phase 3)
    fowActions.drawFow(rc);
    // VFX (Phase 5)
    vfxActions.drawVfx(rc, time);

    // ── Cursor preview circle ──
    const s = stateRef.current;
    const cursor = cursorWorldRef.current;
    const showPreview = cursor && (
      s.activeTool === 'vfx' ||
      s.activeTool === 'tokens' ||
      s.activeTool === 'fow-reveal' ||
      s.activeTool === 'fow-conceal'
    );
    if (showPreview) {
      const { ctx } = rc;
      let radius: number;
      if (s.activeTool === 'vfx') {
        radius = s.vfxSettings.size / 2;
      } else if (s.activeTool === 'fow-reveal' || s.activeTool === 'fow-conceal') {
        radius = s.brushSettings.size / 2;
      } else {
        // For tokens, show default new-token size (scale=1)
        radius = TOKEN_RADIUS;
      }

      ctx.save();
      ctx.beginPath();
      ctx.arc(cursor.x, cursor.y, radius, 0, Math.PI * 2);
      ctx.setLineDash([6 / rc.viewport.zoom, 4 / rc.viewport.zoom]);
      ctx.lineWidth = 2 / rc.viewport.zoom;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }, [mapSize.w, mapSize.h]); // fowActions, tokenActions, vfxActions are stable refs

  const renderer = useCanvasRenderer(
    canvasAreaRef,
    state.viewport,
    mapImage,
    onDraw,
    handleViewportChange,
  );

  // ── FoW (Phase 3) ──
  const handleFowChange = useCallback((dataUrl: string) => {
    patchState({ fowDataUrl: dataUrl });
  }, [patchState]);

  const fowActions = useFowRenderer(
    renderer,
    mapSize.w,
    mapSize.h,
    state.activeTool,
    state.brushSettings,
    state.fowDataUrl,
    handleFowChange,
  );

  // ── Tokens (Phase 4) ──
  const handleTokensChange = useCallback((newTokens: MapToken[]) => {
    patchState({ tokens: newTokens });
  }, [patchState]);

  const tokenActions = useTokenRenderer(
    renderer,
    state.tokens,
    state.activeTool,
    handleTokensChange,
  );

  // ── VFX (Phase 5) ──
  const handleVfxChange = useCallback((newVfx: typeof state.vfxInstances) => {
    patchState({ vfxInstances: newVfx });
  }, [patchState]);

  const vfxActions = useVfxRenderer(
    renderer,
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

  // ── Load map image ──
  const loadingImageRef = useRef(false);
  const loadImage = useCallback(async (filePath: string, shouldFit: boolean, signal?: { cancelled: boolean }): Promise<{ x: number; y: number; zoom: number } | null> => {
    if (loadingImageRef.current) return null;
    loadingImageRef.current = true;
    try {
      const dataUrl = await window.electronAPI?.dialog.readImage(filePath);
      if (!dataUrl || signal?.cancelled) return null;

      const img = new Image();
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error('Image load failed'));
        img.src = dataUrl;
      });

      if (signal?.cancelled) return null;

      setMapImage(img);
      setMapSize({ w: img.naturalWidth, h: img.naturalHeight });

      if (shouldFit) {
        const container = canvasAreaRef.current;
        if (container) {
          const cw = container.clientWidth;
          const ch = container.clientHeight;
          const scale = Math.min(cw / img.naturalWidth, ch / img.naturalHeight);
          const vp = {
            zoom: scale,
            x: (cw - img.naturalWidth * scale) / 2,
            y: (ch - img.naturalHeight * scale) / 2,
          };
          renderer.viewportRef.current = vp;
          setZoom(scale);
          renderer.markDirty();
          return vp;
        }
      }
      return null;
    } finally {
      loadingImageRef.current = false;
    }
  }, [renderer]);

  const loadImageRef = useRef(loadImage);
  useLayoutEffect(() => { loadImageRef.current = loadImage; });

  // Restore saved map on mount OR when imagePath changes externally (e.g. preset load)
  const prevImagePathRef = useRef<string | null>(state.imagePath);
  useEffect(() => {
    const signal = { cancelled: false };
    const imagePathChanged = state.imagePath !== prevImagePathRef.current;
    prevImagePathRef.current = state.imagePath;
    if (state.imagePath && (!mapImage || imagePathChanged)) {
      if (imagePathChanged) setMapImage(null);
      loadImageRef.current(state.imagePath, true, signal).then((vp) => {
      if (vp && !signal.cancelled) {
          patchState({ viewport: vp });
        }
      });
    } else if (!state.imagePath && mapImage) {
      // Image was removed (e.g. preset with no image)
      setMapImage(null);
    }
    return () => {
      signal.cancelled = true;
      loadingImageRef.current = false; // Allow next effect run to proceed (StrictMode)
    };
  }, [state.imagePath, mapImage, patchState]);

  // Mount-time validation: remove tokens whose instances no longer exist
  useEffect(() => {
    const validate = async () => {
      const api = window.electronAPI;
      if (!api) return;
      const instanceTokens = state.tokens.filter(t => t.sourceType === 'instance' && t.instanceId);
      if (instanceTokens.length === 0) return;
      const ids = instanceTokens.map(t => t.instanceId!);
      const validIds = await api.bestiary.validateInstanceIds(ids);
      const validSet = new Set(validIds);
      const orphans = instanceTokens.filter(t => !validSet.has(t.instanceId!));
      if (orphans.length > 0) {
        const orphanIds = new Set(orphans.map(t => t.id));
        patchState({ tokens: state.tokens.filter(t => !orphanIds.has(t.id)) });
      }
    };
    validate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // only on mount

  // File picker handler
  const handleLoadMap = useCallback(async () => {
    const filePath = await window.electronAPI?.dialog.openImageFile();
    if (!filePath) return;
    const vp = await loadImageRef.current(filePath, true);
    // Single atomic patchState with both imagePath and viewport
    patchState({ imagePath: filePath, ...(vp ? { viewport: vp } : {}) });
  }, [patchState]);

  // ── Drop handler (cross-tool: Party Tracker → Map) ──
  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const raw = e.dataTransfer.getData('application/json');
    if (!raw) return;
    try {
      const data = JSON.parse(raw) as Record<string, unknown>;

      // Block direct bestiary drops — must go through Encounter Sets
      if (data.type === 'bestiary-creature') {
        console.warn('[MapDisplay] Direct bestiary drop blocked. Use Encounter Sets.');
        return;
      }

      let sourceType: MapToken['sourceType'];
      let instanceId: string | undefined;
      switch (data.type) {
        case 'party-character': sourceType = 'party'; break;
        case 'encounter-instance': sourceType = 'instance'; instanceId = data.instanceId as string; break;
        case 'preset-template': sourceType = 'preset-template'; break;
        case 'combat-combatant': sourceType = (data.sourceType as MapToken['sourceType']) ?? 'manual'; break;
        default: return;
      }

      // Duplicate prevention: same instance can't be on map twice
      if (instanceId && state.tokens.some(t => t.instanceId === instanceId)) {
        console.warn('[MapDisplay] Instance already placed on map:', instanceId);
        return;
      }

      const container = canvasAreaRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const scaleX = container.clientWidth / rect.width;
      const scaleY = container.clientHeight / rect.height;
      const sx = (e.clientX - rect.left) * scaleX;
      const sy = (e.clientY - rect.top) * scaleY;
      const [mapX, mapY] = screenToWorld(sx, sy, renderer.viewportRef.current);

      const token: MapToken = {
        id: `token-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        sourceType,
        sourceId: (data.id as string) ?? '',
        instanceId,
        name: (data.name as string) ?? 'Unknown',
        avatarPath: (data.portraitPath as string | null) ?? null,
        x: mapX,
        y: mapY,
        scale: 1,
      };
      tokenActions.addTokenWithSync(token);
    } catch (err) {
      console.error('[MapDisplay] handleDrop — error:', err);
    }
  }, [tokenActions, renderer, state.tokens]);

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  }, []);

  // Add manual token at center of viewport
  const addManualToken = useCallback(() => {
    const container = canvasAreaRef.current;
    if (!container) return;

    const cx = container.clientWidth / 2;
    const cy = container.clientHeight / 2;
    const [mapX, mapY] = screenToWorld(cx, cy, renderer.viewportRef.current);

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
    tokenActions.addToken(token);
  }, [tokenActions, state.tokens.length, renderer]);

  // ── Zoom controls ──
  const applyZoom = useCallback((newZoom: number) => {
    const container = canvasAreaRef.current;
    if (!container || !mapImage) return;

    const clamped = Math.min(Math.max(newZoom, MIN_ZOOM), MAX_ZOOM);
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const mapW = mapImage.naturalWidth * clamped;
    const mapH = mapImage.naturalHeight * clamped;

    const vp = {
      zoom: clamped,
      x: (cw - mapW) / 2,
      y: (ch - mapH) / 2,
    };
    renderer.viewportRef.current = vp;
    setZoom(clamped);
    patchState({ viewport: vp });
    renderer.markDirty();
  }, [mapImage, renderer, patchState]);

  const fitToContainer = useCallback(() => {
    if (!mapImage) return;
    const container = canvasAreaRef.current;
    if (!container) return;

    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const scale = Math.min(cw / mapImage.naturalWidth, ch / mapImage.naturalHeight);
    applyZoom(scale);
  }, [mapImage, applyZoom]);

  const handleZoomIn = useCallback(() => applyZoom(zoom * 1.25), [zoom, applyZoom]);
  const handleZoomOut = useCallback(() => applyZoom(zoom / 1.25), [zoom, applyZoom]);
  const handleSlider = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    applyZoom(parseFloat(e.target.value));
  }, [applyZoom]);

  const zoomPercent = Math.round(zoom * 100);

  // ── Grid controls ──
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

  // Mark dirty when grid/state changes that affect rendering
  // Only track properties that aren't already triggering re-draw via onDraw deps
  useEffect(() => {
    renderer.markDirty();
  }, [state.grid, state.activeTool, state.brushSettings, renderer]);

  // Listen for instance deletion events and remove affected tokens
  useEffect(() => {
    const handler = (e: Event) => {
      const { instanceId } = (e as CustomEvent).detail as { instanceId: string };
      const filtered = state.tokens.filter(t => t.instanceId !== instanceId);
      if (filtered.length !== state.tokens.length) {
        patchState({ tokens: filtered });
      }
    };
    window.addEventListener('bestiary:instance-deleted', handler);
    return () => window.removeEventListener('bestiary:instance-deleted', handler);
  }, [state.tokens, patchState]);

  // ── Cursor tracking for preview circle (throttled via rAF) ──
  const cursorRafRef = useRef(0);
  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const container = canvasAreaRef.current;
    if (!container) return;
    const activeTool = stateRef.current.activeTool;
    if (activeTool !== 'vfx' && activeTool !== 'tokens' && activeTool !== 'fow-reveal' && activeTool !== 'fow-conceal') {
      if (cursorWorldRef.current !== null) {
        cursorWorldRef.current = null;
        renderer.markDirty();
      }
      return;
    }
    // Throttle: only update once per frame
    if (cursorRafRef.current) return;
    cursorRafRef.current = requestAnimationFrame(() => {
      cursorRafRef.current = 0;
      const rect = container.getBoundingClientRect();
      const scaleX = container.clientWidth / rect.width;
      const scaleY = container.clientHeight / rect.height;
      const sx = (e.clientX - rect.left) * scaleX;
      const sy = (e.clientY - rect.top) * scaleY;
      const [wx, wy] = screenToWorld(sx, sy, renderer.viewportRef.current);
      cursorWorldRef.current = { x: wx, y: wy };
      renderer.markDirty();
    });
  }, [renderer]);

  const handleCanvasMouseLeave = useCallback(() => {
    cursorWorldRef.current = null;
    renderer.markDirty();
  }, [renderer]);

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
                <button className={styles.fowActionBtn} onClick={fowActions.revealAll}>
                  Reveal All
                </button>
                <button className={styles.fowActionBtn} onClick={fowActions.concealAll}>
                  Conceal All
                </button>
              </div>
            )}

            {/* Tokens context */}
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
                          <div className={styles.tokenListRow}>
                            <span className={styles.tokenName}>{t.name}</span>
                            <button
                              className={styles.tokenRemoveBtn}
                              onClick={() => tokenActions.removeToken(t.id)}
                              title="Remove token"
                            >
                              ×
                            </button>
                          </div>
                          <div className={styles.tokenScaleRow}>
                            <input
                              className={styles.toolSlider}
                              type="range"
                              min={0.5}
                              max={3}
                              step={0.1}
                              value={t.scale}
                              onChange={(e) => {
                                const newScale = parseFloat(e.target.value);
                                patchState({
                                  tokens: state.tokens.map((tok) =>
                                    tok.id === t.id ? { ...tok, scale: newScale } : tok
                                  ),
                                });
                              }}
                            />
                            <span className={styles.tokenScaleLabel}>{t.scale.toFixed(1)}×</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </>
                )}
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

                {state.vfxInstances.length > 0 && (
                  <>
                    <div className={styles.toolDivider} />
                    <span className={styles.toolHint}>{state.vfxInstances.length} active effect(s)</span>
                    <button className={styles.fowActionBtn} onClick={vfxActions.clearAllVfx}>
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
        onMouseMove={handleCanvasMouseMove}
        onMouseLeave={handleCanvasMouseLeave}
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
      </div>
    </div>
  );
}
