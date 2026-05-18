/*
 * Event Bus — module-level singleton for cross-tool communication.
 * No React dependency, synchronous dispatch, ~30 LOC.
 */

import type { EventKey, EventMap, EventHandler } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const listeners = new Map<EventKey, Set<EventHandler<any>>>();

export function subscribe<K extends EventKey>(event: K, handler: EventHandler<K>): () => void {
  if (!listeners.has(event)) listeners.set(event, new Set());
  const set = listeners.get(event)!;
  set.add(handler);
  return () => {
    set.delete(handler);
    if (set.size === 0) listeners.delete(event);
  };
}

export function publish<K extends EventKey>(event: K, payload: EventMap[K]): void {
  const set = listeners.get(event);
  if (!set) return;
  for (const handler of set) handler(payload);
}
