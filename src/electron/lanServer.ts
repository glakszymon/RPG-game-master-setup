/**
 * LAN Server Module — Express + Socket.io for broadcasting game state to player browsers.
 * Runs in the Electron main process.
 */

import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { networkInterfaces } from 'os';
import path from 'path';
import fs from 'fs';
import { app } from 'electron';

// ── State ──

let httpServer: ReturnType<typeof createServer> | null = null;
let io: SocketIOServer | null = null;
let currentPort: number | null = null;
let connectionCount = 0;
let lastBroadcastState: unknown = null;

// ── Temp asset directory for serving map/FoW images ──

const TEMP_ASSETS_DIR = path.join(app.getPath('temp'), 'gmp-lan-assets');

// ── Public API ──

export interface LanServerStatus {
  running: boolean;
  port: number | null;
  connections: number;
  addresses: string[];
}

export interface LanStartResult {
  success: boolean;
  port: number | null;
  addresses: string[];
  error?: string;
}

/**
 * Start the Express + Socket.io server. Tries ports 7777-7787 on conflict.
 */
export async function startServer(preferredPort?: number): Promise<LanStartResult> {
  if (httpServer) {
    return { success: true, port: currentPort, addresses: getLanAddresses() };
  }

  // Ensure temp assets dir exists
  fs.mkdirSync(TEMP_ASSETS_DIR, { recursive: true });

  const expressApp = express();

  // Serve local files by absolute path (LAN-only, no auth needed)
  expressApp.get('/file', (req, res) => {
    const filePath = req.query.path as string;
    if (!filePath || !path.isAbsolute(filePath)) {
      res.status(400).send('Invalid path');
      return;
    }
    if (!fs.existsSync(filePath)) {
      res.status(404).send('File not found');
      return;
    }
    res.sendFile(filePath);
  });

  // Serve static player client
  const playerClientDir = getPlayerClientDir();
  if (fs.existsSync(playerClientDir)) {
    expressApp.use(express.static(playerClientDir));
  }

  // Serve temp assets (map images, FoW PNGs)
  expressApp.use('/assets', express.static(TEMP_ASSETS_DIR));

  httpServer = createServer(expressApp);
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    allowEIO3: true,
    transports: ['polling', 'websocket'],
  });

  io.on('connection', (socket) => {
    connectionCount++;
    // Send last known state to new client
    if (lastBroadcastState) {
      socket.emit('state-update', lastBroadcastState);
    }

    socket.on('disconnect', () => {
      connectionCount--;
    });
  });

  // Try ports
  const startPort = preferredPort ?? 7777;
  const maxAttempts = 11; // 7777-7787

  for (let i = 0; i < maxAttempts; i++) {
    const port = startPort + i;
    try {
      await listenOnPort(httpServer, port);
      currentPort = port;
      return { success: true, port, addresses: getLanAddresses() };
    } catch (err: unknown) {
      const code = (err as NodeJS.ErrnoException).code;
      if (code === 'EADDRINUSE' && i < maxAttempts - 1) {
        continue; // Try next port
      }
      // Final attempt failed or non-EADDRINUSE error
      httpServer = null;
      io = null;
      return { success: false, port: null, addresses: [], error: String(err) };
    }
  }

  return { success: false, port: null, addresses: [], error: 'All ports in range 7777-7787 are in use' };
}

/**
 * Stop the server and release the port.
 */
export async function stopServer(): Promise<void> {
  if (!httpServer) return;

  // Notify all clients
  io?.emit('server-shutdown');

  // Close all socket connections
  io?.disconnectSockets(true);
  io?.close();

  await new Promise<void>((resolve) => {
    httpServer!.close(() => resolve());
  });

  httpServer = null;
  io = null;
  currentPort = null;
  connectionCount = 0;
  lastBroadcastState = null;

  // Cleanup temp assets
  cleanupTempAssets();
}

/**
 * Get current server status.
 */
export function getStatus(): LanServerStatus {
  return {
    running: httpServer !== null,
    port: currentPort,
    connections: connectionCount,
    addresses: httpServer ? getLanAddresses() : [],
  };
}

/**
 * Broadcast data to all connected player clients.
 */
export function broadcast(channel: string, data: unknown): void {
  if (!io) return;
  if (channel === 'state-update') {
    lastBroadcastState = data;
  }
  io.emit(channel, data);
}

/**
 * Register a temp asset file for HTTP serving. Returns the URL path.
 */
export function registerAsset(filename: string, buffer: Buffer): string {
  fs.mkdirSync(TEMP_ASSETS_DIR, { recursive: true });
  const filePath = path.join(TEMP_ASSETS_DIR, filename);
  fs.writeFileSync(filePath, buffer);
  return `/assets/${filename}`;
}

/**
 * Get the Socket.io instance (for advanced use from IPC handlers).
 */
export function getIO(): SocketIOServer | null {
  return io;
}

// ── Private helpers ──

function listenOnPort(server: ReturnType<typeof createServer>, port: number): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '0.0.0.0', () => {
      server.removeListener('error', reject);
      resolve();
    });
  });
}

function getLanAddresses(): string[] {
  const interfaces = networkInterfaces();
  const addresses: string[] = [];

  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name] ?? []) {
      // Skip internal (loopback) and non-IPv4
      if (iface.internal || iface.family !== 'IPv4') continue;
      addresses.push(iface.address);
    }
  }

  return addresses;
}

function getPlayerClientDir(): string {
  // In dev: dist-player-client in the project root (cwd)
  const devPath = path.join(process.cwd(), 'dist-player-client');
  if (fs.existsSync(devPath)) return devPath;
  // In production: next to the app asar
  return path.join(app.getAppPath(), 'dist-player-client');
}

function cleanupTempAssets(): void {
  try {
    if (fs.existsSync(TEMP_ASSETS_DIR)) {
      fs.rmSync(TEMP_ASSETS_DIR, { recursive: true, force: true });
    }
  } catch {
    // Silent cleanup failure
  }
}
