/*
 * InfiniteCanvas — main workspace component.
 *
 * Pannable, zoomable DOM container with windowed tools.
 * Composes: panzoom viewport, CanvasWindow instances, context menu,
 * minimap, and minimize tray.
 */

import { useCallback, useMemo, useState, useRef, useEffect, useLayoutEffect, memo } from 'react';
import { usePanZoom } from './hooks/usePanZoom';
import { canvasReducer, initialCanvasState } from './hooks/useCanvasState';
import { useUndoRedo } from './hooks/useUndoRedo';
import { useCanvasPersistence } from './hooks/useCanvasPersistence';
import { useViewportCulling } from './hooks/useViewportCulling';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useSpacePan } from './hooks/useSpacePan';
import { useFocusPresets } from './hooks/useFocusPresets';
import { CanvasBackground } from './CanvasBackground';
import { CanvasWindow } from './CanvasWindow';
import { CanvasContextMenu } from './ContextMenu';
import { Minimap } from './Minimap';
import { MinimizeTray } from './MinimizeTray';
import { PresetToolbar } from './PresetToolbar';
import { ShortcutsOverlay } from './ShortcutsOverlay';
import { CampaignSettings } from './CampaignSettings/CampaignSettings';
import type { ToolType, ViewportTransform, CampaignTimeState, WindowState } from './types';
import { PartyTracker } from '../tools/party-tracker';
import type { PartyTrackerState } from '../tools/party-tracker';
import styles from './InfiniteCanvas.module.css';
import type { MapDisplayState } from '../tools/map-display/types';
import { MapDisplay } from '../tools/map-display/MapDisplay';
import { Bestiary, EncounterSets } from '../tools/bestiary';
import type { BestiaryToolState, EncounterSetsToolState } from '../tools/bestiary';
import { TimeClock } from '../tools/time-clock';
import { TimeCalendar } from '../tools/time-calendar';
import { TimeSessionTimer, PinnedTimers } from '../tools/time-session-timer';
import { Soundboard } from '../tools/soundboard';
import type { SoundboardState } from '../tools/soundboard';
import { CombatTracker } from '../tools/combat-tracker';
import type { CombatTrackerState } from '../tools/combat-tracker';
import { Notepad } from '../tools/notepad';
import type { NotepadToolState } from '../tools/notepad/types';
import { PlayerView } from '../tools/player-view';
import type { PlayerViewState } from '../tools/player-view';
import { WeatherGenerator } from '../tools/weather-generator';
import type { WeatherGeneratorState } from '../tools/weather-generator';

/** Placeholder content for tools — will be replaced by actual tool components */
function ToolPlaceholder({ toolType }: { toolType: ToolType }) {
  return (
    <div style={{ padding: 8, color: 'var(--color-text-secondary)' }}>
      <p>{toolType} — content coming soon</p>
    </div>
  );
}

/** Render the correct tool component based on toolType */
const ToolContent = memo(function ToolContent({
  toolType,
  toolState,
  onToolStateChange,
  campaignId,
  timeState,
  onAdvanceTime,
  onSetTimeState,
  onLoadMapPreset,
  onCaptureMapState,
  allWindows,
}: {
  toolType: ToolType;
  toolState: unknown;
  onToolStateChange: (state: unknown) => void;
  campaignId: string;
  timeState?: CampaignTimeState;
  onAdvanceTime?: (minutes: number) => void;
  onSetTimeState?: (timeState: CampaignTimeState) => void;
  onLoadMapPreset?: (mapStateJson: string) => void;
  onCaptureMapState?: () => string | null;
  allWindows?: WindowState[];
}) {
  switch (toolType) {
    case 'combat-tracker':
      return (
        <CombatTracker
          toolState={toolState as CombatTrackerState | undefined}
          onToolStateChange={onToolStateChange}
          campaignId={campaignId}
        />
      );

    case 'party-tracker':
      return (
        <PartyTracker
          toolState={toolState as PartyTrackerState | undefined}
          onToolStateChange={onToolStateChange}
          campaignId={campaignId}
        />
      );
    
    case 'map-display':
    return (
      <MapDisplay
        toolState={toolState as MapDisplayState | undefined}
        onToolStateChange={onToolStateChange}
        campaignId={campaignId}
      />
    );

    case 'bestiary':
      return (
        <Bestiary
          toolState={toolState as BestiaryToolState | undefined}
          onToolStateChange={onToolStateChange}
          campaignId={campaignId}
        />
      );

    case 'encounter-sets':
      return (
        <EncounterSets
          toolState={toolState as EncounterSetsToolState | undefined}
          onToolStateChange={onToolStateChange}
          campaignId={campaignId}
        />
      );

    case 'time-clock':
      return (
        <TimeClock
          timeState={timeState!}
          onAdvanceTime={onAdvanceTime!}
          onSetTimeState={onSetTimeState!}
        />
      );

    case 'time-calendar':
      return (
        <TimeCalendar
          timeState={timeState!}
          onAdvanceTime={onAdvanceTime!}
          onSetTimeState={onSetTimeState!}
        />
      );

    case 'time-session-timer':
      return (
        <TimeSessionTimer
          timeState={timeState!}
          onAdvanceTime={onAdvanceTime!}
          onSetTimeState={onSetTimeState!}
        />
      );

    case 'soundboard':
      return (
        <Soundboard
          toolState={toolState as SoundboardState | undefined}
          onToolStateChange={onToolStateChange}
          campaignId={campaignId}
        />
      );

    case 'notepad':
      return (
        <Notepad
          toolState={toolState as NotepadToolState | undefined}
          onToolStateChange={onToolStateChange}
          campaignId={campaignId}
          onLoadMapPreset={onLoadMapPreset}
          onCaptureMapState={onCaptureMapState}
        />
      );

    case 'player-view':
      return (
        <PlayerView
          toolState={toolState as PlayerViewState | undefined}
          onToolStateChange={onToolStateChange}
          campaignId={campaignId}
          allWindows={allWindows}
        />
      );

    case 'weather-generator':
      return (
        <WeatherGenerator
          toolState={toolState as WeatherGeneratorState | undefined}
          onToolStateChange={onToolStateChange}
          timeState={timeState}
        />
      );

    default:
      return <ToolPlaceholder toolType={toolType} />;
  }
});

function InfiniteCanvas({ onBack, campaignId }: { onBack?: () => void; campaignId?: string }) {
  const { canvasRef, getTransform, setTransformCallback, zoomIn, zoomOut, resetView, panTo } = usePanZoom();

  const {
    state,
    dispatch,
    undo,
    redo,
    startCoalescing,
    endCoalescing,
  } = useUndoRedo(canvasReducer, initialCanvasState);

  // Convenience dispatchers
  const openWindow = useCallback(
    (toolType: ToolType, x: number, y: number) =>
      dispatch({ type: 'OPEN_WINDOW', toolType, x, y }),
    [dispatch],
  );
  const closeWindow = useCallback(
    (id: string) => dispatch({ type: 'CLOSE_WINDOW', id }),
    [dispatch],
  );
  const moveWindow = useCallback(
    (id: string, x: number, y: number) =>
      dispatch({ type: 'MOVE_WINDOW', id, x, y }),
    [dispatch],
  );
  const resizeWindow = useCallback(
    (id: string, x: number, y: number, width: number, height: number) =>
      dispatch({ type: 'RESIZE_WINDOW', id, x, y, width, height }),
    [dispatch],
  );
  const minimizeWindow = useCallback(
    (id: string) => dispatch({ type: 'MINIMIZE_WINDOW', id }),
    [dispatch],
  );
  const restoreWindow = useCallback(
    (id: string) => dispatch({ type: 'RESTORE_WINDOW', id }),
    [dispatch],
  );
  const focusWindow = useCallback(
    (id: string) => dispatch({ type: 'FOCUS_WINDOW', id }),
    [dispatch],
  );
  const togglePin = useCallback(
    (id: string) => dispatch({ type: 'TOGGLE_PIN', id }),
    [dispatch],
  );

  // Stable per-window onToolStateChange callbacks (avoids re-render cascade)
  // Use a ref-based factory so handlers never change identity.
  const dispatchRef = useRef(dispatch);
  useLayoutEffect(() => { dispatchRef.current = dispatch; });

  const toolStateHandlerCache = useRef(new Map<string, (s: unknown) => void>());
  const getToolStateHandler = useCallback((id: string) => {
    let handler = toolStateHandlerCache.current.get(id);
    if (!handler) {
      handler = (s: unknown) => dispatchRef.current({ type: 'UPDATE_TOOL_STATE', id, toolState: s });
      toolStateHandlerCache.current.set(id, handler);
    }
    return handler;
  }, []);

  useCanvasPersistence(state, dispatch, campaignId ?? 'default');

  // Stable time callbacks
  const advanceTimeHandler = useCallback(
    (minutes: number) => dispatch({ type: 'ADVANCE_TIME', minutes }),
    [dispatch],
  );
  const setTimeStateHandler = useCallback(
    (timeState: CampaignTimeState) => dispatch({ type: 'SET_TIME_STATE', timeState }),
    [dispatch],
  );

  // Listen for notepad date/event events → update campaign calendar
  const timeStateRef = useRef(state.timeState);
  useLayoutEffect(() => { timeStateRef.current = state.timeState; });
  useEffect(() => {
    const handleSetDate = (e: Event) => {
      const { day, month, year } = (e as CustomEvent).detail ?? {};
      if (day == null || month == null || year == null) return;
      const ts = timeStateRef.current;
      if (!ts) return;
      dispatch({ type: 'SET_TIME_STATE', timeState: { ...ts, currentDay: day, currentMonth: month, currentYear: year } });
    };
    const handleAddEvent = (e: Event) => {
      const { day, month, name, color } = (e as CustomEvent).detail ?? {};
      if (day == null || month == null || !name) return;
      const ts = timeStateRef.current;
      if (!ts) return;
      const holidays = [...(ts.calendar?.holidays ?? []), { day, month, name, color }];
      dispatch({ type: 'SET_TIME_STATE', timeState: { ...ts, calendar: { ...ts.calendar, holidays } } });
    };
    window.addEventListener('notepad:set-date', handleSetDate);
    window.addEventListener('notepad:add-event', handleAddEvent);
    return () => {
      window.removeEventListener('notepad:set-date', handleSetDate);
      window.removeEventListener('notepad:add-event', handleAddEvent);
    };
  }, [dispatch]);

  // Load map preset: find first open map-display window and apply preset state
  // Pending preset load ref (for when we auto-open a map window)
  const pendingPresetRef = useRef<string | null>(null);

  // Keep a ref to windows for stable callbacks
  const windowsRef = useRef(state.windows);
  useLayoutEffect(() => { windowsRef.current = state.windows; });

  const loadMapPresetHandler = useCallback(
    (mapStateJson: string) => {
      const mapWin = windowsRef.current.find(w => w.toolType === 'map-display');
      if (!mapWin) {
        // Auto-open a map-display window and queue the preset
        pendingPresetRef.current = mapStateJson;
        dispatchRef.current({ type: 'OPEN_WINDOW', toolType: 'map-display', x: 100, y: 100 });
        return;
      }
      // If map has existing content, confirm overwrite
      const hasContent = mapWin.toolState && (mapWin.toolState as { imagePath?: string }).imagePath;
      if (hasContent) {
        const confirmed = window.confirm('Load preset? This will overwrite the current map state.');
        if (!confirmed) return;
      }
      try {
        const presetState = JSON.parse(mapStateJson);
        dispatchRef.current({ type: 'UPDATE_TOOL_STATE', id: mapWin.id, toolState: presetState });
      } catch { /* invalid JSON, skip */ }
    },
    [],
  );

  // Apply pending preset when map window appears
  useEffect(() => {
    if (!pendingPresetRef.current) return;
    const mapWin = state.windows.find(w => w.toolType === 'map-display');
    if (mapWin) {
      try {
        const presetState = JSON.parse(pendingPresetRef.current);
        dispatch({ type: 'UPDATE_TOOL_STATE', id: mapWin.id, toolState: presetState });
      } catch { /* skip */ }
      pendingPresetRef.current = null;
    }
  }, [state.windows, dispatch]);

  // Capture current map state for saving presets
  const captureMapStateHandler = useCallback((): string | null => {
    const mapWin = windowsRef.current.find(w => w.toolType === 'map-display');
    if (!mapWin || !mapWin.toolState) return null;
    try {
      return JSON.stringify(mapWin.toolState);
    } catch { return null; }
  }, []);

  // Focus presets
  const {
    presets,
    savePreset,
    activatePreset,
    deletePreset,
    renamePreset,
    overwritePreset,
  } = useFocusPresets({ state, dispatch, getTransform, panTo, campaignId: campaignId ?? 'default' });

  // Shortcuts help overlay state
  const [showShortcuts, setShowShortcuts] = useState(false);

  // Campaign settings modal state
  const [showSettings, setShowSettings] = useState(false);

  // Keyboard shortcuts
  const shortcutHandlers = useMemo(
    () => ({
      undo,
      redo,
      zoomIn,
      zoomOut,
      zoomReset: resetView,
      helpPanel: () => setShowShortcuts((s) => !s),
      settings: () => setShowSettings((s) => !s),
      preset1: () => { const p = presets.filter((pr) => !pr.isAutoSave)[0]; if (p) activatePreset(p.id); },
      preset2: () => { const p = presets.filter((pr) => !pr.isAutoSave)[1]; if (p) activatePreset(p.id); },
      preset3: () => { const p = presets.filter((pr) => !pr.isAutoSave)[2]; if (p) activatePreset(p.id); },
      preset4: () => { const p = presets.filter((pr) => !pr.isAutoSave)[3]; if (p) activatePreset(p.id); },
      preset5: () => { const p = presets.filter((pr) => !pr.isAutoSave)[4]; if (p) activatePreset(p.id); },
      preset6: () => { const p = presets.filter((pr) => !pr.isAutoSave)[5]; if (p) activatePreset(p.id); },
      preset7: () => { const p = presets.filter((pr) => !pr.isAutoSave)[6]; if (p) activatePreset(p.id); },
      preset8: () => { const p = presets.filter((pr) => !pr.isAutoSave)[7]; if (p) activatePreset(p.id); },
      preset9: () => { const p = presets.filter((pr) => !pr.isAutoSave)[8]; if (p) activatePreset(p.id); },
    }),
    [undo, redo, zoomIn, zoomOut, resetView, presets, activatePreset, setShowShortcuts, setShowSettings],
  );
  useKeyboardShortcuts(shortcutHandlers);

  // Space+drag pan overlay
  const [spacePanActive, setSpacePanActive] = useState(false);
  const viewportRef = useRef<HTMLDivElement>(null);

  const handleSpaceActivate = useCallback(() => setSpacePanActive(true), []);
  const handleSpaceDeactivate = useCallback(() => setSpacePanActive(false), []);

  useSpacePan({
    viewportRef,
    onActivate: handleSpaceActivate,
    onDeactivate: handleSpaceDeactivate,
  });

  // Track viewport dimensions for minimap
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });

  // Track transform for minimap (re-render on change, debounced)
  const [minimapTransform, setMinimapTransform] = useState<ViewportTransform>({
    x: 0,
    y: 0,
    scale: 1,
  });

  // Track scale as state for render-safe reads
  const [currentScale, setCurrentScale] = useState(1);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const updateSize = () => {
      setViewportSize({ width: el.clientWidth, height: el.clientHeight });
    };
    updateSize();

    const observer = new ResizeObserver(updateSize);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Debounced minimap transform updates + viewport culling
  const { visibleIds, updateVisibility } = useViewportCulling(
    state.windows,
    getTransform,
    viewportSize.width,
    viewportSize.height,
  );

  useEffect(() => {
    let rafId: number;
    setTransformCallback((t) => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        setMinimapTransform({ ...t });
        setCurrentScale(t.scale);
        updateVisibility();
      });
    });
    return () => cancelAnimationFrame(rafId);
  }, [setTransformCallback, updateVisibility]);

  // Convert viewport (client) coords to canvas coords
  const viewportToCanvas = useCallback(
    (clientX: number, clientY: number) => {
      const vp = viewportRef.current;
      if (!vp) return { x: 0, y: 0 };
      const rect = vp.getBoundingClientRect();
      const t = getTransform();
      return {
        x: (clientX - rect.left - t.x) / t.scale,
        y: (clientY - rect.top - t.y) / t.scale,
      };
    },
    [getTransform],
  );

  // Context menu handler
  const handleOpenTool = useCallback(
    (toolType: ToolType, canvasX: number, canvasY: number) => {
      openWindow(toolType, canvasX, canvasY);
    },
    [openWindow],
  );

  // Compute z-indices: array order determines z, with unpinned base at 10, pinned at 1000
  const zIndices = new Map<string, number>();
  let unpinnedZ = 10;
  let pinnedZ = 1000;
  for (const win of state.windows) {
    if (win.pinned) {
      zIndices.set(win.id, pinnedZ++);
    } else {
      zIndices.set(win.id, unpinnedZ++);
    }
  }

  // Active window is the last non-minimized one
  const activeWindowId = [...state.windows]
    .reverse()
    .find((w) => !w.minimized)?.id;

  return (
    <div ref={viewportRef} className={styles.viewport}>
      <CanvasContextMenu onOpenTool={handleOpenTool} viewportToCanvas={viewportToCanvas}>
        <div className={styles.canvasOuter}>
          <div ref={canvasRef} className={styles.canvasInner}>
            <CanvasBackground type={state.background} />

            {state.windows
              .filter((win) => visibleIds.has(win.id) || win.toolType === 'soundboard')
              .map((win) => (
              <CanvasWindow
                key={win.id}
                window={win}
                scale={currentScale}
                zIndex={zIndices.get(win.id) ?? 10}
                isActive={win.id === activeWindowId}
                onMove={moveWindow}
                onResize={resizeWindow}
                onFocus={focusWindow}
                onClose={closeWindow}
                onMinimize={minimizeWindow}
                onTogglePin={togglePin}
                onDragStart={startCoalescing}
                onDragEnd={endCoalescing}
              >
                <ToolContent
                  toolType={win.toolType}
                  toolState={win.toolState}
                  onToolStateChange={getToolStateHandler(win.id)}
                  campaignId={campaignId ?? 'default'}
                  timeState={win.toolType.startsWith('time-') || win.toolType === 'weather-generator' ? state.timeState : undefined}
                  onAdvanceTime={win.toolType.startsWith('time-') ? advanceTimeHandler : undefined}
                  onSetTimeState={win.toolType.startsWith('time-') ? setTimeStateHandler : undefined}
                  onLoadMapPreset={win.toolType === 'notepad' ? loadMapPresetHandler : undefined}
                  onCaptureMapState={win.toolType === 'notepad' ? captureMapStateHandler : undefined}
                  allWindows={win.toolType === 'player-view' ? state.windows : undefined}
                />
              </CanvasWindow>
            ))}
          </div>
        </div>
      </CanvasContextMenu>

      {/* Viewport-fixed overlays */}
      {onBack && (
        <button className={styles.backBtn} onClick={onBack} title="Back to Hub">
          ← Hub
        </button>
      )}
      {spacePanActive && (
        <div className={styles.spacePanOverlay} />
      )}
      <MinimizeTray windows={state.windows} onRestore={restoreWindow} />
      <PresetToolbar
        presets={presets}
        onActivate={activatePreset}
        onSave={savePreset}
        onDelete={deletePreset}
        onRename={renamePreset}
        onOverwrite={overwritePreset}
      />
      {state.timeState && (
        <PinnedTimers
          timeState={state.timeState}
          onSetTimeState={setTimeStateHandler}
        />
      )}
      <Minimap
        windows={state.windows}
        viewport={minimapTransform}
        viewportWidth={viewportSize.width}
        viewportHeight={viewportSize.height}
        visible={true}
      />
      <ShortcutsOverlay open={showShortcuts} onOpenChange={setShowShortcuts} />
      <button
        className={styles.settingsBtn}
        onClick={() => setShowSettings(true)}
        title="Campaign Settings"
      >
        <span className="material-symbols-outlined">settings</span>
      </button>
      <CampaignSettings
        open={showSettings}
        onOpenChange={setShowSettings}
        campaignId={campaignId ?? 'default'}
        timeState={state.timeState}
        onSetTimeState={setTimeStateHandler}
        partyState={
          state.windows.find((w) => w.toolType === 'party-tracker')?.toolState as PartyTrackerState | undefined
        }
        onPartyStateChange={(newState) => {
          const ptWindow = state.windows.find((w) => w.toolType === 'party-tracker');
          if (ptWindow) {
            getToolStateHandler(ptWindow.id)(newState);
          }
        }}
      />
    </div>
  );
}

export { InfiniteCanvas };
