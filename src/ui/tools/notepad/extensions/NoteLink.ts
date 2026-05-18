/*
 * NoteLink — Inline node extension for linking between notes.
 *
 * Renders as a clickable inline link with a special style.
 * Stores target note ID and displays title. Shows broken indicator
 * if target note no longer exists.
 */

import { Node, mergeAttributes } from '@tiptap/core';

export interface NoteLinkAttributes {
  noteId: string;
  noteTitle: string;
}

export const NoteLink = Node.create({
  name: 'noteLink',

  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      noteId: { default: null },
      noteTitle: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-note-link]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-note-link': HTMLAttributes.noteId,
        class: 'note-link-inline',
        style: 'color: #C9B06B; cursor: pointer; border-bottom: 1px dashed rgba(201,176,107,0.5); padding: 0 2px;',
      }),
      `📄 ${HTMLAttributes.noteTitle || 'Untitled'}`,
    ];
  },
});
