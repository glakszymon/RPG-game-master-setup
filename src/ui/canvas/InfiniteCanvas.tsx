/*
 * InfiniteCanvas — main workspace component.
 *
 * Pannable, zoomable DOM container with windowed tools.
 * Composes: panzoom viewport, CanvasWindow instances, context menu,
 * minimap, and minimize tray.
 */

import { useCallback, useState, useRef, useEffect } from 'react';
import { usePanZoom } from './hooks/usePanZoom';
import { useCanvasState } from './hooks/useCanvasState';
import { useCanvasPersistence } from './hooks/useCanvasPersistence';
import { useViewportCulling } from './hooks/useViewportCulling';
import { CanvasBackground } from './CanvasBackground';
import { CanvasWindow } from './CanvasWindow';
import { CanvasContextMenu } from './ContextMenu';
import { Minimap } from './Minimap';
import { MinimizeTray } from './MinimizeTray';
import type { ToolType, ViewportTransform } from './types';
import styles from './InfiniteCanvas.module.css';

/** Placeholder content for tools — will be replaced by actual tool components */
function ToolPlaceholder({ toolType }: { toolType: ToolType }) {
  return (
    <div style={{ padding: 8, color: 'var(--color-text-secondary)' }}>
      <p>{toolType} — content coming soon</p>
    </div>
  );
}

function InfiniteCanvas() {
  const { canvasRef, getTransform, setTransformCallback, transformRef } = usePanZoom();

  const {
    state,
    dispatch,
    openWindow,
    closeWindow,
    moveWindow,
    resizeWindow,
    minimizeWindow,
    restoreWindow,
    focusWindow,
    togglePin,
  } = useCanvasState();

  useCanvasPersistence(state, dispatch);

  // Track viewport dimensions for minimap
  const [viewportSize, setViewportSize] = useState({ width: 0, height: 0 });
  const viewportRef = useRef<HTMLDivElement>(null);

  // Track transform for minimap (re-render on change, debounced)
  const [minimapTransform, setMinimapTransform] = useState<ViewportTransform>({
    x: 0,
    y: 0,
    scale: 1,
  });

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
                scale={transformRef.current.scale}
                zIndex={zIndices.get(win.id) ?? 10}
                isActive={win.id === activeWindowId}
                onMove={moveWindow}
                onResize={resizeWindow}
                onFocus={focusWindow}
                onClose={closeWindow}
                onMinimize={minimizeWindow}
                onTogglePin={togglePin}
              >
                <ToolPlaceholder toolType={win.toolType} />
              </CanvasWindow>
            ))}
          </div>
        </div>
      </CanvasContextMenu>

      {/* Viewport-fixed overlays */}
      <MinimizeTray windows={state.windows} onRestore={restoreWindow} />
      <Minimap
        windows={state.windows}
        viewport={minimapTransform}
        viewportWidth={viewportSize.width}
        viewportHeight={viewportSize.height}
        visible={true}
      />
    </div>
  );
}

export { InfiniteCanvas };
