# AGENTS.md — Game Master Panel

> Instructions for AI coding agents operating in this repository.

## Project Overview

Electron 42 + React 19 + TypeScript desktop app for tabletop RPG game masters.
Infinite canvas workspace with draggable tool windows (map, party tracker, combat, etc.).
SQLite persistence via sql.js (WASM). CSS Modules + Radix UI. Dark-mode glassmorphism design.

## Build & Run Commands

```bash
npm run dev              # Start Electron + Vite dev server (hot reload)
npm run build            # TypeScript check + Vite production build
npm run lint             # ESLint across all .ts/.tsx files
npm run transpile:electron  # Compile electron/ folder (main + preload)
npm run dist:linux       # Build distributable for Linux
npm run dist:win         # Build distributable for Windows
npm run dist:mac         # Build distributable for macOS
```

There is **no test framework** configured. No `test` script, no jest/vitest/playwright.
Validate changes with `npm run build` and `npm run lint`.

## Project Structure

```
src/
  electron/                  # Main process (Node.js)
    main.ts                  # IPC handlers, window creation
    preload.ts               # contextBridge API for renderer
    database.ts              # sql.js CRUD, persist() flushes to disk
  ui/                        # Renderer process (React)
    canvas/                  # Core infinite canvas system
      hooks/                 # useCanvasState, usePanZoom, useCanvasPersistence, useUndoRedo
      types.ts               # WindowState, CanvasState, CanvasAction
      InfiniteCanvas.tsx     # Root canvas component
      CanvasWindow.tsx       # Draggable/resizable window wrapper
    tools/                   # Self-contained tool modules
      map-display/           # Map tool (canvas 2D renderer)
        hooks/               # useCanvasRenderer, useTokenRenderer, useFowRenderer, useVfxRenderer
        types.ts             # MapDisplayState, MapToken, VfxSettings
        MapDisplay.tsx
      party-tracker/         # Character cards
      ...
    components/              # Shared UI primitives (Button, Card, Modal, Input)
    views/                   # Top-level views (Hub)
    styles/                  # Global CSS, design tokens
    electron.d.ts            # Type declarations for window.electronAPI
docs/
  brainstorms/tutorial.md    # Project knowledge base — UPDATE ON EVERY CHANGE (see below)
```

## tutorial.md Protocol

**Critical:** `docs/brainstorms/tutorial.md` is the project knowledge base.
- After every feature, discovery, or architectural decision — append to tutorial.md
- Preserve existing structure; add to the relevant section
- If your changes contradict something in tutorial.md — ask the user before overwriting
- Check tutorial.md before implementing to ensure consistency with prior decisions

## Code Style

### TypeScript
- **Strict mode** — `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`
- **Target:** ES2023, module ESNext, `verbatimModuleSyntax: true`
- **No `any`** — use `unknown` for untyped data, then narrow
- **`import type`** for type-only imports (enforced by verbatimModuleSyntax)
- **Interfaces** for data shapes, **type aliases** for unions
- **Explicit return types** on exported DB/utility functions; implicit on components and hooks

### Naming
| Element | Convention | Example |
|---------|-----------|---------|
| Component files | PascalCase.tsx | `MapDisplay.tsx` |
| Hook files | camelCase use*.ts | `useTokenRenderer.ts` |
| Type files | lowercase types.ts | `types.ts` |
| CSS module files | PascalCase.module.css | `MapDisplay.module.css` |
| Tool folders | kebab-case | `map-display/`, `party-tracker/` |
| Components | PascalCase functions | `export function MapDisplay()` |
| Hooks | use prefix camelCase | `useCanvasRenderer` |
| Types/Interfaces | PascalCase | `MapToken`, `WindowState` |
| Reducer actions | SCREAMING_SNAKE | `'OPEN_WINDOW'`, `'LOAD_STATE'` |
| Constants | SCREAMING_SNAKE | `TOKEN_RADIUS`, `MIN_ZOOM` |
| CSS classes | camelCase | `.canvasArea`, `.toolSection` |
| CSS variables | kebab-case | `--color-bg-base`, `--glass-blur` |
| IPC channels | domain:verb kebab | `'canvas:save'`, `'dialog:read-image'` |

### Import Order
1. React / external libraries (`react`, `@radix-ui/*`, `sql.js`)
2. Local hooks (`./hooks/useCanvasRenderer`)
3. Local components (`./CanvasWindow`)
4. Type-only imports (`import type { ... } from './types'`)
5. CSS modules last (`import styles from './Component.module.css'`)

### State Management
- **useReducer** with discriminated union actions — no external state library
- Tool state stored as `unknown` in `WindowState.toolState`; each tool casts to its own type
- **useUndoRedo** wraps useReducer for undo/redo + action coalescing
- **useCanvasPersistence** debounce-saves full state to SQLite via IPC
- State flows top-down via props; no React Context for shared state
- `useCallback` for stable refs; `useRef` for mutable values in rAF/event handlers
- `useLayoutEffect` to keep callback refs fresh without retriggering effects

### CSS
- CSS Modules exclusively — one `.module.css` per component
- Design tokens via CSS custom properties in global styles
- Glassmorphism: `backdrop-filter: blur()`, `rgba()` backgrounds
- Section comments: `/* ── Section Name ── */`
- 4px spacing scale: 4, 8, 12, 16, 20, 24, 32, 40, 48, 64

### Error Handling
- **Database layer:** Guard clause `if (!db) throw new Error(...)` at function start
- **IPC main process:** Silent try/catch returning `null` on failure
- **Renderer/hooks:** Null checks + early returns, `console.error` for diagnostics
- **No centralized error boundary** — handle errors locally

## IPC Architecture (Three Layers)

1. **preload.ts** — `contextBridge.exposeInMainWorld('electronAPI', { ... })`
   Organized by domain: `electronAPI.canvas.*`, `electronAPI.campaigns.*`, `electronAPI.dialog.*`
2. **main.ts** — `ipcMain.handle('domain:verb', handler)` thin wrappers delegating to database.ts
3. **database.ts** — Pure data access, no IPC awareness. Calls `persist()` after mutations.

Type safety: `src/ui/electron.d.ts` declares the `window.electronAPI` shape for renderer.

## Map Module (Canvas 2D)

The map uses **native HTML Canvas 2D** (not Pixi.js — rewritten from Pixi in earlier iteration).
Key hooks: `useCanvasRenderer` (render loop, viewport), `useTokenRenderer`, `useFowRenderer`, `useVfxRenderer`.
Images loaded via IPC (`dialog:read-image` returns base64 data URL) because Chromium blocks `file://`.

## Key Patterns

- **patchState pattern:** `useCallback((patch: Partial<State>) => onToolStateChange({...current, ...patch}))` — atomic partial updates that prevent stale-ref overwrites
- **React StrictMode:** Effects run twice in dev. Use cleanup functions properly. Beware of async guards (`loadingRef`) that may deadlock across double-invocation.
- **Debounced persistence:** 500ms debounce on state saves. `readyRef` guard prevents saving before initial load completes.
- **Cross-tool drag & drop:** HTML5 DnD with `application/json` data transfer between React components.

## Language

- User communicates in **Polish**
- Code, comments, commit messages, and variable names in **English**
