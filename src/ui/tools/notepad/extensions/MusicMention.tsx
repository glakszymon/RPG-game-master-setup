/* eslint-disable react-refresh/only-export-components */
/*
 * MusicMention — Inline NodeView for soundboard track references.
 *
 * After /music: shows an input field to type track name.
 * Once confirmed: renders as a purple play button badge.
 * Clicking the badge dispatches a CustomEvent to trigger playback.
 */

import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer, NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useState, useEffect, useRef } from 'react';

function MusicMentionView({ node, updateAttributes, editor }: NodeViewProps) {
  const [editing, setEditing] = useState(!node.attrs.confirmed);
  const [value, setValue] = useState(node.attrs.trackName || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
    }
  }, [editing]);

  function handleConfirm() {
    if (!value.trim()) return;
    updateAttributes({ trackName: value.trim(), confirmed: true });
    setEditing(false);
  }

  function handlePlay() {
    document.dispatchEvent(new CustomEvent('notepad:play-music', {
      detail: { trackId: node.attrs.trackId, trackName: node.attrs.trackName },
    }));
  }

  if (editing && editor.isEditable) {
    return (
      <NodeViewWrapper as="span" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
        <span style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          background: 'rgba(147, 130, 220, 0.1)',
          border: '1px solid rgba(147, 130, 220, 0.3)',
          borderRadius: '4px',
          padding: '1px 6px',
        }}>
          <span>🎵</span>
          <input
            ref={inputRef}
            type="text"
            value={value}
            onChange={e => setValue(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); handleConfirm(); }
              if (e.key === 'Escape') { e.preventDefault(); setEditing(false); }
              e.stopPropagation();
            }}
            placeholder="Track name..."
            style={{
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#9382dc',
              fontSize: '0.9em',
              width: '120px',
              fontFamily: 'inherit',
            }}
          />
          <button
            onClick={handleConfirm}
            onMouseDown={e => e.preventDefault()}
            style={{
              background: 'rgba(147, 130, 220, 0.2)',
              border: 'none',
              borderRadius: '3px',
              color: '#9382dc',
              cursor: 'pointer',
              fontSize: '11px',
              padding: '1px 4px',
            }}
          >
            ✓
          </button>
        </span>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper as="span" style={{ display: 'inline' }}>
      <span
        onClick={handlePlay}
        onDoubleClick={() => { if (editor.isEditable) setEditing(true); }}
        title={`Play: ${node.attrs.trackName}`}
        style={{
          background: 'rgba(147, 130, 220, 0.15)',
          color: '#9382dc',
          padding: '1px 8px',
          borderRadius: '4px',
          fontSize: '0.9em',
          whiteSpace: 'nowrap',
          cursor: 'pointer',
          userSelect: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
        }}
      >
        ▶ {node.attrs.trackName || 'Unknown Track'}
      </span>
    </NodeViewWrapper>
  );
}

export const MusicMention = Node.create({
  name: 'musicMention',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      trackId: { default: '' },
      trackName: { default: '' },
      confirmed: { default: false },
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
      }),
      `🎵 ${node.attrs.trackName || 'Unknown Track'}`,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(MusicMentionView);
  },
});
