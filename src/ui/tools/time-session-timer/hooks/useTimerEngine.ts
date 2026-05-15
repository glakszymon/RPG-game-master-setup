/**
 * TimerEngine — singleton that runs a single rAF loop for all active
 * real-time timers. Individual components subscribe via useSyncExternalStore.
 *
 * Each timer stores startedAt (timestamp) + accumulatedMs. The engine computes
 * elapsed = accumulatedMs + (Date.now() - startedAt) per frame, notifying
 * subscribers only when the displayed second changes.
 */

import { useSyncExternalStore } from 'react';

interface TimerEntry {
  startedAt: number | null;
  accumulatedMs: number;
}

type Listener = () => void;

class TimerEngine {
  private timers = new Map<string, TimerEntry>();
  private computed = new Map<string, number>(); // id → current ms
  private prevSeconds = new Map<string, number>(); // id → last notified second
  private listeners = new Map<string, Set<Listener>>();
  private rafId: number | null = null;
  private running = false;

  register(id: string, startedAt: number | null, accumulatedMs: number) {
    this.timers.set(id, { startedAt, accumulatedMs });
    const ms = startedAt ? accumulatedMs + (Date.now() - startedAt) : accumulatedMs;
    this.computed.set(id, ms);
    this.prevSeconds.set(id, Math.floor(ms / 1000));
    this.startLoop();
  }

  unregister(id: string) {
    this.timers.delete(id);
    this.computed.delete(id);
    this.prevSeconds.delete(id);
    this.listeners.delete(id);
    if (this.timers.size === 0) this.stopLoop();
  }

  update(id: string, startedAt: number | null, accumulatedMs: number) {
    this.timers.set(id, { startedAt, accumulatedMs });
  }

  getSnapshot(id: string): number {
    return this.computed.get(id) ?? 0;
  }

  subscribe(id: string, listener: Listener): () => void {
    if (!this.listeners.has(id)) this.listeners.set(id, new Set());
    this.listeners.get(id)!.add(listener);
    return () => {
      this.listeners.get(id)?.delete(listener);
    };
  }

  private startLoop() {
    if (this.running) return;
    this.running = true;
    this.tick();
  }

  private stopLoop() {
    this.running = false;
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
  }

  private tick = () => {
    if (!this.running) return;
    const now = Date.now();

    for (const [id, entry] of this.timers) {
      const ms = entry.startedAt
        ? entry.accumulatedMs + (now - entry.startedAt)
        : entry.accumulatedMs;
      this.computed.set(id, ms);

      const sec = Math.floor(ms / 1000);
      if (sec !== this.prevSeconds.get(id)) {
        this.prevSeconds.set(id, sec);
        const subs = this.listeners.get(id);
        if (subs) for (const fn of subs) fn();
      }
    }

    this.rafId = requestAnimationFrame(this.tick);
  };
}

// Singleton
const engine = new TimerEngine();

/**
 * Hook: subscribe to a single timer's display milliseconds.
 * Only re-renders when the displayed second changes.
 */
export function useTimerDisplay(id: string): number {
  return useSyncExternalStore(
    (cb) => engine.subscribe(id, cb),
    () => engine.getSnapshot(id),
  );
}

export { engine as timerEngine };
