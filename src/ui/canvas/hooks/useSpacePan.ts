/*
 * useSpacePan — enables Space+drag panning over windows.
 *
 * While Space is held, the cursor changes to 'grab' and panning works
 * even when the pointer is over a window. Skips activation when the user
 * is focused on a text input/textarea/contenteditable.
 */

import { useEffect, useRef, useCallback } from 'react';

interface UseSpacePanOptions {
  /** The viewport element that receives the overlay */
  viewportRef: React.RefObject<HTMLElement | null>;
  /** Called when space-pan mode activates (add panning overlay) */
  onActivate: () => void;
  /** Called when space-pan mode deactivates */
  onDeactivate: () => void;
}

export function useSpacePan({ viewportRef, onActivate, onDeactivate }: UseSpacePanOptions) {
  const activeRef = useRef(false);

  const isInputFocused = useCallback(() => {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea') return true;
    if ((el as HTMLElement).isContentEditable) return true;
    return false;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' || e.repeat) return;
      if (isInputFocused()) return;

      e.preventDefault();
      activeRef.current = true;

      const vp = viewportRef.current;
      if (vp) vp.style.cursor = 'grab';
      onActivate();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code !== 'Space') return;
      if (!activeRef.current) return;

      activeRef.current = false;

      const vp = viewportRef.current;
      if (vp) vp.style.cursor = '';
      onDeactivate();
    };

    // If window loses focus while space is held, deactivate
    const handleBlur = () => {
      if (activeRef.current) {
        activeRef.current = false;
        const vp = viewportRef.current;
        if (vp) vp.style.cursor = '';
        onDeactivate();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('blur', handleBlur);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('blur', handleBlur);
    };
  }, [viewportRef, onActivate, onDeactivate, isInputFocused]);

  return { isSpacePanning: activeRef };
}
