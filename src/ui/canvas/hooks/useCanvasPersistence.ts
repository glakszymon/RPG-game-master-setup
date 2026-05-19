/*
 * useCanvasPersistence — debounced autosave + initial load via Electron IPC.
 *
 * Each campaign gets its own saved canvas state.
 */

import { useEffect, useRef } from 'react';
import type { CanvasState } from '../types';
import type { CanvasAction } from './useCanvasState';

const SAVE_DEBOUNCE_MS = 2000;

export function useCanvasPersistence(
  state: CanvasState,
  dispatch: React.Dispatch<CanvasAction>,
  campaignId: string,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef<string | null>(null);
  /** True once load has completed (or no data to load). Prevents saving before restore. */
  const readyRef = useRef(false);

  // Load on mount or when campaignId changes
  useEffect(() => {
    if (loadedRef.current === campaignId) return;
    loadedRef.current = campaignId;
    readyRef.current = false;

    const api = window.electronAPI;
    if (!api?.canvas?.load) {
      readyRef.current = true;
      return;
    }

    api.canvas.load(campaignId).then((json: string | null) => {
      if (!json) {
        // New campaign — reset to empty state
        dispatch({ type: 'LOAD_STATE', state: { windows: [], background: 'dot-grid', nextWindowId: 0 } as any });
      } else {
        try {
          const loaded = JSON.parse(json) as CanvasState;
          // Filter out windows with unknown tool types
          const validToolTypes = new Set(['combat-tracker','party-tracker','bestiary','encounter-sets','notepad','map-display','soundboard','weather-generator','time-clock','time-calendar','time-session-timer','shop-generator','dice-roller']);
          loaded.windows = (loaded.windows || []).filter((w) => {
            if (!validToolTypes.has(w.toolType)) {
              return false;
            }
            return true;
          });
          const mapWindows = loaded.windows.filter((w) => w.toolType === 'map-display');
          if (mapWindows.length > 0) {
            console.log('[Persistence] Loaded', loaded.windows.length, 'windows,', mapWindows.length, 'maps');
          }
          dispatch({ type: 'LOAD_STATE', state: loaded });
        } catch {
          // ignore corrupt data
        }
      }
      readyRef.current = true;
    });
  }, [dispatch, campaignId]);

  // Debounced save on state change — only after initial load completes
  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.canvas?.save) return;
    if (!readyRef.current) return; // Don't save until load is done

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      api.canvas.save(campaignId, JSON.stringify(state));
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state, campaignId]);
}
