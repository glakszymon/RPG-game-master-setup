/*
 * TrackRow — single track card for the soundboard grid.
 *
 * Renders play/pause, volume, loop, stacking toggle, fire button, and jitter.
 * Sliders use local state during drag and commit on pointerUp to avoid
 * flooding the canvas reducer with UPDATE_TOOL_STATE on every mousemove.
 */

import { useCallback, useState, useEffect, useRef } from 'react';
import type { SoundboardTrack } from '../types';
import styles from '../Soundboard.module.css';

interface TrackRowProps {
  track: SoundboardTrack;
  onPlay: (trackId: string) => void;
  onStop: (trackId: string) => void;
  onVolumeChange: (trackId: string, volume: number) => void;
  onVolumePreview: (trackId: string, volume: number) => void;
  onLoopToggle: (trackId: string) => void;
  onRemove: (trackId: string) => void;
  onFire: (trackId: string) => void;
  onStackingToggle: (trackId: string) => void;
  onJitterChange: (trackId: string, intensity: number) => void;
}

export function TrackRow({
  track,
  onPlay,
  onStop,
  onVolumeChange,
  onVolumePreview,
  onLoopToggle,
  onRemove,
  onFire,
  onStackingToggle,
  onJitterChange,
}: TrackRowProps) {
  // Local slider state — tracks the "live" value during drag
  const [localVolume, setLocalVolume] = useState(track.volume);
  const [localJitter, setLocalJitter] = useState(track.jitterIntensity);
  const draggingRef = useRef<'volume' | 'jitter' | null>(null);

  // Sync from parent when not dragging
  useEffect(() => {
    if (draggingRef.current !== 'volume') setLocalVolume(track.volume);
  }, [track.volume]);

  useEffect(() => {
    if (draggingRef.current !== 'jitter') setLocalJitter(track.jitterIntensity);
  }, [track.jitterIntensity]);

  const handlePlayPause = useCallback(() => {
    if (track.isPlaying) {
      onStop(track.id);
    } else {
      onPlay(track.id);
    }
  }, [track.id, track.isPlaying, onPlay, onStop]);

  const handleLoop = useCallback(() => {
    onLoopToggle(track.id);
  }, [track.id, onLoopToggle]);

  const handleRemove = useCallback(() => {
    onRemove(track.id);
  }, [track.id, onRemove]);

  const handleFire = useCallback(() => {
    onFire(track.id);
  }, [track.id, onFire]);

  const handleStacking = useCallback(() => {
    onStackingToggle(track.id);
  }, [track.id, onStackingToggle]);

  return (
    <div className={`${styles.trackCard} ${track.isPlaying ? styles.trackCardActive : ''}`}>
      <div className={styles.trackCardHeader}>
        <span className={styles.trackName} title={track.name}>
          {track.name}
        </span>
        <button
          className={styles.trackBtnSmall}
          onClick={handleRemove}
          title="Remove"
        >
          <span className="material-symbols-outlined">close</span>
        </button>
      </div>

      <button
        className={`${styles.trackPlayBtn} ${track.isPlaying ? styles.trackPlayBtnActive : ''}`}
        onClick={handlePlayPause}
        title={track.isPlaying ? 'Stop' : 'Play'}
      >
        <span className="material-symbols-outlined">
          {track.isPlaying ? 'pause' : 'play_arrow'}
        </span>
      </button>

      <input
        type="range"
        className={styles.volumeSlider}
        min={0}
        max={1}
        step={0.01}
        value={localVolume}
        onChange={e => {
          draggingRef.current = 'volume';
          const v = parseFloat(e.target.value);
          setLocalVolume(v);
          onVolumePreview(track.id, v);
        }}
        onPointerUp={() => {
          draggingRef.current = null;
          onVolumeChange(track.id, localVolume);
        }}
        title={`Volume: ${Math.round(localVolume * 100)}%`}
      />

      <div className={styles.trackCardFooter}>
        <button
          className={`${styles.trackBtnSmall} ${track.loop ? styles.trackBtnActive : ''}`}
          onClick={handleLoop}
          title={track.loop ? 'Loop ON' : 'Loop OFF'}
        >
          <span className="material-symbols-outlined">repeat</span>
        </button>

        <button
          className={`${styles.trackBtnSmall} ${track.stackingEnabled ? styles.trackBtnActive : ''}`}
          onClick={handleStacking}
          title={track.stackingEnabled ? 'Stacking ON' : 'Stacking OFF'}
        >
          <span className="material-symbols-outlined">stacks</span>
        </button>

        {track.stackingEnabled && (
          <button
            className={styles.fireBtn}
            onClick={handleFire}
            title="Fire instance"
          >
            <span className="material-symbols-outlined">bolt</span>
          </button>
        )}
      </div>

      {track.stackingEnabled && (
        <input
          type="range"
          className={styles.jitterSlider}
          min={0}
          max={1}
          step={0.05}
          value={localJitter}
          onChange={e => {
            draggingRef.current = 'jitter';
            setLocalJitter(parseFloat(e.target.value));
          }}
          onPointerUp={() => {
            draggingRef.current = null;
            onJitterChange(track.id, localJitter);
          }}
          title={`Jitter: ${Math.round(localJitter * 100)}%`}
        />
      )}
    </div>
  );
}
