/*
 * Event Bus — React hooks for subscribing/publishing typed events.
 * StrictMode-safe: cleanup unsubscribes on double-mount.
 */

import { useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import { subscribe, publish } from './event-bus';
import type { EventKey, EventHandler, EventMap } from './types';

/** Subscribe to an event — handler ref stays fresh without re-subscribing. */
export function useSubscribe<K extends EventKey>(event: K, handler: EventHandler<K>): void {
  const handlerRef = useRef(handler);
  useLayoutEffect(() => { handlerRef.current = handler; });

  useEffect(() => {
    const stable: EventHandler<K> = (payload) => handlerRef.current(payload);
    return subscribe(event, stable);
  }, [event]);
}

/** Returns a stable publish function for a given event key. */
export function usePublish<K extends EventKey>(event: K) {
  return useCallback((payload: EventMap[K]) => publish(event, payload), [event]);
}
