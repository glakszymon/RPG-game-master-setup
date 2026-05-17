/*
 * Soundboard — main tool component rendered inside a CanvasWindow.
 *
 * Manages track list, playback via useAudioEngine, presets, and state persistence.
 * Supports two modes: simple (ambient) and mixer (full control with stacking/jitter).
 */

import { useCallback, useRef, useState, useEffect, useLayoutEffect } from 'react';
import { useAudioEngine } from './hooks/useAudioEngine';
import { useCrossfade } from './hooks/useCrossfade';
import { TrackRow } from './components/TrackRow';
import { TrackRowMixer } from './components/TrackRowMixer';
import { MasterControls } from './components/MasterControls';
import { LibraryBrowser } from './components/LibraryBrowser';
import { PresetPanel } from './components/PresetPanel';
import { BUNDLED_SAMPLES, DEFAULT_SOUNDBOARD_STATE } from './types';
import type { SoundboardState, SoundboardTrack, SoundboardPreset, PresetTrackConfig } from './types';
import styles from './Soundboard.module.css';

interface SoundboardProps {
  toolState: SoundboardState | undefined;
  onToolStateChange: (state: SoundboardState) => void;
  campaignId: string;
}

export function Soundboard({ toolState, onToolStateChange, campaignId }: SoundboardProps) {
  const state: SoundboardState = { ...DEFAULT_SOUNDBOARD_STATE, ...toolState };
  const stateRef = useRef(state);
  useLayoutEffect(() => { stateRef.current = state; });

  const [libraryOpen, setLibraryOpen] = useState(false);
  const engine = useAudioEngine();
  const { crossfade } = useCrossfade();

  const patchState = useCallback((patch: Partial<SoundboardState>) => {
    onToolStateChange({ ...stateRef.current, ...patch });
  }, [onToolStateChange]);

  const updateTrack = useCallback((trackId: string, updates: Partial<SoundboardTrack>) => {
    const tracks = stateRef.current.tracks.map(t =>
      t.id === trackId ? { ...t, ...updates } : t
    );
    patchState({ tracks });
  }, [patchState]);

  // Sync master volume to engine
  useEffect(() => {
    engine.setMasterVolume(state.masterVolume);
  }, [state.masterVolume, engine]);

  // ── Playback handlers ──

  const handlePlay = useCallback(async (trackId: string) => {
    const track = stateRef.current.tracks.find(t => t.id === trackId);
    if (!track) return;
    await engine.playTrack(trackId, track.filePath, track.source, track.loop, track.volume);
    updateTrack(trackId, { isPlaying: true });
  }, [engine, updateTrack]);

  const handleStop = useCallback((trackId: string) => {
    engine.stopTrack(trackId);
    updateTrack(trackId, { isPlaying: false });
  }, [engine, updateTrack]);

  const handleVolumeChange = useCallback((trackId: string, volume: number) => {
    engine.setTrackVolume(trackId, volume);
    updateTrack(trackId, { volume });
  }, [engine, updateTrack]);

  const handleLoopToggle = useCallback((trackId: string) => {
    const track = stateRef.current.tracks.find(t => t.id === trackId);
    if (!track) return;
    updateTrack(trackId, { loop: !track.loop });
    if (track.isPlaying) {
      engine.stopTrack(trackId);
      engine.playTrack(trackId, track.filePath, track.source, !track.loop, track.volume);
    }
  }, [engine, updateTrack]);

  const handleRemove = useCallback((trackId: string) => {
    engine.stopTrack(trackId);
    const tracks = stateRef.current.tracks.filter(t => t.id !== trackId);
    patchState({ tracks });
  }, [engine, patchState]);

  const handleMasterVolume = useCallback((volume: number) => {
    patchState({ masterVolume: volume });
  }, [patchState]);

  // ── Mixer-only handlers ──

  const handleFire = useCallback(async (trackId: string) => {
    const track = stateRef.current.tracks.find(t => t.id === trackId);
    if (!track) return;
    await engine.fireStack(trackId, track.filePath, track.source, track.volume, track.maxInstances, track.jitterIntensity);
  }, [engine]);

  const handleStackingToggle = useCallback((trackId: string) => {
    const track = stateRef.current.tracks.find(t => t.id === trackId);
    if (!track) return;
    updateTrack(trackId, { stackingEnabled: !track.stackingEnabled });
  }, [updateTrack]);

  const handleJitterChange = useCallback((trackId: string, intensity: number) => {
    updateTrack(trackId, { jitterIntensity: intensity });
  }, [updateTrack]);

  // ── Track management ──

  const handleImportTrack = useCallback(async () => {
    const filePath = await window.electronAPI?.soundboard?.importAudio(campaignId);
    if (!filePath) return;
    const name = filePath.split('/').pop()?.replace(/\.[^.]+$/, '') ?? 'Track';
    const newTrack: SoundboardTrack = {
      id: crypto.randomUUID(),
      name,
      tags: [],
      source: 'imported',
      filePath,
      volume: 0.7,
      loop: true,
      isPlaying: false,
      stackingEnabled: false,
      maxInstances: 6,
      jitterIntensity: 0.3,
    };
    patchState({ tracks: [...stateRef.current.tracks, newTrack] });
  }, [campaignId, patchState]);

  const handleAddBundled = useCallback((key: string) => {
    const sample = BUNDLED_SAMPLES.find(s => s.key === key);
    if (!sample) return;
    const newTrack: SoundboardTrack = {
      id: crypto.randomUUID(),
      name: sample.name,
      tags: [sample.category],
      source: 'bundled',
      filePath: key,
      volume: 0.7,
      loop: true,
      isPlaying: false,
      stackingEnabled: false,
      maxInstances: 6,
      jitterIntensity: 0.3,
    };
    patchState({ tracks: [...stateRef.current.tracks, newTrack] });
  }, [patchState]);

  // ── Preset handlers ──

  const handleSavePreset = useCallback((name: string) => {
    const trackConfigs: PresetTrackConfig[] = stateRef.current.tracks.map(t => ({
      trackId: t.id,
      volume: t.volume,
      isPlaying: t.isPlaying,
      loop: t.loop,
    }));
    const preset: SoundboardPreset = {
      id: crypto.randomUUID(),
      name,
      trackConfigs,
    };
    patchState({ presets: [...stateRef.current.presets, preset] });
  }, [patchState]);

  const handleLoadPreset = useCallback(async (presetId: string) => {
    const preset = stateRef.current.presets.find(p => p.id === presetId);
    if (!preset) return;

    const ctx = engine.getContext();

    // Collect GainNodes for currently playing tracks (to fade out)
    const fadeOutGains: GainNode[] = [];
    for (const track of stateRef.current.tracks) {
      if (track.isPlaying) {
        const nodes = engine.getTrackNodes(track.id);
        fadeOutGains.push(nodes.gain);
      }
    }

    // Apply preset configs to state
    const tracks = stateRef.current.tracks.map(t => {
      const config = preset.trackConfigs.find(c => c.trackId === t.id);
      if (!config) return { ...t, isPlaying: false };
      return { ...t, volume: config.volume, isPlaying: config.isPlaying, loop: config.loop };
    });

    patchState({ tracks, activePresetId: presetId });

    // Start new tracks and collect their GainNodes for fade in
    const fadeInGains: GainNode[] = [];
    const fadeInVolumes: number[] = [];

    for (const config of preset.trackConfigs) {
      if (config.isPlaying) {
        const track = tracks.find(t => t.id === config.trackId);
        if (track) {
          await engine.playTrack(track.id, track.filePath, track.source, config.loop, config.volume);
          const nodes = engine.getTrackNodes(track.id);
          fadeInGains.push(nodes.gain);
          fadeInVolumes.push(config.volume);
        }
      }
    }

    // Apply crossfade between old and new tracks
    crossfade(ctx, fadeOutGains, fadeInGains, fadeInVolumes);
  }, [engine, patchState, crossfade]);

  const handleDeletePreset = useCallback((presetId: string) => {
    const presets = stateRef.current.presets.filter(p => p.id !== presetId);
    const activePresetId = stateRef.current.activePresetId === presetId ? null : stateRef.current.activePresetId;
    patchState({ presets, activePresetId });
  }, [patchState]);

  const handleOverwritePreset = useCallback((presetId: string) => {
    const trackConfigs: PresetTrackConfig[] = stateRef.current.tracks.map(t => ({
      trackId: t.id,
      volume: t.volume,
      isPlaying: t.isPlaying,
      loop: t.loop,
    }));
    const presets = stateRef.current.presets.map(p =>
      p.id === presetId ? { ...p, trackConfigs } : p
    );
    patchState({ presets });
  }, [patchState]);

  // ── Mode toggle ──

  const handleModeToggle = useCallback(() => {
    patchState({ mode: stateRef.current.mode === 'simple' ? 'mixer' : 'simple' });
  }, [patchState]);

  // ── Render ──

  const isMixer = state.mode === 'mixer';

  return (
    <div className={styles.container}>
      {/* Mode toggle */}
      <div className={styles.toolbar}>
        <button
          className={`${styles.modeBtn} ${!isMixer ? styles.modeBtnActive : ''}`}
          onClick={handleModeToggle}
        >
          {isMixer ? '🎛️ Mixer' : '🔊 Simple'}
        </button>
      </div>

      <MasterControls
        masterVolume={state.masterVolume}
        onMasterVolumeChange={handleMasterVolume}
        getAnalyser={engine.getAnalyser}
        hasPlayingTracks={state.tracks.some(t => t.isPlaying)}
      />

      {/* Presets */}
      <PresetPanel
        presets={state.presets}
        activePresetId={state.activePresetId}
        onLoadPreset={handleLoadPreset}
        onSavePreset={handleSavePreset}
        onDeletePreset={handleDeletePreset}
        onOverwritePreset={handleOverwritePreset}
      />

      {/* Track list */}
      <div className={styles.trackList}>
        {state.tracks.length === 0 && (
          <div className={styles.emptyState}>
            No tracks yet. Add from library or import a file.
          </div>
        )}
        {state.tracks.map(track => (
          isMixer ? (
            <TrackRowMixer
              key={track.id}
              track={track}
              onPlay={handlePlay}
              onStop={handleStop}
              onVolumeChange={handleVolumeChange}
              onLoopToggle={handleLoopToggle}
              onRemove={handleRemove}
              onFire={handleFire}
              onStackingToggle={handleStackingToggle}
              onJitterChange={handleJitterChange}
            />
          ) : (
            <TrackRow
              key={track.id}
              track={track}
              onPlay={handlePlay}
              onStop={handleStop}
              onVolumeChange={handleVolumeChange}
              onLoopToggle={handleLoopToggle}
              onRemove={handleRemove}
            />
          )
        ))}
      </div>

      {/* Actions */}
      <div className={styles.actions}>
        <button className={styles.addBtn} onClick={handleImportTrack}>
          📁 Import
        </button>
        <button className={styles.addBtn} onClick={() => setLibraryOpen(true)}>
          🎵 Library
        </button>
      </div>

      {/* Library overlay */}
      {libraryOpen && (
        <LibraryBrowser
          onAddSample={handleAddBundled}
          onClose={() => setLibraryOpen(false)}
        />
      )}
    </div>
  );
}
