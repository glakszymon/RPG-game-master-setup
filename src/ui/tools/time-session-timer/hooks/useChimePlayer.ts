/**
 * useChimePlayer — plays a rich 3-note bell chime via Web Audio API
 * when a countdown timer expires. No audio file needed.
 *
 * The AudioContext is created eagerly and resumed on every play call.
 * In Electron, autoplay policy is relaxed, but we still call resume()
 * to handle edge cases where the context might be suspended.
 */

import { useCallback, useRef, useEffect } from 'react';

/** Shared AudioContext — created once, reused across chime calls */
let sharedCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!sharedCtx) {
    sharedCtx = new AudioContext();
  }
  return sharedCtx;
}

export function useChimePlayer() {
  const resumedRef = useRef(false);

  // Eagerly create and try to resume the context on mount
  useEffect(() => {
    const ctx = getAudioContext();
    if (ctx.state === 'suspended') {
      ctx.resume().then(() => { resumedRef.current = true; });
    } else {
      resumedRef.current = true;
    }
  }, []);

  // Also resume on any user interaction (click) as a fallback
  useEffect(() => {
    const handler = () => {
      const ctx = getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
    };
    document.addEventListener('click', handler, { once: true });
    document.addEventListener('keydown', handler, { once: true });
    return () => {
      document.removeEventListener('click', handler);
      document.removeEventListener('keydown', handler);
    };
  }, []);

  const playChime = useCallback(async () => {
    const ctx = getAudioContext();

    // Ensure resumed before playing
    if (ctx.state === 'suspended') {
      await ctx.resume();
    }

    const now = ctx.currentTime;

    // 3-note ascending bell: C6 → E6 → G6
    const notes = [
      { freq: 1046.5, start: 0, duration: 0.4 },
      { freq: 1318.5, start: 0.15, duration: 0.4 },
      { freq: 1568.0, start: 0.3, duration: 0.6 },
    ];

    for (const note of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(note.freq, now + note.start);
      gain.gain.setValueAtTime(0.25, now + note.start);
      gain.gain.exponentialRampToValueAtTime(0.001, now + note.start + note.duration);

      osc.start(now + note.start);
      osc.stop(now + note.start + note.duration);
    }
  }, []);

  return playChime;
}
