---
title: "feat: Notebook Block Editor — Phase 1 Core Editor"
type: feat
status: active
date: 2026-05-18
origin: docs/brainstorms/2026-05-18-notebook-block-editor-requirements.md
---

# feat: Notebook Block Editor — Phase 1 Core Editor

## Overview

Implement the core Notebook tool window — a Tiptap-based block editor with file/folder sidebar, search, and autosave. This is Phase 1 of 5 (see origin). The notebook replaces the registered-but-unimplemented `'notepad'` tool type.

## Problem Statement / Motivation

GMs need a rich text editor inside the app for session prep, lore, NPC descriptions, and scenario notes. Currently there's no note-taking capability — the `'notepad'` tool type exists in the registry but renders a placeholder. A block editor with organization (folders, search) lets GMs keep everything in one workspace without alt-tabbing to external tools.

## Proposed Solution

Tiptap (ProseMirror) block editor integrated as a tool window, with dedicated SQLite tables for notes/folders (not stored in canvas_state blob), IPC channels for CRUD, and a sidebar file tree within the tool window.

## Technical Approach

### Architecture

```
src/ui/tools/notebook/
  index.ts                    — barrel export
  types.ts                    — NotebookToolState, NoteFile, NoteFolder interfaces
  Notebook.tsx                — main component (sidebar + editor layout)
  Notebook.module.css         — styles
  components/
    NotebookSidebar.tsx       — file tree + search
    NotebookSidebar.module.css
    NotebookEditor.tsx        — Tiptap editor wrapper
    NotebookEditor.module.css
  hooks/
    useNotebookTree.ts        — folder/file CRUD, tree state
    useNotebookEditor.ts      — Tiptap instance, autosave, flush-on-switch
    useNotebookSearch.ts      — search query + results
  extensions/
    SlashCommand.ts           — slash menu extension
    DragHandle.ts             — block drag & drop extension
```

**Storage architecture (see origin: key decisions):** Notes get their own SQLite tables. `toolState` holds only `{ selectedNoteId: string | null }`. Note content is loaded/saved via dedicated IPC channels — NOT through canvas persistence. This prevents bloating the canvas_state blob and enables multi-window safety.

**Single-writer lock:** A note can only be edited in one window at a time. Opening an already-open note focuses the existing window.

### Database Schema

```sql
-- In database.ts, added to initDatabase()
CREATE TABLE IF NOT EXISTS notebook_folders (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  parent_id TEXT,          -- NULL = root level
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (parent_id) REFERENCES notebook_folders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notebook_notes (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  folder_id TEXT,          -- NULL = root level
  title TEXT NOT NULL DEFAULT 'Untitled',
  content_json TEXT NOT NULL DEFAULT '{}',
  search_text TEXT NOT NULL DEFAULT '',  -- plaintext extraction for LIKE search
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (folder_id) REFERENCES notebook_folders(id) ON DELETE SET NULL
);
```

Notes: `ON DELETE CASCADE` for folders ensures recursive delete. `ON DELETE SET NULL` for notes means if a folder is deleted, orphaned notes move to root.

**Decision change from SpecFlow:** Folder deletion is recursive (CASCADE), but notes inside deleted folders are preserved at root level (SET NULL on folder_id) — safer than losing content.

### IPC Channels

Following existing convention (`domain:verb` kebab-case):

| Channel | Direction | Purpose |
|---------|-----------|---------|
| `notebook:list-tree` | renderer→main | Get all folders + notes for campaign |
| `notebook:create-folder` | renderer→main | Create folder |
| `notebook:create-note` | renderer→main | Create note (returns id) |
| `notebook:load-note` | renderer→main | Get note content by id |
| `notebook:save-note` | renderer→main | Save content_json + search_text |
| `notebook:rename-item` | renderer→main | Rename note or folder |
| `notebook:move-item` | renderer→main | Move note/folder to different parent |
| `notebook:delete-item` | renderer→main | Delete note or folder |
| `notebook:search` | renderer→main | Search by title + search_text |

### Implementation Phases

#### Phase 1.1: Foundation (DB + IPC + Registration)

- [ ] Add `notebook_folders` and `notebook_notes` tables to `database.ts:initDatabase()`
- [ ] Add CRUD functions in `database.ts`: `listNotebookTree()`, `createNotebookFolder()`, `createNotebookNote()`, `loadNotebookNote()`, `saveNotebookNote()`, `renameNotebookItem()`, `moveNotebookItem()`, `deleteNotebookItem()`, `searchNotebook()`
- [ ] Add `ipcMain.handle` wrappers in `main.ts` for all notebook channels
- [ ] Add `notebook: { ... }` to preload contextBridge in `preload.ts`
- [ ] Add `ElectronNotebookAPI` interface in `electron.d.ts`
- [ ] Replace `'notepad'` with `'notebook'` in `types.ts` (ToolType, TOOL_MIN_SIZES, TOOL_DEFAULT_SIZES, TOOL_INFO, TOOL_CATEGORIES) — or rename in place

**Files:** `src/electron/database.ts`, `src/electron/main.ts`, `src/electron/preload.ts`, `src/ui/electron.d.ts`, `src/ui/canvas/types.ts`

#### Phase 1.2: Notebook Shell (Layout + Sidebar)

- [ ] Create `src/ui/tools/notebook/` folder structure
- [ ] `types.ts`: Define `NotebookToolState`, `NoteFile`, `NoteFolder`, `TreeItem` interfaces
- [ ] `Notebook.tsx`: Two-pane layout (sidebar left, editor right). Receives `toolState`, `onToolStateChange`, `campaignId`
- [ ] `NotebookSidebar.tsx`: Tree view with folders/notes, context menu (create, rename, delete, move), search input at top
- [ ] `useNotebookTree.ts`: Load tree on mount, CRUD operations via IPC, optimistic UI updates
- [ ] `Notebook.module.css` + `NotebookSidebar.module.css`: Glassmorphism styling matching app design tokens
- [ ] Wire into `InfiniteCanvas.tsx` switch statement
- [ ] Empty state: centered placeholder with "Create Note" button when no note selected

**Files:** `src/ui/tools/notebook/*`, `src/ui/canvas/InfiniteCanvas.tsx`

#### Phase 1.3: Tiptap Editor Integration

- [ ] Install Tiptap packages: `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-table`, `@tiptap/extension-task-list`, `@tiptap/extension-task-item`, `@tiptap/extension-code-block-lowlight`, `@tiptap/extension-placeholder`
- [ ] `NotebookEditor.tsx`: Tiptap `useEditor` with extensions for all R1 block types
- [ ] `useNotebookEditor.ts`: manages editor lifecycle, loads content on note selection, handles JSON serialization
- [ ] Toolbar: floating bubble menu or fixed toolbar with formatting buttons (bold, italic, headings, lists, table insert, code block)
- [ ] `NotebookEditor.module.css`: Editor styling — typography using design tokens (`--font-body`, `--text-base`), table styles, code block with `--font-mono`

**Files:** `src/ui/tools/notebook/components/NotebookEditor.tsx`, `src/ui/tools/notebook/hooks/useNotebookEditor.ts`, `package.json`

#### Phase 1.4: Slash Commands & Drag/Drop

- [ ] `extensions/SlashCommand.ts`: Custom Tiptap extension — shows menu on `/` keystroke with block type options (heading, list, table, code, separator)
- [ ] Slash menu component: filtered list, keyboard navigation, glassmorphism popup styling
- [ ] `extensions/DragHandle.ts`: Block drag handle visible on hover, HTML5 DnD for reordering with `stopPropagation` to prevent canvas interference
- [ ] Block reorder: Tiptap commands to move nodes up/down

**Files:** `src/ui/tools/notebook/extensions/*`

#### Phase 1.5: Autosave & Search

- [ ] `useNotebookEditor.ts` autosave: 1000ms debounce after `onUpdate`, saves via `notebook:save-note` IPC
- [ ] **Flush-before-switch guard:** When `selectedNoteId` changes, immediately flush any pending save for the previous note before loading the new one
- [ ] Extract `search_text` from Tiptap JSON on save (strip nodes, concatenate text content)
- [ ] `useNotebookSearch.ts`: Debounced search input (300ms), calls `notebook:search` IPC, filters sidebar tree to show matches
- [ ] Subtle "Saving..." / "Saved ✓" indicator in editor header
- [ ] Save status indicator

**Files:** `src/ui/tools/notebook/hooks/useNotebookEditor.ts`, `src/ui/tools/notebook/hooks/useNotebookSearch.ts`

## System-Wide Impact

- **Interaction graph:** Note save → IPC `notebook:save-note` → database.ts → sql.js → `persist()` flushes to disk. Independent from canvas persistence (no overlap).
- **Error propagation:** IPC handlers return `null` on failure (existing pattern). Editor shows error toast or retries silently.
- **State lifecycle risks:** Flush-before-switch eliminates note-switch data loss. Single-writer lock prevents multi-window conflicts. `ON DELETE SET NULL` prevents content loss on folder deletion.
- **API surface parity:** New `electronAPI.notebook.*` namespace — no overlap with existing APIs.
- **Integration test scenarios:** (1) Create note → edit → close window → reopen → content persists. (2) Switch notes rapidly → both save correctly. (3) Delete folder → notes inside move to root.

## Acceptance Criteria

### Functional Requirements

- [ ] Tiptap editor renders all block types: paragraph, H1-H3, bullet list, numbered list, task list, table, code block, horizontal rule
- [ ] Slash commands menu appears on `/` with all block types selectable
- [ ] Blocks are draggable to reorder
- [ ] Sidebar shows file/folder tree for current campaign
- [ ] Can create, rename, delete notes and folders from sidebar
- [ ] Can drag notes between folders in sidebar
- [ ] Search input filters notes by title and content
- [ ] Content autosaves within ~1s of last edit
- [ ] Switching notes preserves previous note's content (flush guard)
- [ ] Same note cannot be opened in two windows simultaneously
- [ ] Notes persist across app restarts (SQLite)
- [ ] Tool window works within InfiniteCanvas (drag, resize, minimize)

### Non-Functional Requirements

- [ ] Editor loads in <200ms for notes up to 50KB JSON
- [ ] Autosave does not block UI (async IPC)
- [ ] Sidebar tree handles 100+ notes without lag
- [ ] Styling matches app design system (glassmorphism, dark theme, design tokens)

## Dependencies & Prerequisites

- Tiptap npm packages (new dependency)
- Existing `'notepad'` tool type registration (rename to `'notebook'`)
- No dependency on other unimplemented features

## Alternative Approaches Considered

- **BlockNote:** Faster start with Notion-like UI out-of-box, but less flexible for Phase 2-5 custom blocks (story graph canvas, macro builder). Rejected per origin document decision.
- **Store content in canvas_state toolState:** Simpler (no new IPC), but bloats canvas saves and breaks on multi-window. Rejected.
- **Derive title from first H1:** Less predictable for sidebar display and search. Explicit title field chosen.

## Research Findings (Deepened)

### Tiptap Configuration

**Packages to install:**
```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit \
  @tiptap/extension-table @tiptap/extension-table-row @tiptap/extension-table-cell @tiptap/extension-table-header \
  @tiptap/extension-task-list @tiptap/extension-task-item \
  @tiptap/extension-code-block-lowlight @tiptap/extension-placeholder \
  @tiptap/extension-horizontal-rule @tiptap/suggestion \
  lowlight
```

**Critical patterns:**
- Use `immediatelyRender: false` in `useEditor` — prevents React StrictMode double-mount issues in Electron
- Define extensions array OUTSIDE the component (or `useMemo`) — prevents editor recreation on every render
- Use `editor.commands.setContent(json, false)` for note switching (avoids full destroy/recreate)
- Store as `getJSON()` not `getHTML()` — lossless, queryable, migrateable
- Enable `enableContentCheck: true` + `onContentError` handler for schema migration safety

**Slash commands:** Use `@tiptap/suggestion` utility to build custom extension (free, full control). NOT Tiptap's paid UI kit.

**Drag & drop blocks:** Use CSS-only drag handle approach (`:hover::before` pseudo-element with grip icon). The pro `@tiptap/extension-drag-handle-react` requires yjs peer deps even without collaboration — too heavy. Implement simple ProseMirror node drag via `draggable: true` on block nodes.

**Event isolation (critical for InfiniteCanvas):** Wrap editor in a div with `stopPropagation` on `onPointerDown`, `onPointerMove`, `onWheel`, `onKeyDown` to prevent canvas pan/zoom/shortcuts during editing. Only stop `onWheel` when editor content is scrollable.

### Sidebar Tree

**Library: react-arborist** — handles virtualization, DnD reorder, keyboard navigation, inline rename, and search filtering out of the box. No need for custom tree implementation.

```bash
npm install react-arborist react-window
```

**Key features used:**
- Virtualized rendering (react-window internally) — handles 1000+ nodes
- Built-in pointer-event DnD (not HTML5) — no conflict with canvas DnD
- `node.edit()` / `node.submit()` / `node.reset()` for inline rename
- `searchTerm` + `searchMatch` props for filtering
- Keyboard: arrows, Enter, F2, Delete built-in

**Context menu:** Use existing `@radix-ui/react-context-menu` (already in deps). One Root per node row with dynamic content based on node type (file vs folder).

**Optimistic UI:** Immediate state update → IPC call → rollback on failure. Since SQLite is local, failures are extremely rare.

### Autosave & Search

**Debounce:** 1000ms for note body. Max 5000ms forced save for continuous typing bursts.

**Flush-before-switch:** In `useEffect` on `noteId` change: `await flush()` before loading new content. Use `cancelled` flag to handle rapid switches (A→B→C).

**Save queue:** Serial queue with coalescing — at most one IPC save in-flight, always saves the LATEST content (skips intermediate states). Prevents out-of-order writes.

**Plaintext extraction:** Recursive walk of Tiptap JSON, concatenate text nodes with newlines between blocks. Run at save time, store in `search_text` column.

**Search: FTS5** — sql.js WASM includes FTS5 support. Use virtual table with triggers to keep index in sync:
```sql
CREATE VIRTUAL TABLE IF NOT EXISTS notebook_notes_fts
USING fts5(title, search_text, content='notebook_notes', content_rowid='rowid');
```
Benefits over LIKE: ranking, prefix matching (`query*`), snippets with `<mark>` highlighting, <1ms for 1000 notes.

**Save status UI:** Show "Saving…" briefly, then "Saved" for 2s, then hide. Never show "unsaved" — it creates anxiety. Only persistently show errors.

**Edge cases handled:**
- `beforeunload` event → flush on app quit
- Empty content save allowed (new note)
- `loadingRef` guard prevents saving during load

## Sources & References

### Origin

- **Origin document:** [docs/brainstorms/2026-05-18-notebook-block-editor-requirements.md](docs/brainstorms/2026-05-18-notebook-block-editor-requirements.md) — Key decisions carried forward: Tiptap library choice, dedicated SQLite storage, 5-phase roadmap, tool window integration pattern.

### Internal References

- Tool registration pattern: `src/ui/canvas/types.ts:5-142`
- IPC architecture: `src/electron/preload.ts`, `src/electron/main.ts:36-227`
- Database pattern: `src/electron/database.ts:38-43` (canvas_state), `87-137` (bestiary tables)
- Tool component pattern: `src/ui/tools/party-tracker/PartyTracker.tsx`
- Canvas persistence: `src/ui/canvas/hooks/useCanvasPersistence.ts`
- Design tokens: `src/ui/styles/tokens.css`

### External References

- Tiptap React docs: https://tiptap.dev/docs/editor/getting-started/install/react
- Tiptap custom NodeView: https://tiptap.dev/docs/editor/extensions/custom-extensions/node-views/react
- Tiptap Suggestion utility: https://tiptap.dev/docs/editor/extensions/functionality/suggestion
- react-arborist: https://github.com/jameskerr/react-arborist
- SQLite FTS5: https://www.sqlite.org/fts5.html
