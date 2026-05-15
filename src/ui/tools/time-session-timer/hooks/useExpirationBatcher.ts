/**
 * useExpirationBatcher — collects timer expirations within a 100ms window
 * and fires a single callback with all expired timer IDs.
 * This prevents multiple chimes when DM advances time and many timers expire at once.
 */

import { useCallback, useRef } from 'react';

export function useExpirationBatcher(onBatch: (ids: string[]) => void) {
  const bufferRef = useRef<string[]>([]);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const reportExpiration = useCallback((id: string) => {
    bufferRef.current.push(id);
    if (timeoutRef.current === null) {
      timeoutRef.current = setTimeout(() => {
        const batch = [...bufferRef.current];
        bufferRef.current = [];
        timeoutRef.current = null;
        onBatch(batch);
      }, 100);
    }
  }, [onBatch]);

  return reportExpiration;
}
