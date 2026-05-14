/*
 * useUndoRedo — wraps a canvas reducer with undo/redo history.
 *
 * Uses useReducer internally (not useState) to avoid batching issues
 * with rapid pointer-event-driven dispatches.
 *
 * Drag/resize operations are coalesced: only the state before the first
 * move is saved to history. Max history: 50 entries.
 */

import { useReducer, useCallback, useMemo } from 'react';
import type { CanvasState } from '../types';
import type { CanvasAction } from './useCanvasState';

const MAX_HISTORY = 50;

/** Actions that should NOT create undo entries */
const IGNORED_ACTIONS: Set<CanvasAction['type']> = new Set([
  'UPDATE_TOOL_STATE',
  'LOAD_STATE',
  'SET_BACKGROUND',
]);

/** Actions that are coalesced while dragging/resizing */
const COALESCED_ACTIONS: Set<CanvasAction['type']> = new Set([
  'MOVE_WINDOW',
  'RESIZE_WINDOW',
]);

// ── Internal action types ──

type UndoMetaAction =
  | { kind: 'canvas'; action: CanvasAction }
  | { kind: 'undo' }
  | { kind: 'redo' }
  | { kind: 'start_coalesce' }
  | { kind: 'end_coalesce' };

interface UndoState {
  past: CanvasState[];
  present: CanvasState;
  future: CanvasState[];
  coalescing: boolean;
  preCoalesce: CanvasState | null;
}

function makeReducer(canvasReducer: (s: CanvasState, a: CanvasAction) => CanvasState) {
  return (state: UndoState, meta: UndoMetaAction): UndoState => {
    switch (meta.kind) {
      case 'undo': {
        if (state.past.length === 0) return state;
        const previous = state.past[state.past.length - 1];
        return {
          ...state,
          past: state.past.slice(0, -1),
          present: previous,
          future: [state.present, ...state.future],
        };
      }

      case 'redo': {
        if (state.future.length === 0) return state;
        const next = state.future[0];
        return {
          ...state,
          past: [...state.past, state.present].slice(-MAX_HISTORY),
          present: next,
          future: state.future.slice(1),
        };
      }

      case 'start_coalesce':
        return { ...state, coalescing: true, preCoalesce: null };

      case 'end_coalesce': {
        if (state.preCoalesce) {
          return {
            ...state,
            coalescing: false,
            preCoalesce: null,
            past: [...state.past, state.preCoalesce].slice(-MAX_HISTORY),
            future: [],
          };
        }
        return { ...state, coalescing: false, preCoalesce: null };
      }

      case 'canvas': {
        const { action } = meta;
        const newPresent = canvasReducer(state.present, action);

        if (newPresent === state.present) return state;

        // Ignored — update without history
        if (IGNORED_ACTIONS.has(action.type)) {
          return { ...state, present: newPresent };
        }

        // Coalesced — update present, save pre-coalesce snapshot once
        if (COALESCED_ACTIONS.has(action.type)) {
          return {
            ...state,
            present: newPresent,
            preCoalesce: state.coalescing && !state.preCoalesce ? state.present : state.preCoalesce,
            future: [],
          };
        }

        // Normal action — push current present to history
        return {
          ...state,
          past: [...state.past, state.present].slice(-MAX_HISTORY),
          present: newPresent,
          future: [],
        };
      }

      default:
        return state;
    }
  };
}

export function useUndoRedo(
  canvasReducer: (state: CanvasState, action: CanvasAction) => CanvasState,
  initialState: CanvasState,
) {
  // Stable reducer — canvasReducer is a module-level function that never changes
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const reducer = useMemo(() => makeReducer(canvasReducer), []);

  const [undoState, undoDispatch] = useReducer(reducer, {
    past: [],
    present: initialState,
    future: [],
    coalescing: false,
    preCoalesce: null,
  });

  const dispatch = useCallback(
    (action: CanvasAction) => undoDispatch({ kind: 'canvas', action }),
    [],
  );

  const undo = useCallback(() => undoDispatch({ kind: 'undo' }), []);
  const redo = useCallback(() => undoDispatch({ kind: 'redo' }), []);
  const startCoalescing = useCallback(() => undoDispatch({ kind: 'start_coalesce' }), []);
  const endCoalescing = useCallback(() => undoDispatch({ kind: 'end_coalesce' }), []);

  return {
    state: undoState.present,
    dispatch,
    undo,
    redo,
    canUndo: undoState.past.length > 0,
    canRedo: undoState.future.length > 0,
    startCoalescing,
    endCoalescing,
  };
}
