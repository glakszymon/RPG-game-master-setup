# Game Master Panel

Desktop application for tabletop RPG game masters. Infinite canvas workspace with draggable tool windows, built with Electron + React + TypeScript.

![Platform](https://img.shields.io/badge/platform-Linux%20%7C%20Windows%20%7C%20macOS-blue)
![Electron](https://img.shields.io/badge/electron-42-47848F)
![React](https://img.shields.io/badge/react-19-61DAFB)
![TypeScript](https://img.shields.io/badge/typescript-6-3178C6)

## Features

### Infinite Canvas
- Pan & zoom workspace with minimap
- Drag, resize, minimize, and close tool windows
- Multiple instances of the same tool
- Configurable background (dark / dot grid / line grid)
- Undo/redo support
- Auto-save state per campaign

### Campaign Management
- Create, edit, archive, and delete campaigns
- Campaign wizard with system selection and custom icons
- Per-campaign settings and backgrounds

### Tools

| Tool | Description |
|------|-------------|
| **Map Display** | Canvas 2D map renderer with tokens, fog of war, and VFX effects |
| **Party Tracker** | Character cards with HP, stats, and notes |
| **Combat Tracker** | Turn-based initiative tracker with map integration |
| **Bestiary** | SRD monster library with encounter sets |
| **NPC Tool** | NPC generator and library |
| **Equipment Library** | Items and weapons catalog with filters |
| **Notepad** | Rich text block editor with tables and task lists |
| **Soundboard** | Audio panel for ambient sounds and music |
| **Time Clock** | In-game clock with sky arc visualization |
| **Time Calendar** | Calendar grid for in-game date tracking |
| **Session Timer** | Real-time session timer with pinned countdowns |
| **Weather Generator** | Weather system with biome-based forecasts |
| **Player View** | Shared view for players (LAN sharing via Socket.io) |

### Design
- Dark mode glassmorphism UI
- Gold accent color (#C9B06B)
- Exo 2 + Michroma fonts
- CSS Modules + Radix UI components
- 4px spacing scale

## Tech Stack

- **Runtime:** Electron 42
- **Frontend:** React 19, TypeScript 6, Vite 8
- **UI:** Radix UI (headless), CSS Modules
- **Database:** SQLite via sql.js (WASM)
- **Rich Text:** TipTap editor
- **Networking:** Socket.io (LAN player view)
- **Maps:** HTML Canvas 2D
- **Build:** electron-builder

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (v18+)
- npm

### Installation

```bash
git clone https://github.com/glakszymon/RPG-game-master-tool.git
cd RPG-game-master-tool
npm install
```

### Development

```bash
npm run dev
```

Starts both Vite dev server and Electron with hot reload.

### Build

```bash
# Linux
npm run dist:linux

# Windows
npm run dist:win

# macOS
npm run dist:mac
```

Output will be in the `dist/` directory.

### Other Commands

```bash
npm run build              # TypeScript check + Vite production build
npm run lint               # ESLint
npm run build:player-client  # Build standalone player client
```

## Project Structure

```
Game_Master_Panel/
├── src/
│   ├── electron/              # Main process (Node.js)
│   │   ├── main.ts            # IPC handlers, window creation
│   │   ├── preload.ts         # contextBridge API
│   │   └── database.ts        # SQLite CRUD
│   ├── ui/                    # Renderer process (React)
│   │   ├── canvas/            # Infinite canvas system
│   │   ├── tools/             # Tool modules (13 tools)
│   │   ├── components/        # Shared UI primitives
│   │   ├── views/             # Top-level views (Hub)
│   │   └── styles/            # Global CSS, design tokens
│   ├── player-client/         # Standalone player viewer
│   └── main.tsx               # React entry point
├── assets/                    # Icons, SRD data, images, audio
├── docs/                      # Brainstorms and plans
├── index.html
├── vite.config.ts
└── package.json
```

## Data

Includes SRD (System Reference Document) data:
- `assets/monsters.json` - D&D 5e SRD monsters
- `assets/srd-items.json` - SRD equipment
- `assets/srd-spells.json` - SRD spells

