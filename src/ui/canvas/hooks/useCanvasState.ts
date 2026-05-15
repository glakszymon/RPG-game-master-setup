/*
 * useCanvasState — central reducer for all canvas state.
 *
 * Manages windows array (open/close/move/resize/focus/pin/minimize),
 * background setting, and provides dispatch for all canvas actions.
 */

import { useReducer, useCallback } from 'react';
import type { CanvasState, WindowState, ToolType, BackgroundType } from '../types';
import { TOOL_DEFAULT_SIZES } from '../types';

// ── Actions ──

type CanvasAction =
  | { type: 'OPEN_WINDOW'; toolType: ToolType; x: number; y: number }
  | { type: 'CLOSE_WINDOW'; id: string }
  | { type: 'MOVE_WINDOW'; id: string; x: number; y: number }
  | { type: 'RESIZE_WINDOW'; id: string; x: number; y: number; width: number; height: number }
  | { type: 'MINIMIZE_WINDOW'; id: string }
  | { type: 'RESTORE_WINDOW'; id: string }
  | { type: 'FOCUS_WINDOW'; id: string }
  | { type: 'TOGGLE_PIN'; id: string }
  | { type: 'UPDATE_TOOL_STATE'; id: string; toolState: unknown }
  | { type: 'SET_BACKGROUND'; background: BackgroundType }
  | { type: 'LOAD_STATE'; state: CanvasState };

export type { CanvasAction };

// ── Helpers ──

let idCounter = 0;
function generateId(): string {
  return `win_${Date.now()}_${++idCounter}`;
}

/** Apply cascade offset when new window overlaps existing one at same position */
function cascadePosition(
  x: number,
  y: number,
  windows: WindowState[],
): { x: number; y: number } {
  const OFFSET = 24;
  let finalX = x;
  let finalY = y;

  // Check for exact overlap and offset
  for (let i = 0; i < 20; i++) {
    const overlaps = windows.some(
      (w) => !w.minimized && Math.abs(w.x - finalX) < 10 && Math.abs(w.y - finalY) < 10,
    );
    if (!overlaps) break;
    finalX += OFFSET;
    finalY += OFFSET;
  }

  return { x: finalX, y: finalY };
}

/** Move a window to the end of its group (unpinned or pinned) for z-order */
function bringToFront(windows: WindowState[], id: string): WindowState[] {
  const idx = windows.findIndex((w) => w.id === id);
  if (idx === -1) return windows;

  const win = windows[idx];
  const rest = windows.filter((_, i) => i !== idx);

  // Split into unpinned and pinned groups
  const unpinned = rest.filter((w) => !w.pinned);
  const pinned = rest.filter((w) => w.pinned);

  if (win.pinned) {
    return [...unpinned, ...pinned, win];
  } else {
    return [...unpinned, win, ...pinned];
  }
}

// ── Reducer ──

function canvasReducer(state: CanvasState, action: CanvasAction): CanvasState {
  switch (action.type) {
    case 'OPEN_WINDOW': {
      const defaults = TOOL_DEFAULT_SIZES[action.toolType];
      const { x, y } = cascadePosition(action.x, action.y, state.windows);
      const newWindow: WindowState = {
        id: generateId(),
        toolType: action.toolType,
        x,
        y,
        width: defaults.width,
        height: defaults.height,
        pinned: false,
        minimized: false,
        toolState: null,
      };
      // New window goes at end of unpinned group (before pinned)
      const unpinned = state.windows.filter((w) => !w.pinned);
      const pinned = state.windows.filter((w) => w.pinned);
      return {
        ...state,
        windows: [...unpinned, newWindow, ...pinned],
      };
    }

    case 'CLOSE_WINDOW':
      return {
        ...state,
        windows: state.windows.filter((w) => w.id !== action.id),
      };

    case 'MOVE_WINDOW':
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === action.id ? { ...w, x: action.x, y: action.y } : w,
        ),
      };

    case 'RESIZE_WINDOW':
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === action.id
            ? { ...w, x: action.x, y: action.y, width: action.width, height: action.height }
            : w,
        ),
      };

    case 'MINIMIZE_WINDOW':
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === action.id ? { ...w, minimized: true } : w,
        ),
      };

    case 'RESTORE_WINDOW':
      return {
        ...state,
        windows: bringToFront(
          state.windows.map((w) =>
            w.id === action.id ? { ...w, minimized: false } : w,
          ),
          action.id,
        ),
      };

    case 'FOCUS_WINDOW':
      return {
        ...state,
        windows: bringToFront(state.windows, action.id),
      };

    case 'TOGGLE_PIN': {
      const updated = state.windows.map((w) =>
        w.id === action.id ? { ...w, pinned: !w.pinned } : w,
      );
      // Re-sort: unpinned first, then pinned
      const unpinned = updated.filter((w) => !w.pinned);
      const pinned = updated.filter((w) => w.pinned);
      return { ...state, windows: [...unpinned, ...pinned] };
    }

    case 'UPDATE_TOOL_STATE': {
      const ts = action.toolState as Record<string, unknown> | undefined;
      console.log('[canvasReducer] UPDATE_TOOL_STATE — winId:', action.id, 'imagePath:', ts?.imagePath, 'tokens:', Array.isArray(ts?.tokens) ? (ts.tokens as unknown[]).length : 'N/A');
      return {
        ...state,
        windows: state.windows.map((w) =>
          w.id === action.id ? { ...w, toolState: action.toolState } : w,
        ),
      };
    }

    case 'SET_BACKGROUND':
      return { ...state, background: action.background };

    case 'LOAD_STATE':
      return action.state;

    default:
      return state;
  }
}

export { canvasReducer };

// ── Hook ──

export const initialCanvasState: CanvasState = {
  windows: [],
  background: 'dot-grid',
  nextWindowId: 0,
};

export function useCanvasState() {
  const [state, dispatch] = useReducer(canvasReducer, initialCanvasState);

  const openWindow = useCallback(
    (toolType: ToolType, x: number, y: number) =>
      dispatch({ type: 'OPEN_WINDOW', toolType, x, y }),
    [],
  );

  const closeWindow = useCallback(
    (id: string) => dispatch({ type: 'CLOSE_WINDOW', id }),
    [],
  );

  const moveWindow = useCallback(
    (id: string, x: number, y: number) =>
      dispatch({ type: 'MOVE_WINDOW', id, x, y }),
    [],
  );

  const resizeWindow = useCallback(
    (id: string, x: number, y: number, width: number, height: number) =>
      dispatch({ type: 'RESIZE_WINDOW', id, x, y, width, height }),
    [],
  );

  const minimizeWindow = useCallback(
    (id: string) => dispatch({ type: 'MINIMIZE_WINDOW', id }),
    [],
  );

  const restoreWindow = useCallback(
    (id: string) => dispatch({ type: 'RESTORE_WINDOW', id }),
    [],
  );

  const focusWindow = useCallback(
    (id: string) => dispatch({ type: 'FOCUS_WINDOW', id }),
    [],
  );

  const togglePin = useCallback(
    (id: string) => dispatch({ type: 'TOGGLE_PIN', id }),
    [],
  );

  const updateToolState = useCallback(
    (id: string, toolState: unknown) =>
      dispatch({ type: 'UPDATE_TOOL_STATE', id, toolState }),
    [],
  );

  const setBackground = useCallback(
    (background: BackgroundType) =>
      dispatch({ type: 'SET_BACKGROUND', background }),
    [],
  );

  return {
    state,
    dispatch,
    openWindow,
    closeWindow,
    moveWindow,
    resizeWindow,
    minimizeWindow,
    restoreWindow,
    focusWindow,
    togglePin,
    updateToolState,
    setBackground,
  };
}
