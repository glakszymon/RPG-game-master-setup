/*
 * EditorToolbar — Formatting buttons for the Tiptap editor.
 */

import type { Editor } from '@tiptap/react';
import styles from './EditorToolbar.module.css';

interface EditorToolbarProps {
  editor: Editor | null;
}

export function EditorToolbar({ editor }: EditorToolbarProps) {
  if (!editor) return null;

  return (
    <div className={styles.toolbar}>
      <button
        className={`${styles.btn} ${editor.isActive('bold') ? styles.active : ''}`}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
      >
        B
      </button>
      <button
        className={`${styles.btn} ${editor.isActive('italic') ? styles.active : ''}`}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
      >
        I
      </button>
      <button
        className={`${styles.btn} ${editor.isActive('strike') ? styles.active : ''}`}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough"
      >
        S̶
      </button>
      <span className={styles.divider} />
      <button
        className={`${styles.btn} ${editor.isActive('heading', { level: 1 }) ? styles.active : ''}`}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Heading 1"
      >
        H1
      </button>
      <button
        className={`${styles.btn} ${editor.isActive('heading', { level: 2 }) ? styles.active : ''}`}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Heading 2"
      >
        H2
      </button>
      <button
        className={`${styles.btn} ${editor.isActive('heading', { level: 3 }) ? styles.active : ''}`}
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="Heading 3"
      >
        H3
      </button>
      <span className={styles.divider} />
      <button
        className={`${styles.btn} ${editor.isActive('bulletList') ? styles.active : ''}`}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet list"
      >
        •
      </button>
      <button
        className={`${styles.btn} ${editor.isActive('orderedList') ? styles.active : ''}`}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Ordered list"
      >
        1.
      </button>
      <button
        className={`${styles.btn} ${editor.isActive('taskList') ? styles.active : ''}`}
        onClick={() => editor.chain().focus().toggleTaskList().run()}
        title="Task list"
      >
        ☐
      </button>
      <span className={styles.divider} />
      <button
        className={`${styles.btn} ${editor.isActive('blockquote') ? styles.active : ''}`}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Quote"
      >
        ❝
      </button>
      <button
        className={`${styles.btn} ${editor.isActive('codeBlock') ? styles.active : ''}`}
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        title="Code block"
      >
        {'</>'}
      </button>
      <button
        className={`${styles.btn} ${editor.isActive('highlight') ? styles.active : ''}`}
        onClick={() => editor.chain().focus().toggleHighlight().run()}
        title="Highlight"
      >
        ✦
      </button>
      <span className={styles.divider} />
      <button
        className={`${styles.btn} ${editor.isActive('callout', { type: 'readaloud' }) ? styles.active : ''}`}
        onClick={() => editor.chain().focus().toggleCallout({ type: 'readaloud' }).run()}
        title="Read Aloud — text to read to players"
      >
        <span className="material-symbols-outlined" style={{ fontSize: '18px' }}>record_voice_over</span>
      </button>
    </div>
  );
}
