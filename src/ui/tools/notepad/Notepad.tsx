/*
 * Notepad — Block editor tool for game master notes.
 *
 * 3-column layout: Left (Files/Graph tabs) | Center (Editor) | Right (References).
 * Tiptap editor with slash commands, note links, entity mentions.
 * Autosaves content to SQLite via IPC.
 */

import { useCallback, useEffect, useLayoutEffect, useRef, useState, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Highlight from '@tiptap/extension-highlight';
import { Callout } from './extensions/Callout';
import { NoteLink } from './extensions/NoteLink';
import { EntityMention } from './extensions/EntityMention';
import { MusicMention } from './extensions/MusicMention';
import { DateTag } from './extensions/DateTag';
import { EventTag } from './extensions/EventTag';
import { SLASH_COMMANDS } from './extensions/SlashCommands';
import type { SlashCommandItem } from './extensions/SlashCommands';
import { NotepadSidebar } from './components/NotepadSidebar';
import { EditorToolbar } from './components/EditorToolbar';
import { SearchDialog } from './components/SearchDialog';
import { SlashCommandsMenu } from './components/SlashCommandsMenu';
import { StoryGraph } from './components/StoryGraph';
import { ReferencePanel } from './components/ReferencePanel';
import type { MentionedEntity } from './components/ReferencePanel';
import { useGraphData } from './hooks/useGraphData';
import { DEFAULT_NOTEPAD_STATE } from './types';
import type { NotepadToolState, NoteItem, NoteFolderItem, SidebarTab } from './types';
import styles from './Notepad.module.css';

interface NotepadProps {
  toolState: NotepadToolState | undefined;
  onToolStateChange: (state: unknown) => void;
  campaignId: string;
  onLoadMapPreset?: (mapStateJson: string) => void;
  onCaptureMapState?: () => string | null;
}

export function Notepad({ toolState, onToolStateChange, campaignId, onLoadMapPreset, onCaptureMapState }: NotepadProps) {
  const state = toolState ?? DEFAULT_NOTEPAD_STATE;
  const [notes, setNotes] = useState<NoteItem[]>([]);
  const [folders, setFolders] = useState<NoteFolderItem[]>([]);
  const [activeNote, setActiveNote] = useState<NoteItem | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [slashMenu, setSlashMenu] = useState<{ items: SlashCommandItem[]; pos: { top: number; left: number } } | null>(null);
  const [noteLinkMenu, setNoteLinkMenu] = useState<{ query: string; from: number; pos: { top: number; left: number } } | null>(null);
  const [entityMenu, setEntityMenu] = useState<{ query: string; from: number; pos: { top: number; left: number } } | null>(null);
  const [mentionedEntities, setMentionedEntities] = useState<MentionedEntity[]>([]);
  const [menuIndex, setMenuIndex] = useState(0);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const loadingRef = useRef(false);
  const extractMentionsRef = useRef<(content: unknown) => void>(() => {});
  const noteLinkMenuRef = useRef<HTMLDivElement>(null);
  const entityMenuRef = useRef<HTMLDivElement>(null);

  const patchState = useCallback(
    (patch: Partial<NotepadToolState>) => {
      onToolStateChange({ ...state, ...patch });
    },
    [state, onToolStateChange],
  );

  // ── Graph Data ──
  const { graphData, refresh: refreshGraph } = useGraphData(campaignId, notes);

  // ── Tiptap Editor ──

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Placeholder.configure({
        placeholder: 'Start writing... Use / for commands, [[ for note links, @ for mentions',
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Callout,
      NoteLink,
      EntityMention,
      MusicMention,
      DateTag,
      EventTag,
    ],
    content: '',
    onUpdate: ({ editor: ed }) => {
      if (loadingRef.current) return;
      const json = ed.getJSON();
      debouncedSave(json);
      // Update mentions inline (extractMentions uses refs so it's safe from stale closure)
      extractMentionsRef.current(json);

      // Check for triggers
      const { from } = ed.state.selection;
      const textBefore = ed.state.doc.textBetween(
        Math.max(0, from - 50),
        from,
        '\n',
      );

      // Slash command: /query
      const slashMatch = textBefore.match(/\/(\w*)$/);
      if (slashMatch) {
        const query = slashMatch[1];
        const filtered = SLASH_COMMANDS.filter(item =>
          item.title.toLowerCase().includes(query.toLowerCase()),
        );
        if (filtered.length > 0) {
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
        setNoteLinkMenu(null);
        setEntityMenu(null);
        return;
      }
      setSlashMenu(null);

      // Note link: [[query
      const linkMatch = textBefore.match(/\[\[([^\]]*)$/);
      if (linkMatch) {
        const coords = ed.view.coordsAtPos(from);
        const editorRect = ed.view.dom.closest(`.${styles.editorContent}`)?.getBoundingClientRect();
        if (editorRect) {
          setNoteLinkMenu({
            query: linkMatch[1],
            from,
            pos: { top: coords.bottom - editorRect.top + 4, left: coords.left - editorRect.left },
          });
        }
        setEntityMenu(null);
        return;
      }
      setNoteLinkMenu(null);

      // Entity mention: @query (supports Unicode for Polish names)
      const mentionMatch = textBefore.match(/@([\w\u00C0-\u024F]*)$/);
      if (mentionMatch) {
        const coords = ed.view.coordsAtPos(from);
        const editorRect = ed.view.dom.closest(`.${styles.editorContent}`)?.getBoundingClientRect();
        if (editorRect) {
          setEntityMenu({
            query: mentionMatch[1],
            from,
            pos: { top: coords.bottom - editorRect.top + 4, left: coords.left - editorRect.left },
          });
        }
        return;
      }
      setEntityMenu(null);
    },
  });

  // ── Load data ──

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaignId]);

  // Refresh graph when notes change
  useEffect(() => {
    if (notes.length > 0) {
      refreshGraph();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes]);

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
    if (!editor || editor.isDestroyed) return;
    // Cancel any pending save from previous note
    if (saveTimerRef.current) {
      clearTimeout(saveTimerRef.current);
      saveTimerRef.current = null;
    }
    loadingRef.current = true;
    setActiveNote(note);
    try {
      const content = JSON.parse(note.contentJson);
      editor.commands.setContent(content);
      // Extract mentions from loaded content
      extractMentions(content);
    } catch {
      if (editor && !editor.isDestroyed) {
        editor.commands.setContent('');
      }
      setMentionedEntities([]);
    }
    loadingRef.current = false;
  }

  // ── Extract @mentions from Tiptap JSON ──

  const mentionRequestRef = useRef(0);

  async function extractMentions(content: unknown) {
    const requestId = ++mentionRequestRef.current;
    const countMap = new Map<string, { name: string; type: string; count: number }>();

    function walk(node: unknown) {
      if (!node || typeof node !== 'object') return;
      const n = node as { type?: string; attrs?: { entityId?: string; entityName?: string; entityType?: string }; content?: unknown[] };
      if (n.type === 'entityMention' && n.attrs?.entityId) {
        const existing = countMap.get(n.attrs.entityId);
        if (existing) {
          existing.count++;
        } else {
          countMap.set(n.attrs.entityId, {
            name: n.attrs.entityName || 'Unknown',
            type: n.attrs.entityType || 'character',
            count: 1,
          });
        }
      }
      if (Array.isArray(n.content)) {
        n.content.forEach(walk);
      }
    }

    walk(content);

    const entities: MentionedEntity[] = Array.from(countMap.entries()).map(([id, data]) => ({
      id,
      name: data.name,
      type: data.type,
      count: data.count,
    }));

    // Set immediately with what we have (no portraits yet)
    if (requestId === mentionRequestRef.current) {
      setMentionedEntities(entities);
    }

    // Enrich creature entities with portraitPath from bestiary templates
    const api = window.electronAPI;
    if (api && entities.some(e => e.type === 'creature')) {
      try {
        const templates = await api.bestiary.listTemplates();
        if (requestId !== mentionRequestRef.current) return; // stale
        const templateMap = new Map(templates.map(t => [t.id, t]));
        for (const entity of entities) {
          if (entity.type === 'creature') {
            const tmpl = templateMap.get(entity.id);
            if (tmpl) {
              entity.portraitPath = tmpl.avatar_path;
            }
          }
        }
        setMentionedEntities([...entities]);
      } catch {
        // Silently continue without portraits
      }
    }
  }

  // Keep ref fresh for stale-closure-safe access from onUpdate
  useLayoutEffect(() => {
    extractMentionsRef.current = extractMentions;
  });

  // ── Extract note links and sync to DB ──

  function extractAndSyncLinks(content: unknown) {
    const targetIds: string[] = [];
    const seen = new Set<string>();

    function walk(node: unknown) {
      if (!node || typeof node !== 'object') return;
      const n = node as { type?: string; attrs?: { noteId?: string }; content?: unknown[] };
      if (n.type === 'noteLink' && n.attrs?.noteId && !seen.has(n.attrs.noteId)) {
        seen.add(n.attrs.noteId);
        targetIds.push(n.attrs.noteId);
      }
      if (Array.isArray(n.content)) {
        n.content.forEach(walk);
      }
    }

    walk(content);

    // Sync to DB
    if (activeNote) {
      window.electronAPI?.noteLinks.sync(activeNote.id, campaignId, targetIds).then(() => {
        refreshGraph();
      });
    }
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
    const title = extractTitle(contentJson) || activeNote.title;

    await api.notes.save(
      activeNote.id,
      activeNote.campaignId,
      activeNote.folderId,
      title,
      json,
      activeNote.sortOrder,
    );

    // Extract & sync links
    extractAndSyncLinks(contentJson);

    // Update local state (only if still on the same note)
    const savedNoteId = activeNote.id;
    setActiveNote(prev => prev?.id === savedNoteId ? { ...prev, title, contentJson: json } : prev);
    setNotes(prev => prev.map(n => n.id === savedNoteId ? { ...n, title, contentJson: json } : n));
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

  function handleSelectNoteById(noteId: string) {
    const note = notes.find(n => n.id === noteId);
    if (note) handleSelectNote(note);
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

  // ── Insert Note Link ──

  function handleInsertNoteLink(note: NoteItem) {
    if (!editor || !noteLinkMenu) return;
    const from = noteLinkMenu.from;
    const textBefore = editor.state.doc.textBetween(Math.max(0, from - 50), from, '\n');
    const linkMatch = textBefore.match(/\[\[([^\]]*)$/);
    if (linkMatch) {
      const deleteFrom = from - linkMatch[0].length;
      editor.chain()
        .focus()
        .deleteRange({ from: deleteFrom, to: from })
        .insertContent({
          type: 'noteLink',
          attrs: { noteId: note.id, noteTitle: note.title },
        })
        .run();
    }
    setNoteLinkMenu(null);
  }

  // ── Insert Entity Mention ──

  function handleInsertEntity(entity: MentionedEntity) {
    if (!editor || !entityMenu) return;
    const from = entityMenu.from;
    const textBefore = editor.state.doc.textBetween(Math.max(0, from - 50), from, '\n');
    const mentionMatch = textBefore.match(/@([\w\u00C0-\u024F]*)$/);
    if (mentionMatch) {
      const deleteFrom = from - mentionMatch[0].length;
      editor.chain()
        .focus()
        .deleteRange({ from: deleteFrom, to: from })
        .insertContent({
          type: 'entityMention',
          attrs: { entityId: entity.id, entityName: entity.name, entityType: entity.type },
        })
        .run();
    }
    setEntityMenu(null);
  }

  // ── Filtered note link suggestions ──

  const noteLinkSuggestions = useMemo(() => {
    if (!noteLinkMenu) return [];
    const q = noteLinkMenu.query.toLowerCase();
    return notes
      .filter(n => n.id !== activeNote?.id && n.title.toLowerCase().includes(q))
      .slice(0, 8);
  }, [noteLinkMenu, notes, activeNote]);

  // ── Bestiary creatures for entity suggestions ──

  const [bestiaryCreatures, setBestiaryCreatures] = useState<MentionedEntity[]>([]);
  const [npcEntities, setNpcEntities] = useState<MentionedEntity[]>([]);

  useEffect(() => {
    async function loadBestiary() {
      const api = window.electronAPI;
      if (!api) return;
      try {
        const templates = await api.bestiary.listTemplates();
        setBestiaryCreatures(templates.map(t => ({
          id: t.id,
          name: t.name,
          type: 'creature',
          portraitPath: t.avatar_path,
          count: 1,
        })));
      } catch { /* silent */ }
    }
    loadBestiary();
  }, []);

  useEffect(() => {
    async function loadNpcs() {
      const api = window.electronAPI;
      if (!api || !campaignId) return;
      try {
        const rows = await api.npc.list(campaignId);
        setNpcEntities(rows.map(r => ({
          id: r.id,
          name: r.name,
          type: 'npc',
          portraitPath: r.portrait_path ?? undefined,
          count: 1,
        })));
      } catch { /* silent */ }
    }
    loadNpcs();
  }, [campaignId]);

  // ── Entity suggestions (bestiary + already mentioned) ──

  const entitySuggestions = useMemo((): MentionedEntity[] => {
    if (!entityMenu) return [];

    // Combine bestiary creatures + NPCs + entities already mentioned in notes
    const all: MentionedEntity[] = [...bestiaryCreatures, ...npcEntities];
    const seen = new Set<string>([...bestiaryCreatures.map(c => c.id), ...npcEntities.map(c => c.id)]);

    for (const n of notes) {
      try {
        const content = JSON.parse(n.contentJson);
        function walk(node: unknown) {
          if (!node || typeof node !== 'object') return;
          const nd = node as { type?: string; attrs?: { entityId?: string; entityName?: string; entityType?: string }; content?: unknown[] };
          if (nd.type === 'entityMention' && nd.attrs?.entityId && !seen.has(nd.attrs.entityId)) {
            seen.add(nd.attrs.entityId);
            all.push({ id: nd.attrs.entityId, name: nd.attrs.entityName || 'Unknown', type: nd.attrs.entityType || 'character', count: 1 });
          }
          if (Array.isArray(nd.content)) nd.content.forEach(walk);
        }
        walk(content);
      } catch { /* skip */ }
    }
    const q = entityMenu.query.toLowerCase();
    return all.filter(e => e.name.toLowerCase().includes(q)).slice(0, 10);
  }, [entityMenu, notes, bestiaryCreatures, npcEntities]);

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

  // ── Reset menu index when menus change ──

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMenuIndex(0); }, [slashMenu]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMenuIndex(0); }, [noteLinkMenu]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setMenuIndex(0); }, [entityMenu]);

  // ── Scroll active menu item into view ──

  useEffect(() => {
    const container = noteLinkMenuRef.current ?? entityMenuRef.current;
    if (!container) return;
    const active = container.children[menuIndex] as HTMLElement | undefined;
    active?.scrollIntoView({ block: 'nearest' });
  }, [menuIndex]);

  // ── Keyboard navigation for context menus ──

  useEffect(() => {
    if (!slashMenu && !noteLinkMenu && !entityMenu) return;

    function handleMenuKeyDown(e: KeyboardEvent) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter' || e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
      }

      if (e.key === 'Escape') {
        setSlashMenu(null);
        setNoteLinkMenu(null);
        setEntityMenu(null);
        return;
      }

      if (slashMenu) {
        const len = slashMenu.items.length;
        if (e.key === 'ArrowDown') setMenuIndex(i => (i + 1) % len);
        else if (e.key === 'ArrowUp') setMenuIndex(i => (i - 1 + len) % len);
        else if (e.key === 'Enter') {
          // Handled via ref below
          document.dispatchEvent(new CustomEvent('notepad:menu-confirm'));
        }
      } else if (noteLinkMenu) {
        const len = noteLinkSuggestions.length;
        if (len === 0) return;
        if (e.key === 'ArrowDown') setMenuIndex(i => (i + 1) % len);
        else if (e.key === 'ArrowUp') setMenuIndex(i => (i - 1 + len) % len);
        else if (e.key === 'Enter') {
          document.dispatchEvent(new CustomEvent('notepad:menu-confirm'));
        }
      } else if (entityMenu) {
        const len = entitySuggestions.length;
        if (len === 0) return;
        if (e.key === 'ArrowDown') setMenuIndex(i => (i + 1) % len);
        else if (e.key === 'ArrowUp') setMenuIndex(i => (i - 1 + len) % len);
        else if (e.key === 'Enter') {
          document.dispatchEvent(new CustomEvent('notepad:menu-confirm'));
        }
      }
    }

    document.addEventListener('keydown', handleMenuKeyDown, true);
    return () => document.removeEventListener('keydown', handleMenuKeyDown, true);
  }, [slashMenu, noteLinkMenu, entityMenu, noteLinkSuggestions.length, entitySuggestions.length]);

  // ── Handle Enter confirm from keyboard ──

  useEffect(() => {
    function handleConfirm() {
      if (slashMenu) {
        const item = slashMenu.items[menuIndex];
        if (item) handleSlashCommand(item);
      } else if (noteLinkMenu && noteLinkSuggestions[menuIndex]) {
        handleInsertNoteLink(noteLinkSuggestions[menuIndex]);
      } else if (entityMenu && entitySuggestions[menuIndex]) {
        handleInsertEntity(entitySuggestions[menuIndex]);
      }
    }
    document.addEventListener('notepad:menu-confirm', handleConfirm);
    return () => document.removeEventListener('notepad:menu-confirm', handleConfirm);
  });

  // ── Click handler for note links in editor ──

  function handleEditorClick(e: React.MouseEvent) {
    const target = e.target as HTMLElement;
    const linkEl = target.closest('[data-note-link]');
    if (linkEl) {
      const noteId = linkEl.getAttribute('data-note-link');
      if (noteId) {
        e.preventDefault();
        e.stopPropagation();
        handleSelectNoteById(noteId);
      }
    }
  }

  function handleSlashCommand(item: SlashCommandItem) {
    if (!editor) return;
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

  // ── Sidebar tab handling ──

  const sidebarTab: SidebarTab = state.sidebarTab ?? 'files';

  return (
    <div className={styles.container}>
      {/* Left panel: Files/Graph tabs */}
      {!state.sidebarCollapsed && (
        <div className={styles.leftPanel} style={{ width: state.sidebarWidth }}>
          <div className={styles.tabBar}>
            <button
              className={`${styles.tab} ${sidebarTab === 'files' ? styles.tabActive : ''}`}
              onClick={() => patchState({ sidebarTab: 'files' })}
            >
              Files
            </button>
            <button
              className={`${styles.tab} ${sidebarTab === 'graph' ? styles.tabActive : ''}`}
              onClick={() => patchState({ sidebarTab: 'graph' })}
            >
              Graph
            </button>
            <button
              className={styles.collapseBtn}
              onClick={() => patchState({ sidebarCollapsed: true })}
              title="Collapse sidebar"
            >
              ◀
            </button>
          </div>
          <div className={styles.tabContent}>
            {sidebarTab === 'files' ? (
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
            ) : (
              <StoryGraph
                data={graphData}
                activeNoteId={activeNote?.id ?? null}
                campaignId={campaignId}
                onSelectNote={handleSelectNoteById}
              />
            )}
          </div>
        </div>
      )}

      {/* Resize handle between left panel and editor */}
      {!state.sidebarCollapsed && (
        <div
          className={styles.resizeHandle}
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            const startWidth = state.sidebarWidth;
            const onMove = (ev: MouseEvent) => {
              const newWidth = Math.max(180, Math.min(600, startWidth + (ev.clientX - startX)));
              patchState({ sidebarWidth: newWidth });
            };
            const onUp = () => {
              document.removeEventListener('mousemove', onMove);
              document.removeEventListener('mouseup', onUp);
            };
            document.addEventListener('mousemove', onMove);
            document.addEventListener('mouseup', onUp);
          }}
        />
      )}

      {/* Center panel: Editor */}
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
        {!state.referencePanelVisible && (
          <button
            className={styles.showReferencesBtn}
            onClick={() => patchState({ referencePanelVisible: true })}
            title="Show references panel"
          >
            ▶
          </button>
        )}
        {activeNote ? (
          <>
            <EditorToolbar editor={editor} />
            <div className={styles.editorContent} onClick={handleEditorClick}>
              <EditorContent editor={editor} />
              {/* Slash command menu */}
              {slashMenu && (
                <div style={{ position: 'absolute', top: slashMenu.pos.top, left: slashMenu.pos.left }}>
                  <SlashCommandsMenu
                    items={slashMenu.items}
                    command={handleSlashCommand}
                    selectedIndex={menuIndex}
                  />
                </div>
              )}
              {/* Note link autocomplete */}
              {noteLinkMenu && (
                <div ref={noteLinkMenuRef} className={styles.autocompleteMenu} style={{ position: 'absolute', top: noteLinkMenu.pos.top, left: noteLinkMenu.pos.left }}>
                  {noteLinkSuggestions.length > 0 ? (
                    noteLinkSuggestions.map((note, i) => (
                      <button
                        key={note.id}
                        className={`${styles.autocompleteItem} ${i === menuIndex ? styles.autocompleteItemSelected : ''}`}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => handleInsertNoteLink(note)}
                      >
                        📄 {note.title}
                      </button>
                    ))
                  ) : (
                    <div className={styles.autocompleteEmpty}>No matching notes</div>
                  )}
                </div>
              )}
              {/* Entity mention autocomplete */}
              {entityMenu && (
                <div ref={entityMenuRef} className={styles.autocompleteMenu} style={{ position: 'absolute', top: entityMenu.pos.top, left: entityMenu.pos.left }}>
                  {entitySuggestions.length > 0 ? (
                    entitySuggestions.map((entity, i) => (
                      <button
                        key={entity.id}
                        className={`${styles.autocompleteItem} ${i === menuIndex ? styles.autocompleteItemSelected : ''}`}
                        onMouseDown={e => e.preventDefault()}
                        onClick={() => handleInsertEntity(entity)}
                      >
                        {entity.type === 'creature' ? '🐉' : entity.type === 'npc' ? '🧑' : '👤'} {entity.name}
                      </button>
                    ))
                  ) : (
                    <div className={styles.autocompleteEmpty}>No matching entities</div>
                  )}
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

      {/* Right panel: References */}
      {state.referencePanelVisible && (
        <ReferencePanel
          activeNoteId={activeNote?.id ?? null}
          activeNoteTitle={activeNote?.title ?? ''}
          notes={notes}
          graphData={graphData}
          mentionedEntities={mentionedEntities}
          campaignId={campaignId}
          onSelectNote={handleSelectNoteById}
          onCollapse={() => patchState({ referencePanelVisible: false })}
          onLoadMapPreset={onLoadMapPreset ?? (() => {})}
          onCaptureMapState={onCaptureMapState}
        />
      )}

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
