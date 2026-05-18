/*
 * SearchDialog — Search across all notes in the campaign.
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { NoteItem } from '../types';
import styles from './SearchDialog.module.css';

interface SearchDialogProps {
  notes: NoteItem[];
  onSelectNote: (note: NoteItem) => void;
  onClose: () => void;
}

interface SearchResult {
  note: NoteItem;
  snippet: string;
}

function extractText(node: unknown): string {
  if (!node || typeof node !== 'object') return '';
  const n = node as { text?: string; content?: unknown[] };
  if (n.text) return n.text;
  if (n.content) return n.content.map(extractText).join(' ');
  return '';
}

export function SearchDialog({ notes, onSelectNote, onClose }: SearchDialogProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const search = useCallback(
    (q: string) => {
      setQuery(q);
      if (!q.trim()) {
        setResults([]);
        return;
      }

      const lower = q.toLowerCase();
      const found: SearchResult[] = [];

      for (const note of notes) {
        // Search title
        if (note.title.toLowerCase().includes(lower)) {
          found.push({ note, snippet: note.title });
          continue;
        }
        // Search content text
        try {
          const content = JSON.parse(note.contentJson);
          const text = extractText(content);
          const idx = text.toLowerCase().indexOf(lower);
          if (idx !== -1) {
            const start = Math.max(0, idx - 30);
            const end = Math.min(text.length, idx + q.length + 30);
            const snippet = (start > 0 ? '...' : '') + text.slice(start, end) + (end < text.length ? '...' : '');
            found.push({ note, snippet });
          }
        } catch {
          // skip malformed content
        }
      }

      setResults(found.slice(0, 20));
      setSelectedIndex(0);
    },
    [notes],
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      onSelectNote(results[selectedIndex].note);
      onClose();
    }
  }

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.dialog} onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          className={styles.input}
          placeholder="Search notes..."
          value={query}
          onChange={e => search(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        {results.length > 0 && (
          <div className={styles.results}>
            {results.map((r, i) => (
              <button
                key={r.note.id}
                className={`${styles.result} ${i === selectedIndex ? styles.selected : ''}`}
                onClick={() => { onSelectNote(r.note); onClose(); }}
                onMouseEnter={() => setSelectedIndex(i)}
              >
                <span className={styles.resultTitle}>{r.note.title}</span>
                <span className={styles.resultSnippet}>{r.snippet}</span>
              </button>
            ))}
          </div>
        )}
        {query && results.length === 0 && (
          <div className={styles.empty}>No results found</div>
        )}
      </div>
    </div>
  );
}
