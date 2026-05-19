---
title: "feat: Notebook Block Editor & Session Orchestrator"
type: feat
status: active
date: 2026-05-18
origin: docs/brainstorms/2026-05-18-notebook-block-editor-requirements.md
deepened: 2026-05-18
---

# feat: Notebook Block Editor & Session Orchestrator

## Enhancement Summary

**Deepened on:** 2026-05-18
**Research areas:** Tiptap extensions & NodeViews, d3-force graph rendering, cross-tool macro orchestration, SpecFlow gap analysis

### Key Improvements
1. Full Tiptap extension architecture with concrete code patterns (slash commands, mentions, NodeViews)
2. Cross-tool macro system designed as reducer-based command dispatch (fits existing architecture)
3. d3-force + React SVG graph pattern with zoom/pan/drag (~45KB total deps)
4. 25 edge cases and gaps identified by SpecFlow analysis (broken links, autosave vs undo, tool-not-open handling)

### Critical Gaps Discovered
- Broken /slash-links when target note deleted → soft-delete + broken-link indicator
- Macro execution needs auto-open for closed tools
- Notepad `toolState` should store only UI state (activeNoteId, sidebar width) — content in SQLite, NOT in canvas state blob
- Graph edges must be denormalized into `note_links` table (not runtime-parsed from content)
- @mention autocomplete sources: party-tracker characters + bestiary templates (merged)

## Overview

Central note-taking tool for RPG Game Masters — a Tiptap-based block editor integrated into the InfiniteCanvas as a tool window, with graph visualization of note relationships, entity references, map presets, macro execution, and calendar integration.

## Problem Statement

GM przygotowujący sesję musi przełączać między edytorem tekstu, mapą, trackerem postaci i soundboardem. Notatnik unifikuje planowanie sesji — tekst scenariusza z osadzonymi presetami scen, automatycznymi referencjami i jednoklickowym uruchamianiem.

## Proposed Solution

3-phase implementation of a Tiptap block editor as a tool window (`'notepad'` type already registered), with progressively richer integrations:
1. Core editor with file management
2. Graph navigation + entity references + right panel
3. Map presets, macro builder, music triggers, calendar sync

The notebook lives as a **tool window on InfiniteCanvas** (not a full-screen view). The 3-column layout (graph/files | editor | references) requires a larger minimum window size.

## Technical Approach

### Architecture

```
src/ui/tools/notepad/
  index.ts
  types.ts                    # NotepadState, NoteDocument, NoteFolder
  Notepad.tsx                 # Main 3-column layout
  Notepad.module.css
  components/
    Editor.tsx                # Tiptap editor wrapper
    Sidebar.tsx               # Tabs: Graph | Files
    FileTree.tsx              # File/folder tree
    StoryGraph.tsx            # Force-directed graph (d3-force + SVG)
    ReferencePanel.tsx        # Right panel: collected entities
    SearchDialog.tsx          # Note search (Radix Dialog)
  extensions/
    slash-command.ts          # Tiptap slash menu extension
    slash-link.ts             # /note-name inline link + graph edge
    entity-mention.ts         # @character inline mention
    music-mention.ts          # Music reference inline mention  
    date-tag.ts               # Inline date → calendar event
    callout-block.ts          # Colored callout with side stripe
    macro-block/
      macro-block.ts          # Tiptap NodeView extension
      MacroBuilder.tsx        # React component for macro steps
  hooks/
    useNotepadPersistence.ts  # CRUD operations via IPC
    useNoteSearch.ts          # Search across notes
    useGraphData.ts           # Build graph from note_links
    useReferenceExtractor.ts  # Parse @mentions from Tiptap JSON
    useMacroExecutor.ts       # Cross-tool command dispatch
```

### Database Schema

```sql
-- New tables in database.ts

CREATE TABLE IF NOT EXISTS notes (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  folder_id TEXT,                    -- NULL = root level
  title TEXT NOT NULL DEFAULT 'Untitled',
  content_json TEXT NOT NULL DEFAULT '{}',  -- Tiptap JSON
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (folder_id) REFERENCES note_folders(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS note_folders (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  parent_id TEXT,                    -- NULL = root, allows nesting
  name TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY (parent_id) REFERENCES note_folders(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS note_links (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  source_note_id TEXT NOT NULL,
  target_note_id TEXT NOT NULL,
  FOREIGN KEY (source_note_id) REFERENCES notes(id) ON DELETE CASCADE,
  FOREIGN KEY (target_note_id) REFERENCES notes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS note_map_presets (
  id TEXT PRIMARY KEY,
  campaign_id TEXT NOT NULL,
  note_id TEXT NOT NULL,
  name TEXT NOT NULL,
  map_state_json TEXT NOT NULL,      -- Full MapDisplayState snapshot
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
);
```

### IPC Channels

```
notes:list          (campaignId) → NoteRow[]
notes:get           (noteId) → NoteRow | null
notes:create        (campaignId, folderId?, title?) → NoteRow
notes:update        (noteId, { title?, content_json?, folder_id? }) → void
notes:delete        (noteId) → void
notes:search        (campaignId, query) → NoteRow[]  -- LIKE on title + content

note-folders:list   (campaignId) → NoteFolderRow[]
note-folders:create (campaignId, parentId?, name) → NoteFolderRow
note-folders:update (folderId, { name?, parent_id?, sort_order? }) → void
note-folders:delete (folderId) → void

note-links:list     (campaignId) → NoteLinkRow[]
note-links:sync     (noteId, targetIds[]) → void  -- replaces all links from this note

note-presets:list   (noteId) → NoteMapPresetRow[]
note-presets:save   (noteId, name, mapStateJson) → NoteMapPresetRow
note-presets:delete (presetId) → void
note-presets:load   (presetId) → NoteMapPresetRow
```

### Implementation Phases

#### Phase 1: Core Editor (Foundation)

**Files to create:**
- `src/ui/tools/notepad/` — full directory structure
- Database: add 2 tables (`notes`, `note_folders`)
- IPC: add `notes:*` and `note-folders:*` handlers

**Files to modify:**
- `src/ui/canvas/types.ts` — update `TOOL_MIN_SIZES` (min 800×500), `TOOL_DEFAULT_SIZES` (1200×700)
- `src/ui/canvas/InfiniteCanvas.tsx` — add `case 'notepad'` in `ToolContent`
- `src/ui/canvas/hooks/useCanvasPersistence.ts` — already has `'notepad'` in validToolTypes (verify)
- `src/electron/database.ts` — add tables + CRUD functions
- `src/electron/main.ts` — add IPC handlers
- `src/electron/preload.ts` — expose `electronAPI.notes.*`, `electronAPI.noteFolders.*`
- `src/ui/electron.d.ts` — type declarations

**Dependencies (npm):**
- `@tiptap/react` + `@tiptap/starter-kit` + `@tiptap/extension-*` (task-list, table, placeholder, code-block-lowlight)

**Acceptance criteria:**
- [ ] Tiptap editor renders inside tool window with all basic blocks (paragraph, H1-H3, lists, task list, table, code block, separator)
- [ ] Slash command menu (/) inserts blocks
- [ ] Drag & drop reorder blocks
- [ ] Callout blocks with colored side stripe (4+ colors)
- [ ] Left sidebar with file tree (create/rename/delete folders and notes)
- [ ] Notes persist to SQLite as Tiptap JSON
- [ ] Autosave with debounce (500ms)
- [ ] Search dialog (Cmd+K or button) searching title + content via LIKE
- [ ] Empty state: shows "Create your first note" prompt

#### Phase 2: Graph & References

**Files to create:**
- `extensions/slash-link.ts` — Tiptap inline node for /note-name
- `extensions/entity-mention.ts` — @mention autocomplete
- `components/StoryGraph.tsx` — d3-force SVG graph
- `components/ReferencePanel.tsx` — right panel
- `hooks/useGraphData.ts` — query note_links table
- `hooks/useReferenceExtractor.ts` — parse mentions from content

**Database additions:**
- `note_links` table
- Query: `notes:search` enhanced if needed

**Acceptance criteria:**
- [ ] 3-column layout: left (taby Graph/Files) | center (editor) | right (references)
- [ ] Typing `/` followed by note name shows autocomplete, inserts inline link
- [ ] Saving note with /links updates `note_links` table (sync on save)
- [ ] Story Graph tab renders force-directed graph of all notes + links for campaign
- [ ] Clicking graph node navigates to that note
- [ ] @mention autocomplete pulls from party-tracker + bestiary data
- [ ] Right panel shows all @entities referenced in current note with mini-cards
- [ ] "Create Encounter Set" button in right panel creates group in encounter-sets tool
- [ ] Deleted notes show broken-link indicator in referencing notes
- [ ] Backlinks: right panel shows "Linked from" section (notes that link TO current note)

#### Phase 3: Presets, Macros & Integrations

**Files to create:**
- `extensions/macro-block/` — Tiptap NodeView + React builder
- `extensions/music-mention.ts` — inline music reference
- `extensions/date-tag.ts` — inline date → calendar
- `hooks/useMacroExecutor.ts` — cross-tool dispatch

**Database additions:**
- `note_map_presets` table

**Architecture decision — cross-tool orchestration:**
Macro execution dispatches actions through the canvas reducer. New action type `EXECUTE_MACRO` in `canvasReducer` triggers:
1. `OPEN_WINDOW` if target tool not open
2. `UPDATE_TOOL_STATE` with preset data for each target tool
3. Sequential execution with 100ms delays between steps for visual feedback

**Acceptance criteria:**
- [ ] "Save Map Preset" button opens map tool in current state, user arranges, clicks "Save as Preset" → saved to `note_map_presets`
- [ ] Multiple presets per note listed in right panel with name + "Load" button
- [ ] Loading preset applies full map state (background, tokens, fog, VFX, viewport)
- [ ] Loading preset during active session shows confirmation dialog
- [ ] Macro builder block: visual list of steps (set map preset, play soundboard track, wait) with "Execute" button
- [ ] Macro steps: Load Map Preset, Play Music, Stop Music, Set Ambient (future: toggle FoW, send VFX)
- [ ] Music inline references (@track-name) from soundboard library, shown in right panel with Play button
- [ ] Inline date tag (e.g., `/date 15 Mirtul`) creates event in time-calendar module
- [ ] Clicking calendar event opens associated note

## System-Wide Impact

### Interaction Graph

- Note save → `notes:update` IPC → `database.ts` → `persist()`
- Note save → extract /links → `note-links:sync` IPC → update graph edges
- Note save → extract @mentions → update right panel (client-side only, no persist)
- Macro execute → `canvasReducer` dispatch → `OPEN_WINDOW` + `UPDATE_TOOL_STATE` per step
- Map preset load → `UPDATE_TOOL_STATE` on map-display window with full state override
- Encounter set create → writes to bestiary/encounter-sets storage via existing IPC
- Date tag → `time-calendar` event creation via new IPC channel

### Error Propagation

- Note save failure → toast error, retry on next debounce
- Broken /link (target deleted) → render as red/strikethrough inline node, no crash
- Macro step failure (e.g., soundboard track deleted) → skip step, toast warning, continue
- Map preset with missing image → load preset without background, show warning

### State Lifecycle Risks

- **Notepad state:** `toolState` stores only `activeNoteId` and UI state (sidebar width, active tab). Content lives in SQLite, NOT in canvas state JSON (too large).
- **Map preset stale reference:** If map image is moved/deleted, preset becomes partially broken. Mitigation: validate on load, warn user.
- **Autosave race:** Two rapid saves could overlap. Mitigation: queue saves, only execute latest.

### API Surface Parity

- Notepad follows same pattern as party-tracker/bestiary: `toolState` in canvas + domain data in SQLite
- IPC channel naming consistent: `notes:verb`, `note-folders:verb`, `note-links:verb`, `note-presets:verb`
- Folder system mirrors `bestiary_folders` pattern (parent_id, sort_order)

## Alternative Approaches Considered

| Option | Why Rejected |
|--------|-------------|
| BlockNote (higher-level Tiptap wrapper) | Less control over custom NodeViews needed for macro builder, graph blocks |
| Editor.js | No nested blocks, limited inline formatting, poor React integration |
| Plate (Slate.js) | More complex API, smaller community, less mature TypeScript |
| Full-screen view instead of tool window | User explicitly wants it on canvas alongside other tools |
| Graph edges from content parsing at runtime | O(n) on every graph open, degrades at 100+ notes |
| Heavyweight graph lib (React Flow, Cytoscape) | Overkill for simple visualization; d3-force + SVG is lighter |

## Dependencies & Prerequisites

| Dependency | Status | Needed By |
|-----------|--------|-----------|
| `@tiptap/react` + extensions | New npm dep | Phase 1 |
| `d3-force` + `d3-selection` | New npm dep | Phase 2 |
| Party-tracker entity query API | Exists (reads from canvas state) | Phase 2 |
| Bestiary template query API | Exists (`bestiary:*` IPC) | Phase 2 |
| Encounter-sets creation API | Exists (`bestiary:*` IPC) | Phase 2 |
| Map tool state serialization | Exists (MapDisplayState in toolState) | Phase 3 |
| Soundboard track list API | Exists (`soundboard:*` IPC) | Phase 3 |
| Time-calendar event creation API | May need new IPC endpoint | Phase 3 |
| Cross-tool action dispatch (canvas reducer) | New pattern needed | Phase 3 |

## Risk Analysis & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Tiptap bundle size bloat | Medium | Low | Tree-shake, lazy-load extensions per phase |
| 3-column layout cramped in tool window | High | Medium | Large min size (800×500), collapsible panels |
| Cross-tool macro execution complexity | High | High | Start with simple 2-step macro, iterate |
| Graph performance at 200+ notes | Low | Medium | d3-force with throttled simulation, limit visible nodes |
| Autosave + undo confusion | Medium | Low | Tiptap built-in history (session-only), no version history |
| Stale map presets (images moved) | Medium | Medium | Validate on load, graceful degradation |

## Success Metrics

- GM can write full session scenario without leaving Game Master Panel
- One-click scene setup works reliably (macro/preset)
- Story graph provides useful navigation between notes
- Autosave is invisible — user never loses work

## Sources & References

### Origin

- **Origin document:** [docs/brainstorms/2026-05-18-notebook-block-editor-requirements.md](docs/brainstorms/2026-05-18-notebook-block-editor-requirements.md) — Key decisions: Tiptap chosen for custom block flexibility, 3-column layout, slash-link syntax for graph edges, map presets via full map window in planning mode, 3-phase implementation.

### Internal References

- Tool registration pattern: `src/ui/canvas/types.ts:5-142`
- Tool content switch: `src/ui/canvas/InfiniteCanvas.tsx:52-154`
- Database pattern: `src/electron/database.ts:38-43` (canvas_state table)
- Folder pattern: bestiary folders in `database.ts`
- IPC pattern: `src/electron/preload.ts`, `src/electron/main.ts`
- Existing `'notepad'` type registered: `src/ui/canvas/types.ts:10`
- patchState pattern: documented in tutorial.md

### External References

- Tiptap documentation: https://tiptap.dev/docs
- d3-force: https://d3js.org/d3-force
- ProseMirror NodeView: https://prosemirror.net/docs/guide/#view.node_views

---

## Research Insights (Deepened)

### Tiptap Extension Architecture

**Required packages:**
```bash
npm install @tiptap/react @tiptap/pm @tiptap/starter-kit \
  @tiptap/extension-mention @tiptap/extension-table \
  @tiptap/extension-table-row @tiptap/extension-table-cell \
  @tiptap/extension-table-header @tiptap/extension-placeholder \
  @tiptap/extension-task-list @tiptap/extension-task-item
```

**Key patterns:**

1. **Custom NodeView (macro block, callout):**
```tsx
// Node definition
export const MacroBlock = Node.create({
  name: 'macroBlock',
  group: 'block',
  atom: true, // no editable content inside
  draggable: true,
  addAttributes() { return { steps: { default: [] } } },
  addNodeView() { return ReactNodeViewRenderer(MacroBlockView) },
})

// React component receives: node, updateAttributes, selected, getPos
// CRITICAL: Do NOT call updateAttributes on every keystroke — use local state + commit on blur
```

2. **Slash commands** via `@tiptap/suggestion`:
```tsx
const SlashCommands = Extension.create({
  name: 'slashCommands',
  addOptions() {
    return { suggestion: { char: '/', command: ({ editor, range, props }) => {
      editor.chain().focus().deleteRange(range).run()
      props.command({ editor })
    }}}
  },
  addProseMirrorPlugins() {
    return [Suggestion({ editor: this.editor, ...this.options.suggestion })]
  },
})
```

3. **Inline mentions** — use `@tiptap/extension-mention` configured twice:
   - `EntityMention` with `char: '@'` for characters/monsters
   - `NoteLink` with custom trigger for /note-name links

4. **Autosave pattern:**
```tsx
// In useEditor onUpdate callback:
onUpdate: ({ editor }) => {
  if (!readyRef.current) return
  clearTimeout(saveRef.current)
  saveRef.current = setTimeout(() => {
    const json = editor.getJSON() // synchronous, cheap
    window.electronAPI.notes.update(noteId, { content_json: JSON.stringify(json) })
  }, 800)
}
// On initial load: editor.commands.setContent(json, false) — false = no undo history
```

5. **Performance pitfalls:**
   - `editor.getJSON()` is cheap (sync tree walk) — use it for persistence
   - AVOID `editor.getHTML()` — slow and lossy for custom nodes
   - `getPos()` in NodeViews returns stale values after async — always call fresh
   - Use `useEditorState` with selectors for toolbar (prevents re-renders on every keystroke)

### Story Graph — d3-force + React SVG Pattern

**Dependencies:** `d3-force` + `d3-zoom` + `d3-selection` (~45KB minified)

**Architecture:** D3 owns physics simulation (in useRef), React owns rendering (SVG elements from state).

```tsx
// Key structure:
const simulationRef = useRef<Simulation>()
const [nodePositions, setNodePositions] = useState<GraphNode[]>([])

useEffect(() => {
  const sim = forceSimulation(nodes)
    .force('link', forceLink(links).id(d => d.id).distance(80))
    .force('charge', forceManyBody().strength(-200))
    .force('center', forceCenter(w/2, h/2))
    .force('collide', forceCollide().radius(24))
    .alphaDecay(0.02)

  // rAF batching — one setState per frame
  sim.on('tick', () => { needsUpdateRef.current = true })
  const loop = () => {
    if (needsUpdateRef.current) {
      needsUpdateRef.current = false
      setNodePositions([...nodes])
    }
    rafRef.current = requestAnimationFrame(loop)
  }
  rafRef.current = requestAnimationFrame(loop)
  return () => { sim.stop(); cancelAnimationFrame(rafRef.current) }
}, [nodes, links])
```

**Zoom/pan:** d3-zoom on SVG element, transform applied to wrapping `<g>`.
**Drag:** Pointer events (not d3-drag) — set `node.fx`/`node.fy` during drag, clear on drop.
**Performance:** SVG is fine for <500 nodes. Simulation auto-stops when alpha decays.

### Cross-Tool Macro Orchestration

**Chosen approach: Reducer-based command dispatch** (fits existing useReducer architecture)

```typescript
// Each tool exports pure command handlers:
// src/ui/tools/map-display/commands.ts
export function handleMapCommand(state: MapDisplayState, command: string, payload: unknown): MapDisplayState {
  switch (command) {
    case 'load-preset': return payload as MapDisplayState
    case 'place-tokens': return { ...state, tokens: [...state.tokens, ...(payload as MapToken[])] }
    default: return state
  }
}

// Registry links tool types to handlers:
const COMMAND_HANDLERS: Record<string, CommandHandler> = {
  'map-display': handleMapCommand,
  'soundboard': handleSoundboardCommand,
}

// Canvas reducer processes EXECUTE_MACRO:
case 'EXECUTE_MACRO': {
  let newState = state
  for (const step of action.steps.filter(s => !s.delayMs)) {
    const idx = newState.windows.findIndex(w => w.toolType === step.targetTool)
    if (idx === -1) continue // tool not open
    const handler = COMMAND_HANDLERS[step.targetTool]
    if (!handler) continue
    const newToolState = handler(newState.windows[idx].toolState, step.command, step.payload)
    const windows = [...newState.windows]
    windows[idx] = { ...windows[idx], toolState: newToolState }
    newState = { ...newState, windows }
  }
  return { ...newState, pendingSteps: action.steps.filter(s => s.delayMs) }
}
```

**Side effects** (play audio, open tool if closed): handled by a `useMacroEffects` hook that watches `state.pendingEffects` and dispatches after execution.

**Why this approach:**
- Single source of truth (reducer)
- Undo/redo works automatically
- Persistence captures macro results
- "Tool not open" is trivially detectable
- Pure command handlers are testable

### Edge Cases & Gaps (from SpecFlow Analysis)

| Gap | Resolution |
|-----|-----------|
| Deleted note breaks /slash-links | Soft-delete notes (mark deleted), show broken-link indicator (red strikethrough). Allow permanent purge separately. |
| @mention data source | Party-tracker characters + bestiary templates, merged into one autocomplete list via new `entities:search` IPC endpoint |
| Autosave vs undo boundary | Undo is session-only (Tiptap built-in history). No version history. Undo lost on tool close. |
| Search implementation | LIKE query on title + content_json. Not FTS5 (overkill for expected scale <1000 notes). |
| Graph edges storage | Denormalized `note_links` table, updated on note save (extract /links from Tiptap JSON). Not runtime-parsed. |
| 3-column layout in tool window | Min size 800×500, left/right panels collapsible. User can resize window larger. |
| Map preset includes what? | Full MapDisplayState snapshot (background, tokens, fog, VFX, viewport). Loading during combat shows confirmation dialog. |
| Macro step failure | Skip failed step, show toast warning, continue execution. |
| Tool not open when macro fires | Auto-open via `OPEN_WINDOW` dispatch before applying state. Add `autoOpen: true` flag to step. |
| Calendar event storage | Requires new `calendar_events` table + IPC endpoints in time-calendar module (currently no event persistence). |
| Backlinks | Query `note_links` table in both directions. Right panel shows "Linked from" section. |
