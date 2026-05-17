/*
 * useAudioEngine — Core Web Audio API hook for the soundboard.
 *
 * Manages AudioContext, per-track GainNodes, master GainNode,
 * and AnalyserNode for waveform visualization.
 */

import { useRef, useCallback, useEffect } from 'react';

interface AudioNode {
  source: AudioBufferSourceNode;
  gain: GainNode;
}

export interface TrackNodes {
  buffer: AudioBuffer | null;
  gain: GainNode;
  activeNodes: AudioNode[];
}

export interface AudioEngineAPI {
  /** Play a track (load buffer if needed, start playback) */
  playTrack: (trackId: string, filePath: string, source: 'imported' | 'bundled', loop: boolean, volume: number) => Promise<void>;
  /** Pause/stop a track */
  stopTrack: (trackId: string) => void;
  /** Set volume for a track (0-1) */
  setTrackVolume: (trackId: string, volume: number) => void;
  /** Set master volume (0-1) */
  setMasterVolume: (volume: number) => void;
  /** Fire a stacking instance with optional jitter */
  fireStack: (trackId: string, filePath: string, source: 'imported' | 'bundled', volume: number, maxInstances: number, jitterIntensity: number) => Promise<void>;
  /** Get the AnalyserNode for waveform visualization */
  getAnalyser: () => AnalyserNode | null;
  /** Get the AudioContext */
  getContext: () => AudioContext;
  /** Get TrackNodes for a given track (for crossfade access to GainNode) */
  getTrackNodes: (trackId: string) => TrackNodes;
  /** Resume AudioContext (needed after user gesture) */
  resume: () => Promise<void>;
  /** Cleanup all resources */
  cleanup: () => void;
}

export function useAudioEngine(): AudioEngineAPI {
  const ctxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const tracksRef = useRef<Map<string, TrackNodes>>(new Map());
  const bufferCacheRef = useRef<Map<string, AudioBuffer>>(new Map());

  // Initialize AudioContext lazily
  const getContext = useCallback((): AudioContext => {
    if (!ctxRef.current) {
      const ctx = new AudioContext();
      ctxRef.current = ctx;

      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.8;
      masterGainRef.current = masterGain;

      const analyser = ctx.createAnalyser();
      analyser.fftSize = 2048;
      analyserRef.current = analyser;

      masterGain.connect(analyser);
      analyser.connect(ctx.destination);
    }
    return ctxRef.current;
  }, []);

  // Get or create track nodes
  const getTrackNodes = useCallback((trackId: string): TrackNodes => {
    const existing = tracksRef.current.get(trackId);
    if (existing) return existing;

    const ctx = getContext();
    const gain = ctx.createGain();
    gain.connect(masterGainRef.current!);

    const nodes: TrackNodes = { buffer: null, gain, activeNodes: [] };
    tracksRef.current.set(trackId, nodes);
    return nodes;
  }, [getContext]);

  // Load and decode audio buffer
  const loadBuffer = useCallback(async (filePath: string, source: 'imported' | 'bundled'): Promise<AudioBuffer> => {
    const cacheKey = `${source}:${filePath}`;
    const cached = bufferCacheRef.current.get(cacheKey);
    if (cached) return cached;

    const ctx = getContext();
    let arrayBuffer: ArrayBuffer;

    if (source === 'bundled') {
      const data = await window.electronAPI?.soundboard?.readBundled(filePath);
      if (!data) throw new Error(`Failed to read bundled sample: ${filePath}`);
      arrayBuffer = data;
    } else {
      const data = await window.electronAPI?.soundboard?.readAudio(filePath);
      if (!data) throw new Error(`Failed to read audio file: ${filePath}`);
      arrayBuffer = data;
    }

    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    bufferCacheRef.current.set(cacheKey, audioBuffer);
    return audioBuffer;
  }, [getContext]);

  const playTrack = useCallback(async (
    trackId: string,
    filePath: string,
    source: 'imported' | 'bundled',
    loop: boolean,
    volume: number,
  ) => {
    const ctx = getContext();
    if (ctx.state === 'suspended') await ctx.resume();

    const trackNodes = getTrackNodes(trackId);
    trackNodes.gain.gain.value = volume;

    // Stop existing playback
    for (const node of trackNodes.activeNodes) {
      try { node.source.stop(); } catch { /* already stopped */ }
    }
    trackNodes.activeNodes = [];

    const buffer = await loadBuffer(filePath, source);
    trackNodes.buffer = buffer;

    const bufferSource = ctx.createBufferSource();
    bufferSource.buffer = buffer;
    bufferSource.loop = loop;
    bufferSource.connect(trackNodes.gain);
    bufferSource.start();

    const audioNode: AudioNode = { source: bufferSource, gain: trackNodes.gain };
    trackNodes.activeNodes.push(audioNode);

    bufferSource.onended = () => {
      const idx = trackNodes.activeNodes.indexOf(audioNode);
      if (idx !== -1) trackNodes.activeNodes.splice(idx, 1);
    };
  }, [getContext, getTrackNodes, loadBuffer]);

  const stopTrack = useCallback((trackId: string) => {
    const trackNodes = tracksRef.current.get(trackId);
    if (!trackNodes) return;

    for (const node of trackNodes.activeNodes) {
      try { node.source.stop(); } catch { /* already stopped */ }
    }
    trackNodes.activeNodes = [];
  }, []);

  const setTrackVolume = useCallback((trackId: string, volume: number) => {
    const trackNodes = tracksRef.current.get(trackId);
    if (!trackNodes) return;
    trackNodes.gain.gain.value = volume;
  }, []);

  const setMasterVolume = useCallback((volume: number) => {
    if (masterGainRef.current) {
      masterGainRef.current.gain.value = volume;
    }
  }, []);

  const fireStack = useCallback(async (
    trackId: string,
    filePath: string,
    source: 'imported' | 'bundled',
    volume: number,
    maxInstances: number,
    jitterIntensity: number,
  ) => {
    const ctx = getContext();
    if (ctx.state === 'suspended') await ctx.resume();

    const trackNodes = getTrackNodes(trackId);
    trackNodes.gain.gain.value = volume;

    // Evict oldest instances if at max
    while (trackNodes.activeNodes.length >= maxInstances) {
      const oldest = trackNodes.activeNodes.shift();
      if (oldest) {
        try { oldest.source.stop(); } catch { /* already stopped */ }
      }
    }

    const buffer = await loadBuffer(filePath, source);

    const bufferSource = ctx.createBufferSource();
    bufferSource.buffer = buffer;
    bufferSource.loop = false; // stacking instances don't loop

    // Apply jitter: detune (cents) and timing offset
    if (jitterIntensity > 0) {
      const maxDetune = 200 * jitterIntensity; // up to ±200 cents at full intensity
      bufferSource.detune.value = (Math.random() * 2 - 1) * maxDetune;
    }

    bufferSource.connect(trackNodes.gain);

    // Timing jitter: start slightly offset
    const timingOffset = jitterIntensity > 0
      ? Math.random() * 0.05 * jitterIntensity
      : 0;
    bufferSource.start(ctx.currentTime + timingOffset);

    const audioNode: AudioNode = { source: bufferSource, gain: trackNodes.gain };
    trackNodes.activeNodes.push(audioNode);

    bufferSource.onended = () => {
      const idx = trackNodes.activeNodes.indexOf(audioNode);
      if (idx !== -1) trackNodes.activeNodes.splice(idx, 1);
    };
  }, [getContext, getTrackNodes, loadBuffer]);

  const getAnalyser = useCallback((): AnalyserNode | null => {
    return analyserRef.current;
  }, []);

  const resume = useCallback(async () => {
    const ctx = ctxRef.current;
    if (ctx && ctx.state === 'suspended') {
      await ctx.resume();
    }
  }, []);

  const cleanup = useCallback(() => {
    for (const [, trackNodes] of tracksRef.current) {
      for (const node of trackNodes.activeNodes) {
        try { node.source.stop(); } catch { /* already stopped */ }
      }
    }
    tracksRef.current.clear();
    bufferCacheRef.current.clear();
    if (ctxRef.current) {
      ctxRef.current.close();
      ctxRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => { cleanup(); };
  }, [cleanup]);

  return {
    playTrack,
    stopTrack,
    setTrackVolume,
    setMasterVolume,
    fireStack,
    getAnalyser,
    getContext,
    getTrackNodes,
    resume,
    cleanup,
  };
}
