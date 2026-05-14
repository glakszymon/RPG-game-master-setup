/*
 * useFocusPresets — manages focus presets (save, load, activate, delete, rename).
 *
 * Presets capture window geometry + viewport transform. Activation is additive
 * by default (opens preset windows without closing existing ones). A "clean"
 * activate option closes non-preset windows first.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import type { CanvasState, FocusPreset, PresetWindowSnapshot, ViewportTransform } from '../types';
import type { CanvasAction } from './useCanvasState';

const AUTO_SAVE_ID = '__last_setup__';
const AUTO_SAVE_DEBOUNCE_MS = 1000;

interface UseFocusPresetsOptions {
  state: CanvasState;
  dispatch: React.Dispatch<CanvasAction>;
  getTransform: () => ViewportTransform;
  panTo: (x: number, y: number, scale: number, animate?: boolean) => void;
  campaignId: string;
}

export function useFocusPresets({ state, dispatch, getTransform, panTo, campaignId }: UseFocusPresetsOptions) {
  const [presets, setPresets] = useState<FocusPreset[]>([]);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadedRef = useRef(false);

  // Load presets on mount
  useEffect(() => {
    if (loadedRef.current) return;
    loadedRef.current = true;

    const api = window.electronAPI;
    if (!api?.presets?.loadAll) return;

    api.presets.loadAll(campaignId).then((json: string) => {
      try {
        const loaded = JSON.parse(json) as FocusPreset[];
        setPresets(loaded);
      } catch {
        // ignore
      }
    });
  }, []);

  // Auto-save "Last Setup" on state changes (debounced)
  useEffect(() => {
    const api = window.electronAPI;
    if (!api?.presets?.save) return;

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      const viewport = getTransform();
      const windows: PresetWindowSnapshot[] = state.windows.map((w) => ({
        toolType: w.toolType,
        x: w.x,
        y: w.y,
        width: w.width,
        height: w.height,
        pinned: w.pinned,
        minimized: w.minimized,
      }));

      const dataJson = JSON.stringify({ windows, viewport });
      api.presets.save(campaignId, AUTO_SAVE_ID, 'Last Setup', dataJson, true);

      // Update local state
      setPresets((prev) => {
        const existing = prev.findIndex((p) => p.id === AUTO_SAVE_ID);
        const autoPreset: FocusPreset = {
          id: AUTO_SAVE_ID,
          name: 'Last Setup',
          windows,
          viewport,
          isAutoSave: true,
          updatedAt: new Date().toISOString(),
        };
        if (existing >= 0) {
          const updated = [...prev];
          updated[existing] = autoPreset;
          return updated;
        }
        return [autoPreset, ...prev];
      });
    }, AUTO_SAVE_DEBOUNCE_MS);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [state, getTransform]);

  /** Save current layout as a named preset */
  const savePreset = useCallback(async (name: string): Promise<FocusPreset> => {
    const viewport = getTransform();
    const windows: PresetWindowSnapshot[] = state.windows.map((w) => ({
      toolType: w.toolType,
      x: w.x,
      y: w.y,
      width: w.width,
      height: w.height,
      pinned: w.pinned,
      minimized: w.minimized,
    }));

    const id = `preset_${Date.now()}`;
    const dataJson = JSON.stringify({ windows, viewport });

    await window.electronAPI?.presets?.save(campaignId, id, name, dataJson, false);

    const newPreset: FocusPreset = {
      id,
      name,
      windows,
      viewport,
      isAutoSave: false,
      updatedAt: new Date().toISOString(),
    };

    setPresets((prev) => [...prev, newPreset]);
    return newPreset;
  }, [state, getTransform]);

  /** Activate a preset (additive by default, clean if specified) */
  const activatePreset = useCallback((presetId: string, clean = false) => {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset) return;

    if (clean) {
      // Close all windows not in the preset
      const presetToolTypes = new Set(preset.windows.map((w) => w.toolType));
      state.windows.forEach((w) => {
        if (!presetToolTypes.has(w.toolType)) {
          dispatch({ type: 'CLOSE_WINDOW', id: w.id });
        }
      });
    }

    // Open preset windows that aren't already open
    const openToolTypes = new Set(state.windows.map((w) => w.toolType));
    preset.windows.forEach((pw) => {
      if (!openToolTypes.has(pw.toolType)) {
        dispatch({ type: 'OPEN_WINDOW', toolType: pw.toolType, x: pw.x, y: pw.y });
      }
    });

    // Animate viewport to preset's saved transform
    panTo(preset.viewport.x, preset.viewport.y, preset.viewport.scale, true);
  }, [presets, state.windows, dispatch, panTo]);

  /** Delete a user preset (cannot delete auto-save) */
  const deletePreset = useCallback(async (presetId: string) => {
    await window.electronAPI?.presets?.delete(campaignId, presetId);
    setPresets((prev) => prev.filter((p) => p.id !== presetId));
  }, []);

  /** Rename a user preset */
  const renamePreset = useCallback(async (presetId: string, newName: string) => {
    await window.electronAPI?.presets?.rename(campaignId, presetId, newName);
    setPresets((prev) =>
      prev.map((p) => (p.id === presetId ? { ...p, name: newName } : p)),
    );
  }, []);

  /** Overwrite an existing preset with current layout */
  const overwritePreset = useCallback(async (presetId: string) => {
    const preset = presets.find((p) => p.id === presetId);
    if (!preset || preset.isAutoSave) return;

    const viewport = getTransform();
    const windows: PresetWindowSnapshot[] = state.windows.map((w) => ({
      toolType: w.toolType,
      x: w.x,
      y: w.y,
      width: w.width,
      height: w.height,
      pinned: w.pinned,
      minimized: w.minimized,
    }));

    const dataJson = JSON.stringify({ windows, viewport });
    await window.electronAPI?.presets?.save(campaignId, presetId, preset.name, dataJson, false);

    setPresets((prev) =>
      prev.map((p) =>
        p.id === presetId
          ? { ...p, windows, viewport, updatedAt: new Date().toISOString() }
          : p,
      ),
    );
  }, [presets, state, getTransform]);

  return {
    presets,
    savePreset,
    activatePreset,
    deletePreset,
    renamePreset,
    overwritePreset,
  };
}
