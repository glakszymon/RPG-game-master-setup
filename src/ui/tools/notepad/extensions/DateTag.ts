/*
 * DateTag — Inline atom node for in-world dates.
 *
 * Inserted via slash command `/date` or by typing inline.
 * Renders as a colored badge with a calendar icon.
 */

import { Node, mergeAttributes } from '@tiptap/core';

export const DateTag = Node.create({
  name: 'dateTag',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      dateText: { default: '' }, // e.g. "15 Mirtul, Year 1492"
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="date-tag"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'date-tag',
        style: 'background: rgba(100, 180, 130, 0.15); color: #64b482; padding: 1px 6px; border-radius: 4px; font-size: 0.9em; white-space: nowrap;',
      }),
      `📅 ${node.attrs.dateText || 'Unknown Date'}`,
    ];
  },
});
