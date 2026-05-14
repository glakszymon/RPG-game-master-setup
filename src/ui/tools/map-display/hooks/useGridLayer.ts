import { useEffect, useRef } from 'react';
import { Graphics, Container } from 'pixi.js';
import type { GridConfig } from '../types';

/**
 * useGridLayer — draws a square or hex grid overlay on the map.
 *
 * The grid Graphics object is added to `worldContainer` at child index 1
 * (above the map sprite at index 0, below future token/FoW layers).
 *
 * Redraws whenever gridConfig or mapSize changes.
 */
export function useGridLayer(
  worldContainer: Container | null,
  gridConfig: GridConfig,
  mapWidth: number,
  mapHeight: number,
) {
  const gfxRef = useRef<Graphics | null>(null);

  useEffect(() => {
    if (!worldContainer) return;

    // Create or reuse Graphics
    let gfx = gfxRef.current;
    if (!gfx) {
      gfx = new Graphics();
      gfx.label = 'grid-overlay';
      // Insert at index 1 (above map sprite at 0)
      const insertIndex = Math.min(1, worldContainer.children.length);
      worldContainer.addChildAt(gfx, insertIndex);
      gfxRef.current = gfx;
    }

    // Clear previous drawing
    gfx.clear();

    if (gridConfig.type === 'none' || mapWidth === 0 || mapHeight === 0) {
      return;
    }

    gfx.alpha = gridConfig.opacity;
    const color = 0xffffff;
    const lineWidth = 1;
    const cell = gridConfig.cellSize;

    if (gridConfig.type === 'square') {
      drawSquareGrid(gfx, mapWidth, mapHeight, cell, color, lineWidth);
    } else if (gridConfig.type === 'hex') {
      drawHexGrid(gfx, mapWidth, mapHeight, cell, color, lineWidth);
    }

    return () => {
      // Cleanup on unmount only
    };
  }, [worldContainer, gridConfig.type, gridConfig.cellSize, gridConfig.opacity, mapWidth, mapHeight]);

  // Full cleanup on unmount
  useEffect(() => {
    return () => {
      if (gfxRef.current) {
        gfxRef.current.destroy();
        gfxRef.current = null;
      }
    };
  }, []);
}

// ── Square grid ──

function drawSquareGrid(
  gfx: Graphics,
  w: number,
  h: number,
  cell: number,
  color: number,
  lineWidth: number,
) {
  // Vertical lines
  for (let x = 0; x <= w; x += cell) {
    gfx.moveTo(x, 0).lineTo(x, h).stroke({ color, width: lineWidth });
  }
  // Horizontal lines
  for (let y = 0; y <= h; y += cell) {
    gfx.moveTo(0, y).lineTo(w, y).stroke({ color, width: lineWidth });
  }
}

// ── Hex grid (flat-top) ──

function drawHexGrid(
  gfx: Graphics,
  w: number,
  h: number,
  cell: number,
  color: number,
  lineWidth: number,
) {
  // cell = distance from center to vertex (circumradius)
  const r = cell;
  // Flat-top hex dimensions
  const hexW = r * 2;             // full width of one hex
  const hexH = r * Math.sqrt(3);  // full height of one hex
  const colStep = hexW * 0.75;    // horizontal distance between hex centers
  const rowStep = hexH;           // vertical distance between hex centers

  const cols = Math.ceil(w / colStep) + 1;
  const rows = Math.ceil(h / rowStep) + 2;

  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const cx = col * colStep;
      const cy = row * rowStep + (col % 2 === 1 ? hexH / 2 : 0);

      drawHex(gfx, cx, cy, r, color, lineWidth);
    }
  }
}

function drawHex(
  gfx: Graphics,
  cx: number,
  cy: number,
  r: number,
  color: number,
  lineWidth: number,
) {
  // 6 vertices of flat-top hex
  const points: [number, number][] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    points.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)]);
  }

  const [first, ...rest] = points;
  gfx.moveTo(first[0], first[1]);
  for (const [px, py] of rest) {
    gfx.lineTo(px, py);
  }
  gfx.lineTo(first[0], first[1]);
  gfx.stroke({ color, width: lineWidth });
}
