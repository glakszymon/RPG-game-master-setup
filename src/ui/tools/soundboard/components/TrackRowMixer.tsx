/*
 * TrackRowMixer — extended track row for mixer mode.
 *
 * Includes all simple controls plus Fire button, jitter slider,
 * stacking toggle, and instance count indicator.
 */

import { useCallback } from 'react';
import type { SoundboardTrack } from '../types';
import styles from '../Soundboard.module.css';

interface TrackRowMixerProps {
  track: SoundboardTrack;
  onPlay: (trackId: string) => void;
  onStop: (trackId: string) => void;
  onVolumeChange: (trackId: string, volume: number) => void;
  onLoopToggle: (trackId: string) => void;
  onRemove: (trackId: string) => void;
  onFire: (trackId: string) => void;
  onStackingToggle: (trackId: string) => void;
  onJitterChange: (trackId: string, intensity: number) => void;
}

export function TrackRowMixer({
  track,
  onPlay,
  onStop,
  onVolumeChange,
  onLoopToggle,
  onRemove,
  onFire,
  onStackingToggle,
  onJitterChange,
}: TrackRowMixerProps) {
  const handlePlayPause = useCallback(() => {
    if (track.isPlaying) {
      onStop(track.id);
    } else {
      onPlay(track.id);
    }
  }, [track.id, track.isPlaying, onPlay, onStop]);

  const handleVolume = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onVolumeChange(track.id, parseFloat(e.target.value));
  }, [track.id, onVolumeChange]);

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

  const handleJitter = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onJitterChange(track.id, parseFloat(e.target.value));
  }, [track.id, onJitterChange]);

  return (
    <div className={styles.trackRow}>
      <button
        className={`${styles.trackBtn} ${track.isPlaying ? styles.trackBtnActive : ''}`}
        onClick={handlePlayPause}
        title={track.isPlaying ? 'Pause' : 'Play'}
      >
        {track.isPlaying ? '⏸' : '▶'}
      </button>

      <span className={styles.trackName} title={track.name}>
        {track.name}
      </span>

      <input
        type="range"
        className={styles.volumeSlider}
        min={0}
        max={1}
        step={0.01}
        value={track.volume}
        onChange={handleVolume}
        title={`Volume: ${Math.round(track.volume * 100)}%`}
      />

      <button
        className={`${styles.trackBtn} ${track.loop ? styles.trackBtnActive : ''}`}
        onClick={handleLoop}
        title={track.loop ? 'Loop: ON' : 'Loop: OFF'}
      >
        🔁
      </button>

      {/* Stacking controls */}
      <button
        className={`${styles.trackBtn} ${track.stackingEnabled ? styles.trackBtnActive : ''}`}
        onClick={handleStacking}
        title={track.stackingEnabled ? 'Stacking: ON' : 'Stacking: OFF'}
      >
        📚
      </button>

      {track.stackingEnabled && (
        <>
          <button
            className={styles.fireBtn}
            onClick={handleFire}
            title="Fire instance"
          >
            🔥
          </button>
          <input
            type="range"
            className={styles.jitterSlider}
            min={0}
            max={1}
            step={0.05}
            value={track.jitterIntensity}
            onChange={handleJitter}
            title={`Jitter: ${Math.round(track.jitterIntensity * 100)}%`}
          />
        </>
      )}

      <button
        className={styles.trackBtn}
        onClick={handleRemove}
        title="Remove track"
      >
        ✕
      </button>
    </div>
  );
}
