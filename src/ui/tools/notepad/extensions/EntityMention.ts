/*
 * EntityMention — Inline node for @character mentions.
 *
 * Renders as a styled inline badge referencing a party-tracker character.
 */

import { Node, mergeAttributes } from '@tiptap/core';

export interface EntityMentionAttributes {
  entityId: string;
  entityName: string;
  entityType: string; // 'character' | 'creature'
}

export const EntityMention = Node.create({
  name: 'entityMention',

  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      entityId: { default: null },
      entityName: { default: '' },
      entityType: { default: 'character' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-entity-mention]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const icon = HTMLAttributes.entityType === 'creature' ? '🐉' : HTMLAttributes.entityType === 'npc' ? '🧑' : '👤';
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-entity-mention': HTMLAttributes.entityId,
        class: 'entity-mention-inline',
        style: 'background: rgba(201,176,107,0.15); color: #C9B06B; border-radius: 4px; padding: 1px 6px; font-size: 0.9em; white-space: nowrap;',
      }),
      `${icon} ${HTMLAttributes.entityName || 'Unknown'}`,
    ];
  },
});
