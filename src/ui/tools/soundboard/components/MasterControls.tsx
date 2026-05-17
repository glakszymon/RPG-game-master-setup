/*
 * MasterControls — master volume slider + waveform visualization.
 */

import { useCallback, useEffect } from 'react';
import { useWaveform } from '../hooks/useWaveform';
import styles from '../Soundboard.module.css';

interface MasterControlsProps {
  masterVolume: number;
  onMasterVolumeChange: (volume: number) => void;
  getAnalyser: () => AnalyserNode | null;
  hasPlayingTracks: boolean;
}

export function MasterControls({ masterVolume, onMasterVolumeChange, getAnalyser, hasPlayingTracks }: MasterControlsProps) {
  const { canvasRef, start, stop } = useWaveform(getAnalyser);

  useEffect(() => {
    if (hasPlayingTracks) {
      start();
    } else {
      stop();
    }
  }, [hasPlayingTracks, start, stop]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onMasterVolumeChange(parseFloat(e.target.value));
  }, [onMasterVolumeChange]);

  return (
    <div className={styles.masterControls}>
      <div className={styles.masterRow}>
        <span className={styles.masterLabel}><span className="material-symbols-outlined">volume_up</span> Master</span>
        <input
          type="range"
          className={styles.volumeSlider}
          min={0}
          max={1}
          step={0.01}
          value={masterVolume}
          onChange={handleChange}
          title={`Master: ${Math.round(masterVolume * 100)}%`}
        />
        <span className={styles.masterValue}>{Math.round(masterVolume * 100)}%</span>
      </div>
      <canvas
        ref={canvasRef}
        className={styles.waveformCanvas}
        width={320}
        height={32}
      />
    </div>
  );
}
