/* eslint-disable react-refresh/only-export-components */
/*
 * EventTag — Inline NodeView for in-world calendar events.
 *
 * After /event: shows input fields for day/month + event name.
 * Once confirmed: renders as an orange event badge.
 * Dispatches event to add a holiday/event to the campaign calendar.
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useState, useEffect, useRef } from 'react';

function EventTagView({ node, updateAttributes, editor }: NodeViewProps) {
  const [editing, setEditing] = useState(!node.attrs.confirmed);
  const [name, setName] = useState(node.attrs.eventName || '');
  const [day, setDay] = useState(String(node.attrs.day || ''));
  const [month, setMonth] = useState(String(node.attrs.month || ''));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  function handleConfirm() {
    const d = parseInt(day) || 0;
    const m = parseInt(month) || 0;
    const eventName = name.trim();
    if (!eventName || !d) return;

    updateAttributes({ eventName, day: d, month: m, confirmed: true });
    setEditing(false);

    // Dispatch event to add holiday to calendar
    window.dispatchEvent(new CustomEvent('notepad:add-event', {
      detail: { day: d, month: m, name: eventName, color: '#e8a838' },
    }));
  }

  if (editing && editor.isEditable) {
    return (
      <NodeViewWrapper as="span" style={{ display: 'inline-flex', alignItems: 'center' }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(232, 168, 56, 0.1)',
          border: '1px solid rgba(232, 168, 56, 0.3)',
          borderRadius: '4px',
          padding: '2px 6px',
          fontSize: '0.85em',
        }}>
          <span>🎉</span>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); } e.stopPropagation(); }}
            placeholder="Event name"
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: '#e8a838', fontSize: '1em', width: '100px', fontFamily: 'inherit',
            }}
          />
          <input
            type="number"
            value={day}
            onChange={e => setDay(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); } e.stopPropagation(); }}
            placeholder="Day"
            min="1"
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: '#e8a838', fontSize: '1em', width: '36px', fontFamily: 'inherit',
              textAlign: 'center',
            }}
          />
          <span style={{ color: '#e8a838', opacity: 0.5 }}>/</span>
          <input
            type="number"
            value={month}
            onChange={e => setMonth(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); } e.stopPropagation(); }}
            placeholder="Mo"
            min="0"
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: '#e8a838', fontSize: '1em', width: '30px', fontFamily: 'inherit',
              textAlign: 'center',
            }}
          />
          <button
            onClick={handleConfirm}
            onMouseDown={e => e.preventDefault()}
            style={{
              background: 'rgba(232, 168, 56, 0.2)',
              border: 'none', borderRadius: '3px',
              color: '#e8a838', cursor: 'pointer',
              fontSize: '11px', padding: '1px 4px',
            }}
          >
            ✓
          </button>
        </span>
      </NodeViewWrapper>
    );
  }

  const displayText = `${node.attrs.eventName} (${node.attrs.day}/${node.attrs.month})`;

  return (
    <NodeViewWrapper as="span" style={{ display: 'inline' }}>
      <span
        onDoubleClick={() => { if (editor.isEditable) setEditing(true); }}
        title="Double-click to edit"
        style={{
          background: 'rgba(232, 168, 56, 0.15)',
          color: '#e8a838',
          padding: '1px 8px',
          borderRadius: '4px',
          fontSize: '0.9em',
          whiteSpace: 'nowrap',
          userSelect: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        🎉 {displayText}
      </span>
    </NodeViewWrapper>
  );
}

export const EventTag = Node.create({
  name: 'eventTag',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      eventName: { default: '' },
      day: { default: 0 },
      month: { default: 0 },
      confirmed: { default: false },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-type="event-tag"]' }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-type': 'event-tag',
        'data-day': node.attrs.day,
        'data-month': node.attrs.month,
      }),
      `🎉 ${node.attrs.eventName || 'Event'}`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EventTagView);
  },
});
