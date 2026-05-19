/*
 * MacroBlock — Tiptap NodeView extension for macro step sequences.
 *
 * Renders as an atom block node with a React component (MacroBuilder).
 * Stores steps as a JSON array in the `steps` attribute.
 */

import { Node } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { MacroBuilderView } from './MacroBuilderView';

export interface MacroStep {
  id: string;
  type: 'load-map-preset' | 'play-music' | 'stop-music' | 'wait';
  label: string;
  payload: string; // JSON stringified payload (presetId, trackId, ms, etc.)
}

export const MacroBlock = Node.create({
  name: 'macroBlock',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      steps: {
        default: '[]',
        parseHTML: (element) => element.getAttribute('data-steps') || '[]',
        renderHTML: (attributes) => ({
          'data-steps': attributes.steps as string,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="macro-block"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', { ...HTMLAttributes, 'data-type': 'macro-block' }, 0];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MacroBuilderView);
  },
});
