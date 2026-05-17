/*
 * TrackRow — single track control row for the soundboard.
 *
 * Renders play/pause, volume slider, loop toggle, and track name.
 */

import { useCallback } from 'react';
import type { SoundboardTrack } from '../types';
import styles from '../Soundboard.module.css';

interface TrackRowProps {
  track: SoundboardTrack;
  onPlay: (trackId: string) => void;
  onStop: (trackId: string) => void;
  onVolumeChange: (trackId: string, volume: number) => void;
  onLoopToggle: (trackId: string) => void;
  onRemove: (trackId: string) => void;
}

export function TrackRow({
  track,
  onPlay,
  onStop,
  onVolumeChange,
  onLoopToggle,
  onRemove,
}: TrackRowProps) {
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
