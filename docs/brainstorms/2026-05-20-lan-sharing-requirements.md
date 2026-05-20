---
date: 2026-05-20
topic: lan-sharing
---

# LAN Sharing — Player View System

## Problem Frame

During tabletop RPG sessions, players need to see the map, initiative order, and other game elements on their own devices (phones, tablets, laptops) or a shared projector. The DM controls what is visible and interactive, broadcasting game state in real-time over the local network.

## Requirements

- R49. Application starts a local HTTP + WebSocket server (Express + Socket.io) in the Electron main process. Players connect via browser on the same LAN.
- R50. DM has a "Player View" preview window on the canvas showing exactly what players see (live mirror).
- R51. DM selects which tool windows are shared to players. Initially supported: map and initiative tracker.
- R52. Real-time synchronization via WebSocket (Socket.io) — full duplex communication.
- R53. Player interactions are configurable per-action by DM (e.g., token movement can be: disabled, immediate, or requires DM approval).
- R54. Player browser UI: map is always fullscreen, initiative tracker is overlaid in a configurable corner.
- R55. Page rotation control (0°/90°/180°/270°) for projector setups where orientation needs adjusting.
- R56. Map viewport is mirrored from DM — players see exactly the same camera position and zoom as the DM sets.
- R57. No authentication — any device on the LAN can access the player view URL immediately.
- R58. Session token for basic connection management (reconnect handling, not security).
- R59. Server displays its LAN address/port in DM UI for easy sharing with players.
- R60. Fog of War is respected — players only see revealed areas (same FoW state as DM's map).
- R61. Server is manually started/stopped by DM from the Player View window (not autostart).
- R62. Player View window combines: live preview, Start/Stop button, LAN URL display, and sharing toggles for which windows are broadcast.

## Success Criteria

- Players at a table see the map with FoW on their devices within 5 seconds of connecting
- DM toggling a window visible/hidden reflects on player devices within 200ms
- Works reliably on home WiFi with 4-6 connected players
- Projector users can rotate the view to match physical table orientation
- DM preview window accurately reflects the player experience

## Scope Boundaries

- No audio streaming (Soundboard stays DM-local)
- No per-player views (all players see the same thing)
- No authentication or player identity management
- No internet/cloud — LAN only
- No player chat or messaging
- Initially only map + initiative; other tools added later

## Key Decisions

- **Express + Socket.io** over Fastify/ws or uWebSockets: best ecosystem, built-in reconnect/rooms/broadcast, well-documented in Electron context
- **Zero auth**: LAN-only, trusted table environment. No passwords, no player assignment.
- **Viewport mirror**: DM controls the camera. Players cannot pan/zoom independently. Simplifies sync and ensures everyone sees the same thing.
- **Configurable interactions**: DM sets per-session whether players can move tokens (disabled/immediate/approval). Default: disabled.
- **Rotation for projectors**: Simple CSS transform on the entire player view. Low cost, high value for ceiling-mounted projectors.
- **Preview as canvas window**: Fits existing tool-window architecture. Renders same data as player browser.
- **Manual server lifecycle**: DM explicitly starts/stops from Player View window. No autostart.
- **Simple disconnect**: No auto-reconnect UX. Player refreshes page manually. Server down = static error message.

## Dependencies / Assumptions

- Relies on existing map rendering (canvas 2D) being extractable as serialized state
- Initiative tracker state must be serializable for broadcast
- Express server runs in Electron main process (Node.js context)
- Player browser UI is a separate React app served by the Express server (not Electron)

## Outstanding Questions

### Resolve Before Planning

(None — all product decisions resolved)

### Deferred to Planning

- [Affects R49][Technical] How to bundle and serve the player React app from Electron (Vite build output? inline? separate entry point?)
- [Affects R52][Technical] State sync strategy: full state broadcast vs delta patches
- [Affects R56][Technical] How to serialize and transmit canvas 2D map state efficiently (image snapshots vs redraw commands)
- [Affects R54][Needs research] Best approach for responsive fullscreen map in player browser (canvas element sizing, DPR handling)
- [Affects R53][Technical] Protocol design for player actions (request/approve/reject flow)

## Next Steps

→ `/ce:plan` for structured implementation planning
