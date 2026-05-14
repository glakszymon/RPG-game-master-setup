/*
 * useCanvasPersistence — debounced autosave + initial load via Electron IPC.
 *
 * Each campaign gets its own saved canvas state.
 */

import { useEffect, useRef } from 'react';
import type { CanvasState } from '../types';
import type { CanvasAction } from './useCanvasState';

const SAVE_DEBOUNCE_MS = 500;

export function useCanvasPersistence(
  state: CanvasState,
  dispatch: React.Dispatch<CanvasAction>,
  campaignId: string,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef<string | null>(null);

  // Load on mount or when campaignId changes
  useEffect(() => {
    if (loadedRef.current === campaignId) return;
    loadedRef.current = campaignId;

    const api = window.electronAPI;
    if (!api?.canvas?.load) return;

    api.canvas.load(campaignId).then((json: string | null) => {
      if (!json) {
        // New campaign — reset to empty state
        dispatch({ type: 'LOAD_STATE', state: { windows: [], background: 'dot-grid', nextWindowId: 0 } });
        return;
      }
      try {
        const loaded = JSON.parse(json) as CanvasState;
        dispatch({ type: 'LOAD_STATE', state: loaded });
      } catch {
        // ignore corrupt data
      }
    });
  }, [dispatch, campaignId]);

  // Debounced save on state change
  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.canvas?.save) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      api.canvas.save(campaignId, JSON.stringify(state));
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state, campaignId]);
}
