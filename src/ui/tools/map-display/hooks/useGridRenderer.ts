import type { GridConfig } from '../types';
import type { RenderContext } from './useCanvasRenderer';

/**
 * drawGrid — draws square or hex grid overlay on the canvas.
 * Called from the main render loop in world-space (transform already applied).
 */
export function drawGrid(rc: RenderContext, grid: GridConfig, mapWidth: number, mapHeight: number): void {
  if (grid.type === 'none' || mapWidth === 0 || mapHeight === 0) return;

  const { ctx, viewport } = rc;
  ctx.save();
  ctx.strokeStyle = `rgba(255, 255, 255, ${grid.opacity})`;
  // Constant line width regardless of zoom
  ctx.lineWidth = 1 / viewport.zoom;

  if (grid.type === 'square') {
    drawSquareGrid(ctx, mapWidth, mapHeight, grid.cellSize);
  } else if (grid.type === 'hex') {
    drawHexGrid(ctx, mapWidth, mapHeight, grid.cellSize);
  }

  ctx.restore();
}

function drawSquareGrid(ctx: CanvasRenderingContext2D, w: number, h: number, cell: number): void {
  ctx.beginPath();
  for (let x = 0; x <= w; x += cell) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
  }
  for (let y = 0; y <= h; y += cell) {
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
  }
  ctx.stroke();
}

function drawHexGrid(ctx: CanvasRenderingContext2D, w: number, h: number, cell: number): void {
  const r = cell;
  const hexH = r * Math.sqrt(3);
  const colStep = r * 1.5; // 0.75 * hexW where hexW = 2*r
  const rowStep = hexH;

  const cols = Math.ceil(w / colStep) + 1;
  const rows = Math.ceil(h / rowStep) + 2;

  for (let col = 0; col < cols; col++) {
    for (let row = 0; row < rows; row++) {
      const cx = col * colStep;
      const cy = row * rowStep + (col % 2 === 1 ? hexH / 2 : 0);
      drawHex(ctx, cx, cy, r);
    }
  }
}

function drawHex(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number): void {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const px = cx + r * Math.cos(angle);
    const py = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.stroke();
}
