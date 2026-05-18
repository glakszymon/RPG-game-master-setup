/*
 * NotepadSidebar — File tree with folders and notes, supports drag & drop.
 */

import { useState } from 'react';
import type { NoteItem, NoteFolderItem } from '../types';
import styles from './NotepadSidebar.module.css';

interface NotepadSidebarProps {
  notes: NoteItem[];
  folders: NoteFolderItem[];
  activeNoteId: string | null;
  width: number;
  onSelectNote: (note: NoteItem) => void;
  onCreateNote: (folderId: string | null) => void;
  onDeleteNote: (id: string) => void;
  onCreateFolder: (parentId: string | null) => void;
  onRenameFolder: (id: string, name: string) => void;
  onDeleteFolder: (id: string) => void;
  onMoveNote: (noteId: string, targetFolderId: string | null) => void;
  onMoveFolder: (folderId: string, targetParentId: string | null) => void;
  onCollapse: () => void;
}

interface DragData {
  type: 'note' | 'folder';
  id: string;
}

export function NotepadSidebar({
  notes,
  folders,
  activeNoteId,
  width,
  onSelectNote,
  onCreateNote,
  onDeleteNote,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onMoveNote,
  onMoveFolder,
  onCollapse,
}: NotepadSidebarProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);

  function toggleFolder(id: string) {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startRename(folder: NoteFolderItem) {
    setEditingFolderId(folder.id);
    setEditingName(folder.name);
  }

  function commitRename() {
    if (editingFolderId && editingName.trim()) {
      onRenameFolder(editingFolderId, editingName.trim());
    }
    setEditingFolderId(null);
  }

  // ── Drag & Drop helpers ──

  function handleDragStart(e: React.DragEvent, data: DragData) {
    e.dataTransfer.setData('application/json', JSON.stringify(data));
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent, targetId: string | null) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropTargetId(targetId);
  }

  function handleDragLeave() {
    setDropTargetId(null);
  }

  function handleDrop(e: React.DragEvent, targetFolderId: string | null) {
    e.preventDefault();
    setDropTargetId(null);

    try {
      const data: DragData = JSON.parse(e.dataTransfer.getData('application/json'));
      if (data.type === 'note') {
        onMoveNote(data.id, targetFolderId);
      } else if (data.type === 'folder') {
        onMoveFolder(data.id, targetFolderId);
      }
    } catch {
      // invalid drag data
    }
  }

  // Get root folders and notes
  const rootFolders = folders.filter(f => !f.parentId);
  const rootNotes = notes.filter(n => !n.folderId);

  function renderFolder(folder: NoteFolderItem) {
    const isExpanded = expandedFolders.has(folder.id);
    const childFolders = folders.filter(f => f.parentId === folder.id);
    const childNotes = notes.filter(n => n.folderId === folder.id);
    const isDropTarget = dropTargetId === folder.id;

    return (
      <div key={folder.id} className={styles.folderGroup}>
        <div
          className={`${styles.folderRow} ${isDropTarget ? styles.dropTarget : ''}`}
          draggable
          onDragStart={e => handleDragStart(e, { type: 'folder', id: folder.id })}
          onDragOver={e => handleDragOver(e, folder.id)}
          onDragLeave={handleDragLeave}
          onDrop={e => handleDrop(e, folder.id)}
        >
          <button
            className={styles.folderToggle}
            onClick={() => toggleFolder(folder.id)}
          >
            {isExpanded ? '▾' : '▸'}
          </button>
          {editingFolderId === folder.id ? (
            <input
              className={styles.renameInput}
              value={editingName}
              onChange={e => setEditingName(e.target.value)}
              onBlur={commitRename}
              onKeyDown={e => { if (e.key === 'Enter') commitRename(); if (e.key === 'Escape') setEditingFolderId(null); }}
              autoFocus
            />
          ) : (
            <span
              className={styles.folderName}
              onDoubleClick={() => startRename(folder)}
            >
              📁 {folder.name}
            </span>
          )}
          <div className={styles.folderActions}>
            <button onClick={() => onCreateNote(folder.id)} title="New note">+</button>
            <button onClick={() => onDeleteFolder(folder.id)} title="Delete folder">×</button>
          </div>
        </div>
        {isExpanded && (
          <div className={styles.folderChildren}>
            {childFolders.map(renderFolder)}
            {childNotes.map(note => renderNote(note))}
          </div>
        )}
      </div>
    );
  }

  function renderNote(note: NoteItem) {
    return (
      <div
        key={note.id}
        className={`${styles.noteRow} ${note.id === activeNoteId ? styles.active : ''}`}
        draggable
        onDragStart={e => handleDragStart(e, { type: 'note', id: note.id })}
        onClick={() => onSelectNote(note)}
      >
        <span className={styles.noteTitle}>{note.title || 'Untitled'}</span>
        <button
          className={styles.deleteBtn}
          onClick={e => { e.stopPropagation(); onDeleteNote(note.id); }}
          title="Delete note"
        >
          ×
        </button>
      </div>
    );
  }

  return (
    <div className={styles.sidebar} style={{ width }}>
      <div className={styles.header}>
        <span className={styles.headerTitle}>Notes</span>
        <div className={styles.headerActions}>
          <button onClick={() => onCreateFolder(null)} title="New folder">📁+</button>
          <button onClick={() => onCreateNote(null)} title="New note">📄+</button>
          <button onClick={onCollapse} title="Collapse sidebar">«</button>
        </div>
      </div>
      <div
        className={`${styles.tree} ${dropTargetId === 'root' ? styles.dropTarget : ''}`}
        onDragOver={e => handleDragOver(e, 'root')}
        onDragLeave={handleDragLeave}
        onDrop={e => handleDrop(e, null)}
      >
        {rootFolders.map(renderFolder)}
        {rootNotes.map(renderNote)}
      </div>
    </div>
  );
}
