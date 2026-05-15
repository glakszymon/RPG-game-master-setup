/**
 * Sprite sheet manifest for VFX presets.
 *
 * Each preset defines the metadata needed to slice a sprite sheet into frames.
 * When real sprite sheet PNGs are placed in ./assets/, update the imports and
 * set `placeholder: false`.
 *
 * Until real assets are provided, the system generates procedural placeholder
 * sprite sheets at runtime (colored animated circles with glow).
 */

import type { VfxPreset } from '../types';

export interface SpriteSheetMeta {
  /** Number of columns in the sprite sheet grid */
  cols: number;
  /** Number of rows in the sprite sheet grid */
  rows: number;
  /** Total number of animation frames */
  frameCount: number;
  /** Playback speed in frames per second */
  fps: number;
  /** Width of a single frame in pixels */
  frameWidth: number;
  /** Height of a single frame in pixels */
  frameHeight: number;
  /** Whether this uses a placeholder (generated at runtime) */
  placeholder: boolean;
  /** Fallback colors for placeholder generation */
  colors: string[];
}

export const SPRITE_SHEET_MANIFEST: Record<VfxPreset, SpriteSheetMeta> = {
  fire: {
    cols: 8, rows: 4, frameCount: 32, fps: 20,
    frameWidth: 128, frameHeight: 128, placeholder: true,
    colors: ['#ff4500', '#ff6600', '#ffaa00', '#ffcc33'],
  },
  explosion: {
    cols: 8, rows: 4, frameCount: 32, fps: 30,
    frameWidth: 128, frameHeight: 128, placeholder: true,
    colors: ['#ff2200', '#ff6600', '#ffcc00', '#ffffff'],
  },
  smoke: {
    cols: 8, rows: 4, frameCount: 32, fps: 16,
    frameWidth: 128, frameHeight: 128, placeholder: true,
    colors: ['#555555', '#777777', '#999999', '#bbbbbb'],
  },
  lightning: {
    cols: 8, rows: 2, frameCount: 16, fps: 24,
    frameWidth: 128, frameHeight: 128, placeholder: true,
    colors: ['#4488ff', '#66aaff', '#aaddff', '#ffffff'],
  },
  glow: {
    cols: 8, rows: 4, frameCount: 32, fps: 12,
    frameWidth: 128, frameHeight: 128, placeholder: true,
    colors: ['#C9B06B', '#ffe066', '#fff5cc', '#ffffff'],
  },
  fog: {
    cols: 8, rows: 4, frameCount: 32, fps: 10,
    frameWidth: 128, frameHeight: 128, placeholder: true,
    colors: ['#8899aa', '#aabbcc', '#ccddee', '#ddeeff'],
  },
  ice: {
    cols: 8, rows: 2, frameCount: 16, fps: 18,
    frameWidth: 128, frameHeight: 128, placeholder: true,
    colors: ['#44aaff', '#88ccff', '#aaeeff', '#ddf4ff'],
  },
};

/** Cache for generated placeholder sprite sheets */
const placeholderCache = new Map<VfxPreset, HTMLCanvasElement>();

/**
 * Generate a placeholder sprite sheet for a given preset.
 * Creates animated frames procedurally — each frame has a slightly different
 * pattern so animation is visible even without real assets.
 */
export function generatePlaceholderSpriteSheet(preset: VfxPreset): HTMLCanvasElement {
  const cached = placeholderCache.get(preset);
  if (cached) return cached;

  const meta = SPRITE_SHEET_MANIFEST[preset];
  const { cols, rows, frameCount, frameWidth, frameHeight, colors } = meta;

  const canvas = document.createElement('canvas');
  canvas.width = cols * frameWidth;
  canvas.height = rows * frameHeight;
  const ctx = canvas.getContext('2d')!;

  for (let i = 0; i < frameCount; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const cx = col * frameWidth + frameWidth / 2;
    const cy = row * frameHeight + frameHeight / 2;
    const t = i / frameCount; // 0..1 progress through animation

    // Draw a glowing effect that changes per frame
    const baseRadius = frameWidth * 0.35;

    switch (preset) {
      case 'fire': {
        // Flickering flame shape
        for (let j = colors.length - 1; j >= 0; j--) {
          const r = baseRadius * (1 - j * 0.2) * (0.8 + 0.4 * Math.sin(t * Math.PI * 4 + j));
          const yOff = -frameHeight * 0.1 * Math.sin(t * Math.PI * 2);
          ctx.fillStyle = colors[j];
          ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * Math.PI * 2 + j);
          ctx.beginPath();
          ctx.ellipse(cx, cy + yOff, r * 0.8, r * 1.2, 0, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'explosion': {
        // Expanding ring
        const expandT = t;
        for (let j = 0; j < colors.length; j++) {
          const r = baseRadius * expandT * (1 + j * 0.15);
          ctx.strokeStyle = colors[j];
          ctx.lineWidth = 6 - j * 1.2;
          ctx.globalAlpha = Math.max(0, 1 - expandT * 1.2 + j * 0.1);
          ctx.beginPath();
          ctx.arc(cx, cy, Math.max(1, r), 0, Math.PI * 2);
          ctx.stroke();
        }
        break;
      }
      case 'smoke': {
        // Soft expanding blobs
        for (let j = 0; j < colors.length; j++) {
          const r = baseRadius * (0.5 + t * 0.5) * (1 + j * 0.15);
          const yOff = -frameHeight * 0.15 * t;
          ctx.fillStyle = colors[j];
          ctx.globalAlpha = (0.4 - t * 0.3) * (1 - j * 0.15);
          ctx.beginPath();
          ctx.arc(cx + Math.sin(t * Math.PI * 3 + j) * 8, cy + yOff, r, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'lightning': {
        // Bright flash with random-ish lines
        ctx.globalAlpha = 0.3 + 0.7 * Math.abs(Math.sin(t * Math.PI * 6));
        ctx.strokeStyle = colors[3]; // white
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(cx, cy - baseRadius);
        const segments = 5;
        for (let s = 1; s <= segments; s++) {
          const sy2 = cy - baseRadius + (baseRadius * 2 * s) / segments;
          const sx2 = cx + Math.sin(t * Math.PI * 8 + s * 1.7) * baseRadius * 0.4;
          ctx.lineTo(sx2, sy2);
        }
        ctx.stroke();
        // Glow behind
        ctx.fillStyle = colors[0];
        ctx.globalAlpha = 0.2;
        ctx.beginPath();
        ctx.arc(cx, cy, baseRadius * 0.6, 0, Math.PI * 2);
        ctx.fill();
        break;
      }
      case 'glow': {
        // Pulsing radial glow
        for (let j = colors.length - 1; j >= 0; j--) {
          const pulse = 0.7 + 0.3 * Math.sin(t * Math.PI * 2);
          const r = baseRadius * pulse * (1 - j * 0.15);
          ctx.fillStyle = colors[j];
          ctx.globalAlpha = (0.3 + 0.2 * Math.sin(t * Math.PI * 2)) * (1 - j * 0.2);
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'fog': {
        // Drifting translucent blobs
        for (let j = 0; j < 3; j++) {
          const xOff = Math.sin(t * Math.PI * 2 + j * 2.1) * frameWidth * 0.15;
          const yOff = Math.cos(t * Math.PI * 1.5 + j * 1.3) * frameHeight * 0.08;
          ctx.fillStyle = colors[j];
          ctx.globalAlpha = 0.15 + 0.1 * Math.sin(t * Math.PI + j);
          ctx.beginPath();
          ctx.ellipse(cx + xOff, cy + yOff, baseRadius * 1.2, baseRadius * 0.7, t * 0.5, 0, Math.PI * 2);
          ctx.fill();
        }
        break;
      }
      case 'ice': {
        // Crystalline star pattern
        const spikes = 6;
        ctx.fillStyle = colors[0];
        ctx.globalAlpha = 0.3;
        ctx.beginPath();
        ctx.arc(cx, cy, baseRadius * 0.8, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = colors[2];
        ctx.lineWidth = 2;
        ctx.globalAlpha = 0.5 + 0.5 * Math.sin(t * Math.PI * 2);
        for (let s = 0; s < spikes; s++) {
          const angle = (s / spikes) * Math.PI * 2 + t * Math.PI * 0.5;
          const r = baseRadius * (0.6 + 0.4 * Math.sin(t * Math.PI * 3 + s));
          ctx.beginPath();
          ctx.moveTo(cx, cy);
          ctx.lineTo(cx + Math.cos(angle) * r, cy + Math.sin(angle) * r);
          ctx.stroke();
        }
        break;
      }
    }
    ctx.globalAlpha = 1;
  }

  placeholderCache.set(preset, canvas);
  return canvas;
}

/** Maximum concurrent VFX instances */
export const MAX_VFX_INSTANCES = 50;
