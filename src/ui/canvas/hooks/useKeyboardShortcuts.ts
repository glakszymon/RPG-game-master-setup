/*
 * useKeyboardShortcuts — registers all canvas keyboard shortcuts via tinykeys.
 *
 * Consumes the central SHORTCUTS registry and maps each shortcut ID
 * to a handler callback provided by the caller.
 */

import { useEffect, useMemo } from 'react';
// @ts-expect-error tinykeys types don't resolve via package.json exports
import { tinykeys } from 'tinykeys';
import { SHORTCUTS } from '../shortcuts';
import type { ShortcutId } from '../shortcuts';

type ShortcutHandlers = Partial<Record<ShortcutId, () => void>>;

export function useKeyboardShortcuts(handlers: ShortcutHandlers) {
  // Stabilize handlers reference to avoid re-binding on every render
  const handlersRef = useMemo(() => handlers, [handlers]);

  useEffect(() => {
    const bindings: Record<string, (e: KeyboardEvent) => void> = {};

    for (const [id, def] of Object.entries(SHORTCUTS)) {
      const handler = handlersRef[id as ShortcutId];
      if (handler) {
        bindings[def.keys] = (e: KeyboardEvent) => {
          e.preventDefault();
          handler();
        };
      }
    }

    const unsubscribe = tinykeys(window, bindings);
    return unsubscribe;
  }, [handlersRef]);
}
