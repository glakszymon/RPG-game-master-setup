---
title: "feat: LAN Sharing Player View System"
type: feat
status: active
date: 2026-05-20
origin: docs/brainstorms/2026-05-20-lan-sharing-requirements.md
---

# feat: LAN Sharing Player View System

## Overview

Implement a local HTTP + WebSocket server in the Electron main process that broadcasts game state (map, initiative) to player browsers on the same LAN. DM controls sharing via a "Player View" canvas window that doubles as preview + control panel.

## Problem Statement

During tabletop RPG sessions, players need to see the map and initiative on their own devices (phones, tablets, projector). Currently there's no way to share the DM's view. This is the app's "killer feature" (see origin: `docs/brainstorms/2026-05-20-lan-sharing-requirements.md`).

## Proposed Solution

Three-layer architecture:
1. **Server layer** — Express + Socket.io in Electron main process, started/stopped by DM
2. **DM control layer** — Player View tool window with preview, server controls, and sharing toggles
3. **Player client** — Separate lightweight React app served by Express, renders shared state

## Technical Approach

### Architecture

```
┌─────────────────────────────────────────────────────────┐
│ Electron Main Process                                    │
│                                                          │
│  ┌──────────────┐    ┌─────────────────────────────┐    │
│  │ IPC Handlers │◄──►│ LAN Server Module            │    │
│  │ (lan:*)      │    │  - Express (static assets)   │    │
│  └──────┬───────┘    │  - Socket.io (state sync)    │    │
│         │            │  - State aggregator           │    │
│         │            └─────────────────────────────┘    │
│         │                        │                       │
└─────────┼────────────────────────┼───────────────────────┘
          │                        │ HTTP + WS
          ▼                        ▼
┌─────────────────┐    ┌─────────────────────┐
│ Renderer (DM)   │    │ Player Browser(s)    │
│ Player View     │    │ Lightweight React    │
│ tool window     │    │ - Map canvas         │
│ (preview+ctrl)  │    │ - Initiative overlay │
└─────────────────┘    └─────────────────────┘
```

### Implementation Phases

#### Phase 1: Server Infrastructure

**Goal:** Express + Socket.io server starts/stops from Electron, serves a hello page.

**Files:**

| File | Action |
|------|--------|
| `package.json` | Add `express`, `socket.io`, `@types/express` |
| `src/electron/lanServer.ts` | **NEW** — Server module (start/stop/status/broadcast) |
| `src/electron/main.ts` | Add `lan:start`, `lan:stop`, `lan:status`, `lan:broadcast` IPC handlers |
| `src/electron/preload.ts` | Add `electronAPI.lan.*` bridge methods |
| `src/ui/electron.d.ts` | Declare `lan` domain types |

**`src/electron/lanServer.ts` design:**

```typescript
// Core exports
export function startServer(port?: number): Promise<{ port: number; addresses: string[] }>
export function stopServer(): Promise<void>
export function getStatus(): { running: boolean; port: number | null; connections: number }
export function broadcast(channel: string, data: unknown): void

// Internal
// - Auto-tries ports 7777-7787 on EADDRINUSE
// - Discovers non-internal IPv4 network interfaces for display
// - Socket.io configured with cors: { origin: '*' } (LAN only, no auth)
// - On client connect: emits 'initial-state' with full snapshot
// - Graceful shutdown: broadcast disconnect event, close all sockets, release port
```

**IPC channels:**

| Channel | Direction | Payload |
|---------|-----------|---------|
| `lan:start` | renderer→main | `{ port?: number }` |
| `lan:stop` | renderer→main | — |
| `lan:status` | renderer→main | returns `{ running, port, connections, addresses }` |
| `lan:broadcast` | renderer→main | `{ channel: string, data: unknown }` |

**Acceptance:**
- [ ] Server starts on available port, returns URL(s)
- [ ] Server stops cleanly, port released
- [ ] Socket.io accepts connections, emits hello on connect
- [ ] Port conflict auto-resolves (tries next port)
- [ ] App quit triggers graceful server shutdown

---

#### Phase 2: Player View DM Window

**Goal:** Player View tool window registered on canvas, with Start/Stop button, URL display, sharing toggles, and live preview.

**Files:**

| File | Action |
|------|--------|
| `src/ui/tools/player-view/types.ts` | **NEW** — `PlayerViewState` interface |
| `src/ui/tools/player-view/PlayerView.tsx` | **NEW** — Main component |
| `src/ui/tools/player-view/PlayerView.module.css` | **NEW** — Styles |
| `src/ui/tools/player-view/hooks/usePlayerViewBroadcast.ts` | **NEW** — State aggregation + broadcast hook |
| `src/ui/canvas/types.ts` | Add `'player-view'` to ToolType, sizes, info, categories |
| `src/ui/canvas/InfiniteCanvas.tsx` | Add case + import |

**`PlayerViewState` interface:**

```typescript
interface PlayerViewState {
  serverRunning: boolean;
  port: number | null;
  addresses: string[];
  connections: number;
  sharedWindows: string[];       // IDs of tool windows being shared
  rotation: 0 | 90 | 180 | 270; // player view rotation
  interactionMode: 'disabled' | 'immediate' | 'approval'; // global for v1
}
```

**Player View window layout:**
- Top bar: Start/Stop button + status indicator (green dot when running)
- URL display: `http://192.168.x.x:7777` (copyable, large text)
- Connection count: "3 connected"
- Sharing toggles: checkboxes for each open tool window (map, initiative)
- Rotation selector: 0°/90°/180°/270° buttons
- Preview area: scaled-down render of what players see

**Acceptance:**
- [ ] Player View appears in context menu under appropriate category
- [ ] Start/Stop toggles server via IPC
- [ ] URL displayed when server running
- [ ] Sharing toggles control which windows are broadcast
- [ ] Rotation selector updates `PlayerViewState.rotation`

---

#### Phase 3: State Aggregation & Broadcast

**Goal:** Aggregate selected tool window states, transform for player consumption, broadcast over Socket.io.

**Key design decisions (see origin doc):**

| Concern | Decision |
|---------|----------|
| Broadcast trigger | Viewport: throttled 15fps. Tokens: on drag-end. FoW: debounced 300ms. Combat: immediate on discrete actions. |
| Map image delivery | Serve via Express static route. Write map image to temp file, serve at `/assets/{hash}.ext`. Send URL in state. |
| FoW delivery | Send full FoW PNG via HTTP static route on connect + on DM explicit reveal actions (debounced). |
| Player-visible combat | Turn order, names, portraits, active index, round. HP hidden by default (toggle). |
| VFX | Broadcast `{ preset, x, y, size, mode, remainingMs }`. Player reconstructs locally. |

**`PlayerBroadcastState` (what gets sent to players):**

```typescript
interface PlayerMapState {
  imageUrl: string;             // HTTP URL (not filesystem path)
  viewport: { x: number; y: number; zoom: number };
  tokens: Array<{ id: string; x: number; y: number; radius: number; color: string; label: string }>;
  fowUrl: string;               // HTTP URL to FoW PNG overlay
  grid: { enabled: boolean; size: number; color: string; opacity: number };
  vfx: Array<{ preset: string; x: number; y: number; size: number; remainingMs: number }>;
}

interface PlayerCombatState {
  combatants: Array<{ name: string; portrait?: string; initiative: number }>;
  activeCombatantIndex: number;
  currentRound: number;
  showHp: boolean;  // DM toggle
  hp?: Array<{ current: number; max: number }>;  // only if showHp
}

interface PlayerBroadcastState {
  map?: PlayerMapState;
  combat?: PlayerCombatState;
  rotation: 0 | 90 | 180 | 270;
}
```

**Broadcast hook (`usePlayerViewBroadcast`):**
- Subscribes to state changes of shared windows via event bus
- Transforms raw tool state → player-safe state (strips hidden data, converts paths to URLs)
- Throttles/debounces per data type
- Calls `electronAPI.lan.broadcast('state-update', playerState)`

**Files:**

| File | Action |
|------|--------|
| `src/electron/lanServer.ts` | Add static file serving for map/FoW assets |
| `src/ui/tools/player-view/hooks/usePlayerViewBroadcast.ts` | Implement state aggregation + broadcast |
| `src/ui/tools/player-view/hooks/useAssetServer.ts` | **NEW** — IPC calls to register temp files for HTTP serving |

**Acceptance:**
- [ ] Map state broadcast on viewport change (throttled 15fps)
- [ ] Token positions broadcast on drag-end
- [ ] FoW broadcast debounced 300ms after reveal/conceal
- [ ] Combat state broadcast on discrete actions (advance turn, add combatant)
- [ ] Map image accessible via HTTP URL to player browsers
- [ ] FoW overlay accessible via HTTP URL
- [ ] Hidden tokens/monster HP not leaked to players (unless DM enables)

---

#### Phase 4: Player Browser Client

**Goal:** Lightweight React app served by Express, renders map + initiative overlay.

**Files:**

| File | Action |
|------|--------|
| `src/player-client/index.html` | **NEW** — HTML entry point |
| `src/player-client/main.tsx` | **NEW** — React entry + Socket.io connection |
| `src/player-client/PlayerApp.tsx` | **NEW** — Root component |
| `src/player-client/MapRenderer.tsx` | **NEW** — Canvas 2D map display (simplified) |
| `src/player-client/InitiativeOverlay.tsx` | **NEW** — Corner initiative panel |
| `src/player-client/PlayerApp.module.css` | **NEW** — Styles (fullscreen, rotation) |
| `vite.config.ts` | Add separate build entry for player-client |

**Player client architecture:**
- Connects to Socket.io on page load
- Receives `initial-state` on connect → renders immediately
- Receives `state-update` events → patches local state → re-renders
- No routing, no navigation — single fullscreen view
- Responsive: works on mobile/tablet/desktop
- Rotation: CSS `transform: rotate(Xdeg)` on root container

**Map rendering (simplified vs DM):**
- Draws map image from HTTP URL (not base64)
- Applies viewport transform (mirror of DM)
- Renders tokens at broadcast positions
- Overlays FoW from HTTP URL
- Renders VFX from broadcast params
- Renders grid if enabled
- **No interaction handlers** in v1 (view-only)

**Initiative overlay:**
- Fixed position in configurable corner (bottom-right default)
- Shows combatant list with active indicator
- Semi-transparent glassmorphism card
- Auto-hides when combat not active

**Disconnect handling:**
- Socket disconnect → show "Connection lost. Refresh to reconnect." message
- No auto-reconnect UX (per origin doc decision)

**Acceptance:**
- [ ] Player client builds as separate Vite entry
- [ ] Express serves built player client at root `/`
- [ ] Socket.io connects and receives initial state
- [ ] Map renders fullscreen with correct viewport
- [ ] FoW overlay renders correctly
- [ ] Tokens rendered at correct positions
- [ ] Initiative overlay shows in corner when combat active
- [ ] Rotation works (0/90/180/270)
- [ ] Responsive on mobile/tablet/desktop
- [ ] Disconnect shows static error message

---

#### Phase 5: Preview in DM Window

**Goal:** Player View window shows scaled-down preview of what players actually see.

**Approach:** Render a small canvas in the Player View tool window using the same `PlayerBroadcastState` that gets sent to players. This ensures preview matches reality.

**Files:**

| File | Action |
|------|--------|
| `src/ui/tools/player-view/components/PlayerPreview.tsx` | **NEW** — Mini canvas renderer |
| `src/ui/tools/player-view/PlayerView.tsx` | Integrate preview component |

**Acceptance:**
- [ ] Preview shows map with tokens, FoW, and viewport matching player view
- [ ] Preview updates in real-time as DM makes changes
- [ ] Preview shows rotation if set
- [ ] Preview scales to fit available space in Player View window

---

## System-Wide Impact

### Interaction Graph

- DM changes map state → `MapDisplay` calls `onToolStateChange` → canvas reducer updates `WindowState.toolState` → `usePlayerViewBroadcast` detects change → throttles → transforms → IPC `lan:broadcast` → Socket.io emits to all clients → player browsers re-render

### Error Propagation

- Port conflict: `lanServer.startServer()` catches `EADDRINUSE`, auto-tries next port, surfaces final port or error to renderer via IPC return value
- Express errors: Caught in main process, logged, server stays running
- Socket.io disconnect: Client sees disconnect event, shows message. No server-side error.
- Large file serving: Express streams from disk (not memory). If file missing, 404 → player shows broken image

### State Lifecycle Risks

- **Server running after window close:** Mitigated — closing Player View window triggers `lan:stop` via cleanup effect
- **Stale assets in temp dir:** Mitigated — cleanup temp files on server stop and app quit
- **Broadcast before server ready:** Guard with `serverRunning` check in broadcast hook

### API Surface Parity

- New IPC domain `lan:*` follows same patterns as `canvas:*`, `soundboard:*`
- Player View tool follows same registration pattern as all tools (types.ts entries + InfiniteCanvas case)

---

## Acceptance Criteria

### Functional

- [ ] DM can start/stop LAN server from Player View window
- [ ] Server displays connectable URL(s) for LAN devices
- [ ] Players see map with FoW, tokens, and grid in browser
- [ ] Players see initiative overlay when combat is active
- [ ] Viewport mirrors DM's camera (pan/zoom)
- [ ] DM can rotate player view for projector use
- [ ] DM can toggle which windows are shared
- [ ] State updates reach players within 200ms (discrete actions)
- [ ] Works with 4-6 simultaneous player connections on home WiFi

### Non-Functional

- [ ] Server doesn't block Electron main process (streaming from disk, not memory)
- [ ] Player client loads within 3 seconds on LAN
- [ ] Player client works on Chrome/Firefox/Safari mobile and desktop
- [ ] Graceful shutdown on app quit (no orphaned port)

### Quality Gates

- [ ] `npm run build` passes with no type errors
- [ ] `npm run lint` passes
- [ ] Player client builds separately without pulling in Electron dependencies
- [ ] Manual testing: DM starts server, 2+ browsers connect, map/initiative visible

## Dependencies & Prerequisites

- Map display tool must be functional (it is)
- Combat tracker must have serializable state (it does — `CombatTrackerState`)
- Event bus for cross-tool communication (exists per plans)

## Alternative Approaches Considered

| Approach | Rejected Because |
|----------|-----------------|
| SSE (Server-Sent Events) | Need bidirectional for future player interactions (R53) |
| Fastify + ws | Less ecosystem support, manual reconnect/rooms |
| uWebSockets.js | C++ bindings, cross-platform risk in Electron |
| Worker thread for server | Added complexity; Express on main process is fine for LAN scale (≤10 clients) |
| Canvas image snapshots (screenshot approach) | High bandwidth, no interactivity, poor quality scaling |

## Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Main process blocking on large file serve | Low | Medium | Express streams from disk; map images typically <10MB |
| Port conflicts on user machines | Medium | Low | Auto-try range 7777-7787 |
| Socket.io bundle size in player client | Low | Low | Player client is separate build, tree-shaken |
| Canvas 2D performance on mobile (player) | Medium | Medium | Player renders simplified view (no editing tools, no brush cursors) |

## Outstanding Technical Questions (Deferred from Origin)

- **Full state vs delta patches:** Start with full state broadcast (simpler). Optimize to deltas if performance issues arise with 6+ players.
- **Separate Vite build config:** Need to configure multi-entry Vite build (one for Electron renderer, one for player client). Research during implementation.
- **DPR handling in player canvas:** Mobile devices have high DPR. Player canvas needs to match device pixel ratio for sharp rendering.

## Sources & References

### Origin

- **Origin document:** [docs/brainstorms/2026-05-20-lan-sharing-requirements.md](docs/brainstorms/2026-05-20-lan-sharing-requirements.md) — Key decisions: Express + Socket.io, zero auth, viewport mirror, manual server lifecycle, configurable per-action interactions, page rotation for projectors.

### Internal References

- Tool registration pattern: `src/ui/canvas/types.ts:5-142`
- IPC pattern: `src/electron/preload.ts`, `src/electron/main.ts`
- Map state structure: `src/ui/tools/map-display/types.ts`
- Event bus: `docs/plans/2026-05-18-002-feat-combat-tracker-map-integration-plan.md`
- Canvas 2D rewrite: `docs/plans/2026-05-15-003-refactor-map-display-canvas2d-rewrite-plan.md`

### External References

- Socket.io docs: https://socket.io/docs/v4/
- Express static serving: https://expressjs.com/en/starter/static-files.html
- Electron networking: https://www.electronjs.org/docs/latest/tutorial/security
