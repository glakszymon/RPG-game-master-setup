/*
 * StickyNote — ephemeral scratchpad floating widget.
 * Content is local state only — intentionally not persisted.
 */

import { useState, memo } from 'react';
import styles from './StickyNote.module.css';

export const StickyNote = memo(function StickyNote() {
  const [text, setText] = useState('');

  return (
    <textarea
      className={styles.textarea}
      value={text}
      onChange={(e) => setText(e.target.value)}
      placeholder="Quick note..."
      spellCheck={false}
    />
  );
});
