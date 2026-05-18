/*
 * MusicMention — Inline atom node for referencing soundboard tracks.
 *
 * Triggered by typing `~track-name`. Renders as a colored badge with a music icon.
 */

import { Node, mergeAttributes } from '@tiptap/core';

export const MusicMention = Node.create({
  name: 'musicMention',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      trackId: { default: '' },
      trackName: { default: '' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="music-mention"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'music-mention',
        'data-track-id': node.attrs.trackId,
        style: 'background: rgba(147, 130, 220, 0.15); color: #9382dc; padding: 1px 6px; border-radius: 4px; font-size: 0.9em; white-space: nowrap;',
      }),
      `🎵 ${node.attrs.trackName || 'Unknown Track'}`,
    ];
  },
});
