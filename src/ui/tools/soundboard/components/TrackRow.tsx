/*
 * TrackRow — single track card for the soundboard grid.
 *
 * Renders play/pause, volume, loop, stacking toggle, fire button, and jitter.
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
  onFire: (trackId: string) => void;
  onStackingToggle: (trackId: string) => void;
  onJitterChange: (trackId: string, intensity: number) => void;
}

export function TrackRow({
  track,
  onPlay,
  onStop,
  onVolumeChange,
  onLoopToggle,
  onRemove,
  onFire,
  onStackingToggle,
  onJitterChange,
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
        value={track.volume}
        onChange={handleVolume}
        title={`Volume: ${Math.round(track.volume * 100)}%`}
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
          value={track.jitterIntensity}
          onChange={handleJitter}
          title={`Jitter: ${Math.round(track.jitterIntensity * 100)}%`}
        />
      )}
    </div>
  );
}
