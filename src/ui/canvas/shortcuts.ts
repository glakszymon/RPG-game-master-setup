/*
 * shortcuts.ts — central shortcut registry.
 *
 * Add a new shortcut by adding one entry here and wiring its handler
 * in useKeyboardShortcuts. The help overlay reads from this registry.
 */

export interface ShortcutDefinition {
  /** tinykeys key format — $mod = Ctrl on Win/Linux, Cmd on Mac */
  keys: string;
  /** Human-readable label for display */
  label: string;
  /** Grouping for help overlay */
  category: 'Navigation' | 'Editing' | 'Window' | 'General';
  /** Description shown in help overlay */
  description: string;
}

export const SHORTCUTS = {
  undo: {
    keys: '$mod+KeyZ',
    label: 'Ctrl+Z',
    category: 'Editing',
    description: 'Cofnij ostatnią akcję',
  },
  redo: {
    keys: '$mod+KeyY',
    label: 'Ctrl+Y',
    category: 'Editing',
    description: 'Ponów cofniętą akcję',
  },
  zoomIn: {
    keys: '$mod+Equal',
    label: 'Ctrl+=',
    category: 'Navigation',
    description: 'Przybliż canvas',
  },
  zoomOut: {
    keys: '$mod+Minus',
    label: 'Ctrl+-',
    category: 'Navigation',
    description: 'Oddal canvas',
  },
  zoomReset: {
    keys: '$mod+Digit0',
    label: 'Ctrl+0',
    category: 'Navigation',
    description: 'Resetuj zoom do 100%',
  },
  escape: {
    keys: 'Escape',
    label: 'Escape',
    category: 'Window',
    description: 'Zamknij aktywne okno lub dialog',
  },
  helpPanel: {
    keys: '$mod+Shift+Slash',
    label: 'Ctrl+?',
    category: 'General',
    description: 'Pokaż listę skrótów',
  },
} as const satisfies Record<string, ShortcutDefinition>;

export type ShortcutId = keyof typeof SHORTCUTS;
