/*
 * useMacroExecutor — Listens for macro execution events from the MacroBlock
 * and dispatches cross-tool commands (load map preset, play music, etc.).
 */

import { useEffect, useCallback } from 'react';
import type { MacroStep } from '../extensions/macro-block/MacroBlock';

interface UseMacroExecutorOptions {
  onLoadMapPreset?: (mapStateJson: string) => void;
}

export function useMacroExecutor({ onLoadMapPreset }: UseMacroExecutorOptions) {
  const executeSteps = useCallback(async (steps: MacroStep[]) => {
    for (const step of steps) {
      switch (step.type) {
        case 'load-map-preset': {
          if (onLoadMapPreset && step.payload) {
            // payload is the preset ID — load from DB then apply
            const api = window.electronAPI;
            if (api) {
              const preset = await api.notePresets.load(step.payload);
              if (preset && preset.map_state_json !== '{}') {
                onLoadMapPreset(preset.map_state_json);
              }
            }
          }
          break;
        }
        case 'play-music': {
          // Dispatch event for soundboard to pick up
          window.dispatchEvent(new CustomEvent('notepad:play-track', {
            detail: { trackId: step.payload },
          }));
          break;
        }
        case 'stop-music': {
          window.dispatchEvent(new CustomEvent('notepad:stop-music'));
          break;
        }
        case 'wait': {
          const ms = parseInt(step.payload, 10) || 1000;
          await new Promise(resolve => setTimeout(resolve, ms));
          break;
        }
      }
    }
  }, [onLoadMapPreset]);

  useEffect(() => {
    function handleExecute(e: Event) {
      const detail = (e as CustomEvent).detail as { steps: MacroStep[] };
      if (detail?.steps) {
        executeSteps(detail.steps);
      }
    }

    window.addEventListener('notepad:execute-macro', handleExecute);
    return () => window.removeEventListener('notepad:execute-macro', handleExecute);
  }, [executeSteps]);
}
