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
  preset1: {
    keys: '$mod+Digit1',
    label: 'Ctrl+1',
    category: 'Window',
    description: 'Aktywuj preset 1',
  },
  preset2: {
    keys: '$mod+Digit2',
    label: 'Ctrl+2',
    category: 'Window',
    description: 'Aktywuj preset 2',
  },
  preset3: {
    keys: '$mod+Digit3',
    label: 'Ctrl+3',
    category: 'Window',
    description: 'Aktywuj preset 3',
  },
  preset4: {
    keys: '$mod+Digit4',
    label: 'Ctrl+4',
    category: 'Window',
    description: 'Aktywuj preset 4',
  },
  preset5: {
    keys: '$mod+Digit5',
    label: 'Ctrl+5',
    category: 'Window',
    description: 'Aktywuj preset 5',
  },
  preset6: {
    keys: '$mod+Digit6',
    label: 'Ctrl+6',
    category: 'Window',
    description: 'Aktywuj preset 6',
  },
  preset7: {
    keys: '$mod+Digit7',
    label: 'Ctrl+7',
    category: 'Window',
    description: 'Aktywuj preset 7',
  },
  preset8: {
    keys: '$mod+Digit8',
    label: 'Ctrl+8',
    category: 'Window',
    description: 'Aktywuj preset 8',
  },
  preset9: {
    keys: '$mod+Digit9',
    label: 'Ctrl+9',
    category: 'Window',
    description: 'Aktywuj preset 9',
  },
  settings: {
    keys: '$mod+Comma',
    label: 'Ctrl+,',
    category: 'General',
    description: 'Otwórz ustawienia kampanii',
  },
} as const satisfies Record<string, ShortcutDefinition>;

export type ShortcutId = keyof typeof SHORTCUTS;
