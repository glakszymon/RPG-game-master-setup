/*
 * Notepad — Block editor tool for game master notes.
 *
 * Two-panel layout: file tree sidebar + Tiptap editor.
 * Autosaves content to SQLite via IPC.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import { Callout } from './extensions/Callout';
import { SLASH_COMMANDS } from './extensions/SlashCommands';
import type { SlashCommandItem } from './extensions/SlashCommands';
import { NotepadSidebar } from './components/NotepadSidebar';
import { EditorToolbar } from './components/EditorToolbar';
import { SearchDialog } from './components/SearchDialog';
import { SlashCommandsMenu } from './components/SlashCommandsMenu';
import { DEFAULT_NOTEPAD_STATE } from './types';
import type { NotepadToolState, NoteItem, NoteFolderItem } from './types';
import styles from './Notepad.module.css';

interface NotepadProps {
  toolState: NotepadToolState | undefined;
  onToolStateChange: (state: unknown) => void;
  campaignId: string;
}

export function Notepad({ toolState, onToolStateChange, campaignId }: NotepadProps) {
  const state = toolState ?? DEFAULT_NOTEPAD_STATE;
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [folders, setFolders] = useState<NoteFolderItem[]>([]);
  const [activeNote, setActiveNote] = useState<NoteItem | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [slashMenu, setSlashMenu] = useState<{ items: SlashCommandItem[]; pos: { top: number; left: number } } | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingRef = useRef(false);

  const patchState = useCallback(
    (patch: Partial<NotepadToolState>) => {
      onToolStateChange({ ...state, ...patch });
    },
    [state, onToolStateChange],
  );

  // ── Tiptap Editor ──

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: 'Start writing... Use / for commands',
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Callout,
    ],
    content: '',
    onUpdate: ({ editor: ed }) => {
      if (loadingRef.current) return;
      debouncedSave(ed.getJSON());

      // Check for slash command trigger
      const { from } = ed.state.selection;
      const textBefore = ed.state.doc.textBetween(
        Math.max(0, from - 20),
        from,
        '\n',
      );
      const slashMatch = textBefore.match(/\/(\w*)$/);
      if (slashMatch) {
        const query = slashMatch[1];
        const filtered = SLASH_COMMANDS.filter(item =>
          item.title.toLowerCase().includes(query.toLowerCase()),
        );
        if (filtered.length > 0) {
          // Get cursor position for menu placement
          const coords = ed.view.coordsAtPos(from);
          const editorRect = ed.view.dom.closest(`.${styles.editorContent}`)?.getBoundingClientRect();
          if (editorRect) {
            setSlashMenu({
              items: filtered,
              pos: { top: coords.bottom - editorRect.top + 4, left: coords.left - editorRect.left },
            });
          }
        } else {
          setSlashMenu(null);
        }
      } else {
        setSlashMenu(null);
      }
    },
  });

  // ── Load data ──

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  async function loadData() {
    const api = window.electronAPI;
    if (!api) return;

    const [noteRows, folderRows] = await Promise.all([
      api.notes.list(campaignId),
      api.noteFolders.list(campaignId),
    ]);

    setNotes(noteRows.map(r => ({
      id: r.id,
      campaignId: r.campaign_id,
      folderId: r.folder_id,
      title: r.title,
      contentJson: r.content_json,
      sortOrder: r.sort_order,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    })));

    setFolders(folderRows.map(r => ({
      id: r.id,
      campaignId: r.campaign_id,
      parentId: r.parent_id,
      name: r.name,
      sortOrder: r.sort_order,
      createdAt: r.created_at,
    })));

    // Restore active note
    if (state.activeNoteId) {
      const noteRow = await api.notes.get(state.activeNoteId);
      if (noteRow) {
        loadNoteIntoEditor({
          id: noteRow.id,
          campaignId: noteRow.campaign_id,
          folderId: noteRow.folder_id,
          title: noteRow.title,
          contentJson: noteRow.content_json,
          sortOrder: noteRow.sort_order,
          createdAt: noteRow.created_at,
          updatedAt: noteRow.updated_at,
        });
      }
    }
  }

  function loadNoteIntoEditor(note: NoteItem) {
    if (!editor) return;
    loadingRef.current = true;
    setActiveNote(note);
    try {
      const content = JSON.parse(note.contentJson);
      editor.commands.setContent(content);
    } catch {
      editor.commands.setContent('');
    }
    loadingRef.current = false;
  }

  // ── Autosave ──

  function debouncedSave(contentJson: unknown) {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveActiveNote(contentJson);
    }, 800);
  }

  async function saveActiveNote(contentJson: unknown) {
    if (!activeNote) return;
    const api = window.electronAPI;
    if (!api) return;

    const json = JSON.stringify(contentJson);
    // Extract title from first heading or first line
    const title = extractTitle(contentJson) || activeNote.title;

    await api.notes.save(
      activeNote.id,
      activeNote.campaignId,
      activeNote.folderId,
      title,
      json,
      activeNote.sortOrder,
    );

    // Update local state
    setActiveNote(prev => prev ? { ...prev, title, contentJson: json } : null);
    setNotes(prev => prev.map(n => n.id === activeNote.id ? { ...n, title, contentJson: json } : n));
  }

  function extractTitle(content: unknown): string {
    if (!content || typeof content !== 'object') return '';
    const doc = content as { content?: Array<{ type?: string; content?: Array<{ text?: string }> }> };
    if (!doc.content?.length) return '';
    const first = doc.content[0];
    if (first.content?.length && first.content[0].text) {
      return first.content[0].text.slice(0, 100);
    }
    return '';
  }

  // ── Note CRUD ──

  async function handleCreateNote(folderId: string | null) {
    const api = window.electronAPI;
    if (!api) return;

    const id = crypto.randomUUID();
    const sortOrder = notes.length;
    await api.notes.save(id, campaignId, folderId, 'Untitled', '{}', sortOrder);

    const newNote: NoteItem = {
      id,
      campaignId,
      folderId,
      title: 'Untitled',
      contentJson: '{}',
      sortOrder,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    setNotes(prev => [...prev, newNote]);
    loadNoteIntoEditor(newNote);
    patchState({ activeNoteId: id });
  }

  async function handleDeleteNote(id: string) {
    const api = window.electronAPI;
    if (!api) return;

    await api.notes.delete(id);
    setNotes(prev => prev.filter(n => n.id !== id));

    if (activeNote?.id === id) {
      setActiveNote(null);
      editor?.commands.setContent('');
      patchState({ activeNoteId: null });
    }
  }

  function handleSelectNote(note: NoteItem) {
    // Save current before switching
    if (activeNote && editor) {
      saveActiveNote(editor.getJSON());
    }
    loadNoteIntoEditor(note);
    patchState({ activeNoteId: note.id });
  }

  // ── Folder CRUD ──

  async function handleCreateFolder(parentId: string | null) {
    const api = window.electronAPI;
    if (!api) return;

    const id = crypto.randomUUID();
    const sortOrder = folders.length;
    await api.noteFolders.save(id, campaignId, parentId, 'New Folder', sortOrder);

    setFolders(prev => [...prev, {
      id,
      campaignId,
      parentId,
      name: 'New Folder',
      sortOrder,
      createdAt: new Date().toISOString(),
    }]);
  }

  async function handleRenameFolder(id: string, name: string) {
    const api = window.electronAPI;
    if (!api) return;

    const folder = folders.find(f => f.id === id);
    if (!folder) return;

    await api.noteFolders.save(id, campaignId, folder.parentId, name, folder.sortOrder);
    setFolders(prev => prev.map(f => f.id === id ? { ...f, name } : f));
  }

  async function handleDeleteFolder(id: string) {
    const api = window.electronAPI;
    if (!api) return;

    await api.noteFolders.delete(id);
    setFolders(prev => prev.filter(f => f.id !== id));
    // Move notes in this folder to root
    setNotes(prev => prev.map(n => n.folderId === id ? { ...n, folderId: null } : n));
  }

  // ── Drag & Drop: move note to folder ──

  async function handleMoveNote(noteId: string, targetFolderId: string | null) {
    const api = window.electronAPI;
    if (!api) return;

    const note = notes.find(n => n.id === noteId);
    if (!note || note.folderId === targetFolderId) return;

    await api.notes.save(note.id, note.campaignId, targetFolderId, note.title, note.contentJson, note.sortOrder);
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, folderId: targetFolderId } : n));
  }

  async function handleMoveFolder(folderId: string, targetParentId: string | null) {
    const api = window.electronAPI;
    if (!api) return;

    const folder = folders.find(f => f.id === folderId);
    if (!folder || folder.parentId === targetParentId || folderId === targetParentId) return;

    await api.noteFolders.save(folder.id, folder.campaignId, targetParentId, folder.name, folder.sortOrder);
    setFolders(prev => prev.map(f => f.id === folderId ? { ...f, parentId: targetParentId } : f));
  }

  // ── Cleanup ──

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  // ── Keyboard shortcut for search ──

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  function handleSlashCommand(item: SlashCommandItem) {
    if (!editor) return;
    // Delete the slash and query text
    const { from } = editor.state.selection;
    const textBefore = editor.state.doc.textBetween(Math.max(0, from - 20), from, '\n');
    const slashMatch = textBefore.match(/\/(\w*)$/);
    if (slashMatch) {
      const deleteFrom = from - slashMatch[0].length;
      const range = { from: deleteFrom, to: from };
      item.command({ editor, range });
    }
    setSlashMenu(null);
  }

  return (
    <div className={styles.container}>
      {!state.sidebarCollapsed && (
        <NotepadSidebar
          notes={notes}
          folders={folders}
          activeNoteId={activeNote?.id ?? null}
          width={state.sidebarWidth}
          onSelectNote={handleSelectNote}
          onCreateNote={handleCreateNote}
          onDeleteNote={handleDeleteNote}
          onCreateFolder={handleCreateFolder}
          onRenameFolder={handleRenameFolder}
          onDeleteFolder={handleDeleteFolder}
          onMoveNote={handleMoveNote}
          onMoveFolder={handleMoveFolder}
          onCollapse={() => patchState({ sidebarCollapsed: true })}
        />
      )}
      <div className={styles.editorPanel}>
        {state.sidebarCollapsed && (
          <button
            className={styles.expandBtn}
            onClick={() => patchState({ sidebarCollapsed: false })}
            title="Show sidebar"
          >
            ☰
          </button>
        )}
        {activeNote ? (
          <>
            <EditorToolbar editor={editor} />
            <div className={styles.editorContent}>
              <EditorContent editor={editor} />
              {slashMenu && (
                <div style={{ position: 'absolute', top: slashMenu.pos.top, left: slashMenu.pos.left }}>
                  <SlashCommandsMenu
                    items={slashMenu.items}
                    command={handleSlashCommand}
                  />
                </div>
              )}
            </div>
          </>
        ) : (
          <div className={styles.emptyState}>
            <p>Select a note or create a new one</p>
          </div>
        )}
      </div>
      {showSearch && (
        <SearchDialog
          notes={notes}
          onSelectNote={handleSelectNote}
          onClose={() => setShowSearch(false)}
        />
      )}
    </div>
  );
}
