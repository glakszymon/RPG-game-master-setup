/*
 * useViewportCulling — determines which windows are visible in the current viewport.
 *
 * Uses synchronous AABB bounds checking against the canvas transform.
 * IntersectionObserver doesn't work with CSS transforms, so this is manual.
 *
 * Uses a generous margin (50% of viewport) to avoid pop-in during fast panning.
 * Debounces unmount by 200ms to prevent thrash.
 */

import { useState, useEffect, useRef, useCallback, startTransition } from 'react';
import type { WindowState, ViewportTransform } from '../types';

interface UseViewportCullingOptions {
  /** Extra margin as fraction of viewport (default 0.5 = 50%) */
  margin?: number;
  /** Delay before unmounting off-screen windows (default 200ms) */
  unmountDelay?: number;
}

export function useViewportCulling(
  windows: WindowState[],
  getTransform: () => ViewportTransform,
  viewportWidth: number,
  viewportHeight: number,
  options: UseViewportCullingOptions = {},
) {
  const { margin = 0.5, unmountDelay = 200 } = options;

  const [visibleIds, setVisibleIds] = useState<Set<string>>(() => new Set(windows.map((w) => w.id)));
  const pendingRemoveRef = useRef<Map<string, number>>(new Map());

  const computeVisible = useCallback(() => {
    const t = getTransform();
    if (viewportWidth === 0 || viewportHeight === 0) {
      return new Set(windows.map((w) => w.id));
    }

    // Viewport in canvas-space
    const vpLeft = -t.x / t.scale;
    const vpTop = -t.y / t.scale;
    const vpW = viewportWidth / t.scale;
    const vpH = viewportHeight / t.scale;

    const mx = vpW * margin;
    const my = vpH * margin;

    const visible = new Set<string>();
    for (const w of windows) {
      // Minimized windows are always "visible" (they render in the tray, not on canvas)
      if (w.minimized) {
        visible.add(w.id);
        continue;
      }

      // AABB overlap with margin
      const overlaps = !(
        w.x + w.width < vpLeft - mx ||
        w.x > vpLeft + vpW + mx ||
        w.y + w.height < vpTop - my ||
        w.y > vpTop + vpH + my
      );

      if (overlaps) {
        visible.add(w.id);
      }
    }

    return visible;
  }, [windows, getTransform, viewportWidth, viewportHeight, margin]);

  // Update visibility on transform change
  const updateVisibility = useCallback(() => {
    const nowVisible = computeVisible();

    startTransition(() => {
      setVisibleIds((prev) => {
        // Clear pending removes for newly visible windows
        for (const id of nowVisible) {
          const timer = pendingRemoveRef.current.get(id);
          if (timer !== undefined) {
            clearTimeout(timer);
            pendingRemoveRef.current.delete(id);
          }
        }

        // Schedule delayed removal for windows that just left viewport
        for (const id of prev) {
          if (!nowVisible.has(id) && !pendingRemoveRef.current.has(id)) {
            const timer = window.setTimeout(() => {
              pendingRemoveRef.current.delete(id);
              setVisibleIds((current) => {
                const next = new Set(current);
                next.delete(id);
                return next;
              });
            }, unmountDelay);
            pendingRemoveRef.current.set(id, timer);
          }
        }

        // Immediately add newly visible windows
        const merged = new Set(prev);
        for (const id of nowVisible) {
          merged.add(id);
        }
        return merged;
      });
    });
  }, [computeVisible, unmountDelay]);

  // Recalculate when windows array changes
  useEffect(() => {
    const nowVisible = computeVisible();
    setVisibleIds(nowVisible);
  }, [computeVisible]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      for (const timer of pendingRemoveRef.current.values()) {
        clearTimeout(timer);
      }
    };
  }, []);

  return { visibleIds, updateVisibility };
}
