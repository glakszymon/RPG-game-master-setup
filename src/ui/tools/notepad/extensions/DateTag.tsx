/* eslint-disable react-refresh/only-export-components */
/*
 * DateTag — Inline NodeView for in-world calendar dates.
 *
 * After /date: shows input fields for day/month/year.
 * Once confirmed: renders as a green date badge.
 * Dispatches event for calendar tool integration.
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useState, useEffect, useRef } from 'react';

function DateTagView({ node, updateAttributes, editor }: NodeViewProps) {
  const [editing, setEditing] = useState(!node.attrs.confirmed);
  const [value, setValue] = useState(node.attrs.dateText || '');
  const [day, setDay] = useState(String(node.attrs.day || ''));
  const [month, setMonth] = useState(String(node.attrs.month || ''));
  const [year, setYear] = useState(String(node.attrs.year || ''));
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  function handleConfirm() {
    const d = parseInt(day) || 0;
    const m = parseInt(month) || 0;
    const y = parseInt(year) || 0;
    const text = value.trim() || `Day ${d}, Month ${m}, Year ${y}`;
    if (!d && !text) return;

    updateAttributes({ dateText: text, day: d, month: m, year: y, confirmed: true });
    setEditing(false);

    // Dispatch event for calendar integration
    document.dispatchEvent(new CustomEvent('notepad:date-created', {
      detail: { dateText: text, day: d, month: m, year: y },
    }));
  }

  if (editing && editor.isEditable) {
    return (
      <NodeViewWrapper as="span" style={{ display: 'inline-flex', alignItems: 'center' }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(100, 180, 130, 0.1)',
          border: '1px solid rgba(100, 180, 130, 0.3)',
          borderRadius: '4px',
          padding: '2px 6px',
          fontSize: '0.85em',
        }}>
          <span>📅</span>
          <input
            ref={inputRef}
            type="number"
            value={day}
            onChange={e => setDay(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); } e.stopPropagation(); }}
            placeholder="Day"
            min="1"
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: '#64b482', fontSize: '1em', width: '36px', fontFamily: 'inherit',
              textAlign: 'center',
            }}
          />
          <span style={{ color: '#64b482', opacity: 0.5 }}>/</span>
          <input
            type="number"
            value={month}
            onChange={e => setMonth(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); } e.stopPropagation(); }}
            placeholder="Mo"
            min="0"
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: '#64b482', fontSize: '1em', width: '30px', fontFamily: 'inherit',
              textAlign: 'center',
            }}
          />
          <span style={{ color: '#64b482', opacity: 0.5 }}>/</span>
          <input
            type="number"
            value={year}
            onChange={e => setYear(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); } e.stopPropagation(); }}
            placeholder="Year"
            min="1"
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: '#64b482', fontSize: '1em', width: '44px', fontFamily: 'inherit',
              textAlign: 'center',
            }}
          />
          <input
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); } e.stopPropagation(); }}
            placeholder="Label (optional)"
            style={{
              background: 'transparent', border: 'none', outline: 'none',
              color: '#64b482', fontSize: '1em', width: '90px', fontFamily: 'inherit',
            }}
          />
          <button
            onClick={handleConfirm}
            onMouseDown={e => e.preventDefault()}
            style={{
              background: 'rgba(100, 180, 130, 0.2)',
              border: 'none', borderRadius: '3px',
              color: '#64b482', cursor: 'pointer',
              fontSize: '11px', padding: '1px 4px',
            }}
          >
            ✓
          </button>
        </span>
      </NodeViewWrapper>
    );
  }

  const displayText = node.attrs.dateText || `${node.attrs.day}/${node.attrs.month}/${node.attrs.year}`;

  return (
    <NodeViewWrapper as="span" style={{ display: 'inline' }}>
      <span
        onDoubleClick={() => { if (editor.isEditable) setEditing(true); }}
        title="Double-click to edit"
        style={{
          background: 'rgba(100, 180, 130, 0.15)',
          color: '#64b482',
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
        📅 {displayText}
      </span>
    </NodeViewWrapper>
  );
}

export const DateTag = Node.create({
  name: 'dateTag',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      dateText: { default: '' },
      day: { default: 0 },
      month: { default: 0 },
      year: { default: 0 },
      confirmed: { default: false },
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
        'data-day': node.attrs.day,
        'data-month': node.attrs.month,
        'data-year': node.attrs.year,
      }),
      `📅 ${node.attrs.dateText || 'Unknown Date'}`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DateTagView);
  },
});
