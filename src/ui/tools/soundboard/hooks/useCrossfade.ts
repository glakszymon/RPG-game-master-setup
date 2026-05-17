/*
 * useCrossfade — smooth gain transitions when switching presets.
 *
 * Uses linearRampToValueAtTime on GainNodes.
 */

import { useCallback, useRef } from 'react';

const CROSSFADE_DURATION = 1.5; // seconds

export interface CrossfadeAPI {
  /** Crossfade: fade out current tracks, fade in new tracks */
  crossfade: (
    ctx: AudioContext,
    fadeOutGains: GainNode[],
    fadeInGains: GainNode[],
    fadeInTargetVolumes: number[],
  ) => void;
}

export function useCrossfade(): CrossfadeAPI {
  const activeTimeoutsRef = useRef<number[]>([]);

  const crossfade = useCallback((
    ctx: AudioContext,
    fadeOutGains: GainNode[],
    fadeInGains: GainNode[],
    fadeInTargetVolumes: number[],
  ) => {
    // Clear previous scheduled transitions
    for (const t of activeTimeoutsRef.current) {
      clearTimeout(t);
    }
    activeTimeoutsRef.current = [];

    const now = ctx.currentTime;

    // Fade out
    for (const gain of fadeOutGains) {
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + CROSSFADE_DURATION);
    }

    // Fade in
    for (let i = 0; i < fadeInGains.length; i++) {
      const gain = fadeInGains[i];
      const target = fadeInTargetVolumes[i] ?? 0.7;
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(target, now + CROSSFADE_DURATION);
    }
  }, []);

  return { crossfade };
}
