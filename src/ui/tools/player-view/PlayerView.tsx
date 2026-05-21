/**
 * PlayerView — DM control panel for LAN sharing.
 * Shows server controls, URL display, sharing toggles, rotation, and preview.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { PlayerViewState } from './types';
import { DEFAULT_PLAYER_VIEW_STATE } from './types';
import { usePlayerViewBroadcast } from './hooks/usePlayerViewBroadcast';
import { PlayerPreview } from './components/PlayerPreview';
import type { WindowState } from '../../canvas/types';
import styles from './PlayerView.module.css';

interface PlayerViewProps {
  toolState: PlayerViewState | undefined;
  onToolStateChange: (state: PlayerViewState) => void;
  campaignId: string;
  allWindows?: WindowState[];
}

const ROTATION_OPTIONS = [0, 90, 180, 270] as const;

export function PlayerView({ toolState, onToolStateChange, allWindows }: PlayerViewProps) {
  const state = toolState ?? DEFAULT_PLAYER_VIEW_STATE;
  const stateRef = useRef(state);
  useLayoutEffect(() => { stateRef.current = state; });

  const [polling, setPolling] = useState(false);

  // Broadcast state to players
  usePlayerViewBroadcast(state, allWindows ?? []);

  const patchState = useCallback((patch: Partial<PlayerViewState>) => {
    const current = stateRef.current;
    onToolStateChange({ ...current, ...patch });
  }, [onToolStateChange]);

  // Poll server status while running
  useEffect(() => {
    if (!state.serverRunning && !polling) return;

    const interval = setInterval(async () => {
      const status = await window.electronAPI?.lan.status();
      if (status) {
        patchState({
          serverRunning: status.running,
          port: status.port,
          connections: status.connections,
          addresses: status.addresses,
        });
        if (!status.running) setPolling(false);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [state.serverRunning, polling, patchState]);

  const handleStartStop = useCallback(async () => {
    if (state.serverRunning) {
      await window.electronAPI?.lan.stop();
      patchState({ serverRunning: false, port: null, connections: 0, addresses: [] });
    } else {
      const result = await window.electronAPI?.lan.start();
      if (result?.success) {
        patchState({
          serverRunning: true,
          port: result.port,
          addresses: result.addresses,
          connections: 0,
        });
        setPolling(true);
      }
    }
  }, [state.serverRunning, patchState]);

  const handleRotation = useCallback((rotation: 0 | 90 | 180 | 270) => {
    patchState({ rotation });
  }, [patchState]);

  const handleToggleShare = useCallback((windowId: string) => {
    const current = stateRef.current.sharedWindows;
    const next = current.includes(windowId)
      ? current.filter(id => id !== windowId)
      : [...current, windowId];
    patchState({ sharedWindows: next });
  }, [patchState]);

  const primaryUrl = state.addresses.length > 0 && state.port
    ? `http://${state.addresses[0]}:${state.port}`
    : null;

  return (
    <div className={styles.container}>
      {/* Server Controls */}
      <div className={styles.serverControls}>
        <div className={`${styles.statusDot} ${state.serverRunning ? styles.statusDotOnline : styles.statusDotOffline}`} />
        <button
          className={`${styles.startButton} ${state.serverRunning ? styles.startButtonStop : styles.startButtonStart}`}
          onClick={handleStartStop}
        >
          {state.serverRunning ? 'Stop Server' : 'Start Server'}
        </button>
        {state.serverRunning && (
          <span className={styles.connectionCount}>
            {state.connections} connected
          </span>
        )}
      </div>

      {/* URL Display */}
      {state.serverRunning && primaryUrl && (
        <div className={styles.urlSection}>
          <span className={styles.urlLabel}>Player URL</span>
          <span className={styles.urlValue}>{primaryUrl}</span>
          {state.addresses.length > 1 && (
            <span className={styles.connectionCount}>
              Also available: {state.addresses.slice(1).map((a: string) => `${a}:${state.port}`).join(', ')}
            </span>
          )}
        </div>
      )}

      {/* Shared Windows */}
      {state.serverRunning && (
        <div className={styles.section}>
          <span className={styles.sectionTitle}>Shared Windows</span>
          <div className={styles.shareList}>
            {(allWindows ?? [])
              .filter(w => w.toolType === 'map-display' || w.toolType === 'combat-tracker')
              .map(w => (
                <label key={w.id} className={styles.shareItem}>
                  <input
                    type="checkbox"
                    checked={state.sharedWindows.includes(w.id)}
                    onChange={() => handleToggleShare(w.id)}
                  />
                  <span>{w.toolType === 'map-display' ? 'Map' : 'Combat'} ({w.id.slice(-4)})</span>
                </label>
              ))
            }
            {(allWindows ?? []).filter(w => w.toolType === 'map-display' || w.toolType === 'combat-tracker').length === 0 && (
              <span className={styles.offlineMessage}>No map or combat windows open</span>
            )}
          </div>
        </div>
      )}

      {/* Rotation */}
      <div className={styles.section}>
        <span className={styles.sectionTitle}>Rotation (Projector)</span>
        <div className={styles.rotationButtons}>
          {ROTATION_OPTIONS.map(deg => (
            <button
              key={deg}
              className={`${styles.rotationButton} ${state.rotation === deg ? styles.rotationButtonActive : ''}`}
              onClick={() => handleRotation(deg)}
            >
              {deg}°
            </button>
          ))}
        </div>
      </div>

      {/* Effects Legend Toggle */}
      <div className={styles.section}>
        <label className={styles.shareItem}>
          <input
            type="checkbox"
            checked={state.showEffectsLegend ?? false}
            onChange={() => patchState({ showEffectsLegend: !state.showEffectsLegend })}
          />
          <span>Show Effects Legend (for players)</span>
        </label>
      </div>

      {/* Preview */}
      <div className={styles.previewArea}>
        {state.serverRunning
          ? <PlayerPreview playerViewState={state} allWindows={allWindows ?? []} />
          : <span className={styles.offlineMessage}>Start the server to see player preview</span>
        }
      </div>
    </div>
  );
}
