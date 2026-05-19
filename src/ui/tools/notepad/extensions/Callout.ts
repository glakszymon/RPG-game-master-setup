/*
 * Callout — Custom Tiptap node for colored callout boxes.
 *
 * Renders as a div with a colored left border stripe.
 * Supports types: info, warning, success, danger.
 */

import { Node, mergeAttributes } from '@tiptap/core';

export type CalloutType = 'info' | 'warning' | 'success' | 'danger' | 'readaloud';

const CALLOUT_COLORS: Record<CalloutType, string> = {
  info: '#5B9BD5',
  warning: '#C9B06B',
  success: '#6BBF6B',
  danger: '#D55B5B',
  readaloud: '#D4A574',
};

const CALLOUT_STYLES: Partial<Record<CalloutType, string>> = {
  readaloud: 'border-left: 4px solid #D4A574; padding: 12px 16px; margin: 12px 0; border-radius: 4px; background: rgba(212, 165, 116, 0.08);',
};

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    callout: {
      setCallout: (attrs?: { type?: CalloutType }) => ReturnType;
      toggleCallout: (attrs?: { type?: CalloutType }) => ReturnType;
      unsetCallout: () => ReturnType;
    };
  }
}

export const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      type: {
        default: 'info' as CalloutType,
        parseHTML: (element: HTMLElement) => element.getAttribute('data-callout-type') || 'info',
        renderHTML: (attributes: { type: CalloutType }) => ({
          'data-callout-type': attributes.type,
          style: CALLOUT_STYLES[attributes.type] || `border-left: 4px solid ${CALLOUT_COLORS[attributes.type] || CALLOUT_COLORS.info}; padding: 12px 16px; margin: 12px 0; border-radius: 4px; background: rgba(255,255,255,0.03);`,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-callout-type]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes(HTMLAttributes), 0];
  },

  addCommands() {
    return {
      setCallout:
        (attrs) =>
        ({ commands }) => {
          return commands.wrapIn(this.name, attrs);
        },
      toggleCallout:
        (attrs) =>
        ({ commands }) => {
          return commands.toggleWrap(this.name, attrs);
        },
      unsetCallout:
        () =>
        ({ commands }) => {
          return commands.lift(this.name);
        },
    };
  },
});
