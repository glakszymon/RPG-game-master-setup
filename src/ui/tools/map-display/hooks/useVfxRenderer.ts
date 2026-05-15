import { useEffect, useRef, useCallback, useLayoutEffect } from 'react';
import type { MapTool, VfxInstance, VfxPreset } from '../types';
import type { CanvasRendererHandle, RenderContext } from './useCanvasRenderer';
import { screenToWorld } from './useCanvasRenderer';

// ── Presets & colors ──

export const VFX_PRESETS: { id: VfxPreset; label: string; icon: string }[] = [
  { id: 'fire', label: 'Fire', icon: '🔥' },
  { id: 'explosion', label: 'Explosion', icon: '💥' },
  { id: 'smoke', label: 'Smoke', icon: '💨' },
  { id: 'lightning', label: 'Lightning', icon: '⚡' },
  { id: 'glow', label: 'Glow', icon: '✨' },
  { id: 'fog', label: 'Fog', icon: '🌫️' },
  { id: 'ice', label: 'Ice', icon: '❄️' },
];

const PRESET_COLORS: Record<VfxPreset, string[]> = {
  fire: ['#ff4500', '#ff6600', '#ffaa00', '#ffcc33'],
  explosion: ['#ff2200', '#ff6600', '#ffcc00', '#ffffff'],
  smoke: ['#555555', '#777777', '#999999', '#bbbbbb'],
  lightning: ['#4488ff', '#66aaff', '#aaddff', '#ffffff'],
  glow: ['#C9B06B', '#ffe066', '#fff5cc', '#ffffff'],
  fog: ['#8899aa', '#aabbcc', '#ccddee', '#ddeeff'],
  ice: ['#44aaff', '#88ccff', '#aaeeff', '#ddf4ff'],
};

// ── Particle system ──

interface Particle {
  alive: boolean;
  x: number; y: number;
  vx: number; vy: number;
  alpha: number;
  scale: number;
  life: number;
  maxLife: number;
  color: string;
  originX: number;
  originY: number;
  preset: VfxPreset;
  size: number;
}

const MAX_PARTICLES = 512;

function createParticle(): Particle {
  return {
    alive: false, x: 0, y: 0, vx: 0, vy: 0,
    alpha: 0, scale: 1, life: 0, maxLife: 1,
    color: '#fff', originX: 0, originY: 0,
    preset: 'fire', size: 60,
  };
}

function resetParticle(p: Particle, inst: VfxInstance): void {
  const spread = inst.size / 2;
  p.alive = true;
  p.originX = inst.x;
  p.originY = inst.y;
  p.x = inst.x + (Math.random() - 0.5) * spread;
  p.y = inst.y + (Math.random() - 0.5) * spread;
  p.alpha = 0.8;
  p.scale = 1;
  p.life = 0;
  p.preset = inst.preset;
  p.size = inst.size;

  const colors = PRESET_COLORS[inst.preset];
  p.color = colors[Math.floor(Math.random() * colors.length)];

  switch (inst.preset) {
    case 'fire':
      p.vx = (Math.random() - 0.5) * 20;
      p.vy = -(20 + Math.random() * 30);
      p.maxLife = 0.5 + Math.random() * 0.8;
      p.scale = 0.8 + Math.random() * 0.6;
      break;
    case 'explosion': {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.maxLife = 0.3 + Math.random() * 0.5;
      p.scale = 1 + Math.random();
      break;
    }
    case 'smoke':
      p.vx = (Math.random() - 0.5) * 10;
      p.vy = -(5 + Math.random() * 15);
      p.maxLife = 1 + Math.random() * 2;
      p.scale = 1 + Math.random() * 0.5;
      break;
    case 'lightning':
      p.vx = (Math.random() - 0.5) * 60;
      p.vy = (Math.random() - 0.5) * 60;
      p.maxLife = 0.1 + Math.random() * 0.3;
      p.scale = 0.5 + Math.random() * 1.5;
      break;
    case 'glow':
      p.vx = (Math.random() - 0.5) * 8;
      p.vy = -(3 + Math.random() * 8);
      p.maxLife = 1 + Math.random() * 1.5;
      p.scale = 0.6 + Math.random() * 0.4;
      break;
    case 'fog':
      p.vx = (Math.random() - 0.5) * 6;
      p.vy = (Math.random() - 0.5) * 4;
      p.maxLife = 2 + Math.random() * 3;
      p.scale = 1.5 + Math.random();
      break;
    case 'ice':
      p.vx = (Math.random() - 0.5) * 15;
      p.vy = (Math.random() - 0.5) * 15;
      p.maxLife = 0.8 + Math.random() * 1.2;
      p.scale = 0.5 + Math.random() * 0.5;
      break;
  }
}

// ── Pre-blurred sprites for smoke/fog ──
const blurredSpriteCache = new Map<string, OffscreenCanvas>();

function getBlurredSprite(color: string, radius: number): OffscreenCanvas {
  const key = `${color}-${radius}`;
  let cached = blurredSpriteCache.get(key);
  if (cached) return cached;

  const size = (radius + 8) * 2;
  const oc = new OffscreenCanvas(size, size);
  const octx = oc.getContext('2d')!;
  octx.filter = 'blur(3px)';
  octx.fillStyle = color;
  octx.beginPath();
  octx.arc(size / 2, size / 2, radius, 0, Math.PI * 2);
  octx.fill();

  blurredSpriteCache.set(key, oc);
  return oc;
}

// ── Hook ──

export interface VfxRendererActions {
  clearAllVfx: () => void;
  /** Draw & update VFX particles (called from render loop in world-space) */
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

  // Object pool
  const poolRef = useRef<Particle[]>(Array.from({ length: MAX_PARTICLES }, createParticle));
  // Map instanceId → particle indices
  const instanceParticlesRef = useRef<Map<string, number[]>>(new Map());
  const lastTimeRef = useRef(0);
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const acquire = (): number => {
    const pool = poolRef.current;
    for (let i = 0; i < pool.length; i++) {
      if (!pool[i].alive) return i;
    }
    return -1; // pool exhausted
  };

  // ── Sync particles with instances ──
  useEffect(() => {
    const pool = poolRef.current;
    const ipMap = instanceParticlesRef.current;
    const currentIds = new Set(vfxInstances.map((v) => v.id));

    // Remove old
    for (const [id, indices] of ipMap) {
      if (!currentIds.has(id)) {
        for (const idx of indices) pool[idx].alive = false;
        ipMap.delete(id);
      }
    }

    // Add new
    for (const inst of vfxInstances) {
      if (ipMap.has(inst.id)) continue;
      const count = inst.preset === 'explosion' ? 20 : 12;
      const indices: number[] = [];
      for (let i = 0; i < count; i++) {
        const idx = acquire();
        if (idx === -1) break;
        resetParticle(pool[idx], inst);
        // Stagger initial age
        pool[idx].life = Math.random() * pool[idx].maxLife;
        indices.push(idx);
      }
      ipMap.set(inst.id, indices);

      // One-shot timer
      if (inst.mode === 'one-shot') {
        const dur = (inst.duration || 2) * 1000;
        const timer = setTimeout(() => {
          onVfxChangeRef.current(instancesRef.current.filter((v) => v.id !== inst.id));
          timersRef.current.delete(inst.id);
        }, dur);
        timersRef.current.set(inst.id, timer);
      }
    }

    // Set animating flag
    renderer.setAnimating(vfxInstances.length > 0);
    renderer.markDirty();
  }, [vfxInstances, renderer]);

  // Cleanup timers
  useEffect(() => {
    return () => {
      for (const t of timersRef.current.values()) clearTimeout(t);
    };
  }, []);

  // ── Click-to-place handler ──
  useEffect(() => {
    const canvas = renderer.canvasRef.current;
    if (!canvas || activeTool !== 'vfx') return;

    const onClick = (e: PointerEvent) => {
      if (e.button !== 0) return;
      const rect = canvas.getBoundingClientRect();
      const [wx, wy] = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, renderer.viewportRef.current);

      const inst: VfxInstance = {
        id: `vfx-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        preset: selectedPreset,
        x: wx,
        y: wy,
        size: vfxSize,
        mode: vfxMode,
        duration: vfxDuration,
      };
      onVfxChangeRef.current([...instancesRef.current, inst]);
    };

    canvas.addEventListener('pointerdown', onClick);
    canvas.style.cursor = 'crosshair';
    return () => {
      canvas.removeEventListener('pointerdown', onClick);
      canvas.style.cursor = '';
    };
  }, [activeTool, selectedPreset, vfxSize, vfxMode, vfxDuration, renderer]);

  // ── Draw & update ──
  const drawVfx = useCallback((rc: RenderContext, time: number) => {
    const pool = poolRef.current;
    const ipMap = instanceParticlesRef.current;
    if (ipMap.size === 0) return;

    const dt = lastTimeRef.current === 0 ? 0.016 : Math.min((time - lastTimeRef.current) / 1000, 0.05);
    lastTimeRef.current = time;

    const { ctx } = rc;
    const usesBlur = new Set<VfxPreset>(['smoke', 'fog']);

    // Update & draw all alive particles
    for (const [instId, indices] of ipMap) {
      // Find the instance to get origin for respawn
      const inst = instancesRef.current.find((v) => v.id === instId);

      for (const idx of indices) {
        const p = pool[idx];
        if (!p.alive) continue;

        // Update
        p.life += dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.alpha = Math.max(0, 0.8 * (1 - p.life / p.maxLife));
        const currentScale = p.scale * (1 + p.life * 0.3);

        // Respawn if dead
        if (p.life >= p.maxLife && inst) {
          resetParticle(p, inst);
        }

        // Draw
        if (p.alpha <= 0) continue;
        ctx.globalAlpha = p.alpha;

        const r = (3 + Math.random() * 0) * currentScale; // base radius ~3-7, scaled

        if (usesBlur.has(p.preset)) {
          const sprite = getBlurredSprite(p.color, Math.round(r));
          const s = sprite.width;
          ctx.drawImage(sprite, p.x - s / 2, p.y - s / 2, s, s);
        } else {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Restore global alpha
    ctx.globalAlpha = 1;
  }, []);

  const clearAllVfx = useCallback(() => {
    onVfxChangeRef.current([]);
  }, []);

  return { clearAllVfx, drawVfx };
}
