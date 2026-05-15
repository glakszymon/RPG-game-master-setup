/*
 * InfiniteCanvas — main workspace component.
 *
 * Pannable, zoomable DOM container with windowed tools.
 * Composes: panzoom viewport, CanvasWindow instances, context menu,
 * minimap, and minimize tray.
 */

import { useCallback, useMemo, useState, useRef, useEffect, memo } from 'react';
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
import type { ToolType, ViewportTransform, CampaignTimeState } from './types';
import { PartyTracker } from '../tools/party-tracker';
import type { PartyTrackerState } from '../tools/party-tracker';
import styles from './InfiniteCanvas.module.css';
import type { MapDisplayState } from '../tools/map-display/types';
import { MapDisplay } from '../tools/map-display/MapDisplay';
import { TimeClock } from '../tools/time-clock';
import { TimeCalendar } from '../tools/time-calendar';
import { TimeSessionTimer, PinnedTimers } from '../tools/time-session-timer';

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
}: {
  toolType: ToolType;
  toolState: unknown;
  onToolStateChange: (state: unknown) => void;
  campaignId: string;
  timeState?: CampaignTimeState;
  onAdvanceTime?: (minutes: number) => void;
  onSetTimeState?: (timeState: CampaignTimeState) => void;
}) {
  switch (toolType) {
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
  // Built as a memo keyed on window ids + dispatch so no ref is read during render.
  const windowIds = state.windows.map((w) => w.id);
  const toolStateHandlers = useMemo(() => {
    const map = new Map<string, (s: unknown) => void>();
    for (const id of windowIds) {
      map.set(id, (s: unknown) => dispatch({ type: 'UPDATE_TOOL_STATE', id, toolState: s }));
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [windowIds.join(','), dispatch]);

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

  // Close topmost non-pinned window
  const closeTopmostWindow = useCallback(() => {
    const topmost = [...state.windows]
      .reverse()
      .find((w) => !w.minimized && !w.pinned);
    if (topmost) closeWindow(topmost.id);
  }, [state.windows, closeWindow]);

  // Keyboard shortcuts
  const shortcutHandlers = useMemo(
    () => ({
      undo,
      redo,
      zoomIn,
      zoomOut,
      zoomReset: resetView,
      escape: closeTopmostWindow,
      helpPanel: () => setShowShortcuts((s) => !s),
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
    [undo, redo, zoomIn, zoomOut, resetView, closeTopmostWindow, presets, activatePreset],
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
              .filter((win) => visibleIds.has(win.id))
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
                  onToolStateChange={toolStateHandlers.get(win.id)!}
                  campaignId={campaignId ?? 'default'}
                  timeState={win.toolType.startsWith('time-') ? state.timeState : undefined}
                  onAdvanceTime={win.toolType.startsWith('time-') ? advanceTimeHandler : undefined}
                  onSetTimeState={win.toolType.startsWith('time-') ? setTimeStateHandler : undefined}
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
          onSetTimeState={(ts) => dispatch({ type: 'SET_TIME_STATE', timeState: ts })}
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
    </div>
  );
}

export { InfiniteCanvas };
