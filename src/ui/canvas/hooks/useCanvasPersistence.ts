/*
 * useCanvasPersistence — debounced autosave + initial load via Electron IPC.
 */

import { useEffect, useRef } from 'react';
import type { CanvasState } from '../types';
import type { CanvasAction } from './useCanvasState';

const CAMPAIGN_ID = 'default';
const SAVE_DEBOUNCE_MS = 500;

export function useCanvasPersistence(
  state: CanvasState,
  dispatch: React.Dispatch<CanvasAction>,
) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);

  // Load on mount
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const api = window.electronAPI;
    if (!api?.canvas?.load) return;

    api.canvas.load(CAMPAIGN_ID).then((json: string | null) => {
      if (!json) return;
      try {
        const loaded = JSON.parse(json) as CanvasState;
        dispatch({ type: 'LOAD_STATE', state: loaded });
      } catch {
        // ignore corrupt data
      }
    });
  }, [dispatch]);

  // Debounced save on state change
  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.canvas?.save) return;

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      api.canvas.save(CAMPAIGN_ID, JSON.stringify(state));
    }, SAVE_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [state]);
}
