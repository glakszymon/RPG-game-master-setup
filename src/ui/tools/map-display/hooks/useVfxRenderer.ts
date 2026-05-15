import { useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import type { MapTool, VfxInstance, VfxPreset } from '../types';
import type { CanvasRendererHandle, RenderContext } from './useCanvasRenderer';
import { screenToWorld } from './useCanvasRenderer';
import {
  SPRITE_SHEET_MANIFEST,
  generatePlaceholderSpriteSheet,
  MAX_VFX_INSTANCES,
} from '../vfx/spriteSheetManifest';
import type { SpriteSheetMeta } from '../vfx/spriteSheetManifest';

// ── Presets & labels ──

export const VFX_PRESETS: { id: VfxPreset; label: string; icon: string }[] = [
  { id: 'fire', label: 'Fire', icon: '🔥' },
  { id: 'explosion', label: 'Explosion', icon: '💥' },
  { id: 'smoke', label: 'Smoke', icon: '💨' },
  { id: 'lightning', label: 'Lightning', icon: '⚡' },
  { id: 'glow', label: 'Glow', icon: '✨' },
  { id: 'fog', label: 'Fog', icon: '🌫️' },
  { id: 'ice', label: 'Ice', icon: '❄️' },
];

// ── Fallback colors (used when sprite sheet not loaded) ──

const PRESET_COLORS: Record<VfxPreset, string> = {
  fire: '#ff4500',
  explosion: '#ff6600',
  smoke: '#888888',
  lightning: '#66aaff',
  glow: '#ffe066',
  fog: '#aabbcc',
  ice: '#88ccff',
};

// ── Sprite sheet image cache ──

const spriteSheetImages = new Map<VfxPreset, HTMLCanvasElement | HTMLImageElement>();

/** Eagerly generate all placeholder sprite sheets */
function ensureSpriteSheets(): void {
  const presets = Object.keys(SPRITE_SHEET_MANIFEST) as VfxPreset[];
  for (const preset of presets) {
    if (!spriteSheetImages.has(preset)) {
      const meta = SPRITE_SHEET_MANIFEST[preset];
      if (meta.placeholder) {
        spriteSheetImages.set(preset, generatePlaceholderSpriteSheet(preset));
      }
      // When real assets are added:
      // import fireSheet from '../vfx/assets/fire.png';
      // const img = new Image(); img.src = fireSheet;
      // img.onload = () => spriteSheetImages.set('fire', img);
    }
  }
}

// ── Hook ──

export interface VfxRendererActions {
  clearAllVfx: () => void;
  /** Draw sprite-sheet VFX (called from render loop in world-space) */
  drawVfx: (rc: RenderContext, time: number) => void;
}

export function useVfxRenderer(
  renderer: CanvasRendererHandle,
  vfxInstances: VfxInstance[],
  activeTool: MapTool,
  selectedPreset: VfxPreset,
  vfxSize: number,
  vfxMode: 'one-shot' | 'persistent',
  vfxDuration: number,
  onVfxChange: (instances: VfxInstance[]) => void,
): VfxRendererActions {
  const instancesRef = useRef(vfxInstances);
  useLayoutEffect(() => { instancesRef.current = vfxInstances; });
  const onVfxChangeRef = useRef(onVfxChange);
  useLayoutEffect(() => { onVfxChangeRef.current = onVfxChange; });

  // Ensure sprite sheets are generated on mount
  useEffect(() => {
    ensureSpriteSheets();
  }, []);

  // ── Sync animating flag ──
  useEffect(() => {
    renderer.setAnimating(vfxInstances.length > 0);
    renderer.markDirty();
  }, [vfxInstances, renderer]);

  // ── Click-to-place handler ──
  useEffect(() => {
    const canvas = renderer.canvasRef.current;
    if (!canvas || activeTool !== 'vfx') return;

    const onClick = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const rect = canvas.getBoundingClientRect();
      const [wx, wy] = screenToWorld(
        e.clientX - rect.left,
        e.clientY - rect.top,
        renderer.viewportRef.current,
      );

      const current = instancesRef.current;

      // Enforce instance cap
      let base = current;
      if (base.length >= MAX_VFX_INSTANCES) {
        // Remove oldest one-shot, or reject if all persistent
        const oldestOneShotIdx = base.findIndex((v) => v.mode === 'one-shot');
        if (oldestOneShotIdx >= 0) {
          base = [...base.slice(0, oldestOneShotIdx), ...base.slice(oldestOneShotIdx + 1)];
        } else {
          // All persistent, at cap — do nothing
          return;
        }
      }

      const inst: VfxInstance = {
        id: `vfx-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        preset: selectedPreset,
        x: wx,
        y: wy,
        size: vfxSize,
        mode: vfxMode,
        duration: vfxDuration,
        startTime: performance.now(),
      };
      onVfxChangeRef.current([...base, inst]);
    };

    canvas.addEventListener('pointerdown', onClick);
    canvas.style.cursor = 'crosshair';
    return () => {
      canvas.removeEventListener('pointerdown', onClick);
      canvas.style.cursor = '';
    };
  }, [activeTool, selectedPreset, vfxSize, vfxMode, vfxDuration, renderer]);

  // ── Draw sprite-sheet VFX ──
  const drawVfx = useCallback((rc: RenderContext, time: number) => {
    const instances = instancesRef.current;
    if (instances.length === 0) return;

    const { ctx } = rc;
    const toRemove: string[] = [];

    for (const inst of instances) {
      const meta: SpriteSheetMeta = SPRITE_SHEET_MANIFEST[inst.preset];
      const sheet = spriteSheetImages.get(inst.preset);

      const elapsed = (time - (inst.startTime || time)) / 1000;
      const frameDuration = 1 / meta.fps;
      const totalFrames = meta.frameCount;

      let frameIndex: number;
      if (inst.mode === 'persistent') {
        // Loop animation
        frameIndex = Math.floor(elapsed / frameDuration) % totalFrames;
      } else {
        // Play once
        frameIndex = Math.floor(elapsed / frameDuration);
        if (frameIndex >= totalFrames) {
          toRemove.push(inst.id);
          continue;
        }
      }

      const halfSize = inst.size / 2;

      if (sheet) {
        // Draw from sprite sheet
        const sx = (frameIndex % meta.cols) * meta.frameWidth;
        const sy = Math.floor(frameIndex / meta.cols) * meta.frameHeight;

        ctx.drawImage(
          sheet,
          sx, sy, meta.frameWidth, meta.frameHeight,
          inst.x - halfSize, inst.y - halfSize, inst.size, inst.size,
        );
      } else {
        // Fallback: colored circle
        ctx.fillStyle = PRESET_COLORS[inst.preset];
        ctx.globalAlpha = 0.6;
        ctx.beginPath();
        ctx.arc(inst.x, inst.y, halfSize, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalAlpha = 1;
      }
    }

    // Remove completed one-shot instances
    if (toRemove.length > 0) {
      const remaining = instancesRef.current.filter((v) => !toRemove.includes(v.id));
      onVfxChangeRef.current(remaining);
    }
  }, []);

  const clearAllVfx = useCallback(() => {
    onVfxChangeRef.current([]);
  }, []);

  return { clearAllVfx, drawVfx };
}
