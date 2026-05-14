/*
 * useUndoRedo — wraps a canvas reducer with undo/redo history.
 *
 * Records state snapshots for undo. Drag/resize operations are coalesced
 * (only the state before drag starts is saved, not intermediate moves).
 * Max history: 50 entries.
 */

import { useCallback, useRef, useState } from 'react';
import type { CanvasState } from '../types';
import type { CanvasAction } from './useCanvasState';

const MAX_HISTORY = 50;

/** Actions that should NOT create undo entries */
const IGNORED_ACTIONS: Set<CanvasAction['type']> = new Set([
  'UPDATE_TOOL_STATE',
  'LOAD_STATE',
]);

/** Actions that are coalesced while dragging/resizing */
const COALESCED_ACTIONS: Set<CanvasAction['type']> = new Set([
  'MOVE_WINDOW',
  'RESIZE_WINDOW',
]);

export function useUndoRedo(
  reducer: (state: CanvasState, action: CanvasAction) => CanvasState,
  initialState: CanvasState,
) {
  const [present, setPresent] = useState(initialState);
  const pastRef = useRef<CanvasState[]>([]);
  const futureRef = useRef<CanvasState[]>([]);

  // Coalescing: during drag/resize, we save one snapshot before it starts
  const coalescingRef = useRef(false);
  const preCoalesceRef = useRef<CanvasState | null>(null);

  /** Call before starting a drag/resize */
  const startCoalescing = useCallback(() => {
    coalescingRef.current = true;
    preCoalesceRef.current = null; // Will be captured on first coalesced action
  }, []);

  /** Call when drag/resize ends */
  const endCoalescing = useCallback(() => {
    if (preCoalesceRef.current) {
      pastRef.current = [...pastRef.current, preCoalesceRef.current].slice(-MAX_HISTORY);
      futureRef.current = [];
    }
    coalescingRef.current = false;
    preCoalesceRef.current = null;
  }, []);

  const dispatch = useCallback(
    (action: CanvasAction) => {
      setPresent((prev) => {
        const next = reducer(prev, action);
        if (next === prev) return prev;

        if (IGNORED_ACTIONS.has(action.type)) {
          return next;
        }

        if (COALESCED_ACTIONS.has(action.type)) {
          // Save snapshot of state before first coalesced action
          if (coalescingRef.current && !preCoalesceRef.current) {
            preCoalesceRef.current = prev;
          }
          // Don't push to history during coalescing
          return next;
        }

        // Normal action — push current state to past
        pastRef.current = [...pastRef.current, prev].slice(-MAX_HISTORY);
        futureRef.current = [];
        return next;
      });
    },
    [reducer],
  );

  const undo = useCallback(() => {
    setPresent((prev) => {
      if (pastRef.current.length === 0) return prev;
      const previous = pastRef.current[pastRef.current.length - 1];
      pastRef.current = pastRef.current.slice(0, -1);
      futureRef.current = [prev, ...futureRef.current];
      return previous;
    });
  }, []);

  const redo = useCallback(() => {
    setPresent((prev) => {
      if (futureRef.current.length === 0) return prev;
      const next = futureRef.current[0];
      pastRef.current = [...pastRef.current, prev].slice(-MAX_HISTORY);
      futureRef.current = futureRef.current.slice(1);
      return next;
    });
  }, []);

  return {
    state: present,
    dispatch,
    undo,
    redo,
    canUndo: pastRef.current.length > 0,
    canRedo: futureRef.current.length > 0,
    startCoalescing,
    endCoalescing,
  };
}
