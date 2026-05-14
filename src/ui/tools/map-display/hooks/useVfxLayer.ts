import { useEffect, useRef, useCallback } from 'react';
import { Graphics, Container, Application, BlurFilter } from 'pixi.js';
import type { MapTool } from '../types';

/** Helper to set cursor without ESLint tracing back to ref params */
function setCursor(el: HTMLElement, cursor: string) {
  el.style.cursor = cursor;
}

/**
 * useVfxLayer — Simple VFX effects placed on the map.
 *
 * Each effect is a lightweight particle/animation system using
 * Pixi Graphics primitives (no external sprite sheets needed).
 *
 * Presets: fire, explosion, smoke, lightning, glow, fog, ice
 */

export interface VfxInstance {
  id: string;
  preset: VfxPreset;
  x: number;
  y: number;
  size: number;
  mode: 'one-shot' | 'persistent';
  duration: number; // seconds, 0 = infinite for persistent
}

export type VfxPreset = 'fire' | 'explosion' | 'smoke' | 'lightning' | 'glow' | 'fog' | 'ice';

export const VFX_PRESETS: { id: VfxPreset; label: string; icon: string }[] = [
  { id: 'fire', label: 'Fire', icon: '🔥' },
  { id: 'explosion', label: 'Explosion', icon: '💥' },
  { id: 'smoke', label: 'Smoke', icon: '💨' },
  { id: 'lightning', label: 'Lightning', icon: '⚡' },
  { id: 'glow', label: 'Glow', icon: '✨' },
  { id: 'fog', label: 'Fog', icon: '🌫️' },
  { id: 'ice', label: 'Ice', icon: '❄️' },
];

interface VfxLayerActions {
  placeVfx: (preset: VfxPreset, mapX: number, mapY: number, size: number, mode: 'one-shot' | 'persistent', duration: number) => void;
  removeVfx: (id: string) => void;
  clearAllVfx: () => void;
}

// Color palettes per preset
const PRESET_COLORS: Record<VfxPreset, number[]> = {
  fire: [0xff4500, 0xff6600, 0xffaa00, 0xffcc33],
  explosion: [0xff2200, 0xff6600, 0xffcc00, 0xffffff],
  smoke: [0x555555, 0x777777, 0x999999, 0xbbbbbb],
  lightning: [0x4488ff, 0x66aaff, 0xaaddff, 0xffffff],
  glow: [0xC9B06B, 0xffe066, 0xfff5cc, 0xffffff],
  fog: [0x8899aa, 0xaabbcc, 0xccddee, 0xddeeff],
  ice: [0x44aaff, 0x88ccff, 0xaaeeff, 0xddf4ff],
};

export function useVfxLayer(
  appRef: React.RefObject<Application | null>,
  worldContainerRef: React.RefObject<Container | null>,
  vfxInstances: VfxInstance[],
  activeTool: MapTool,
  selectedPreset: VfxPreset,
  vfxSize: number,
  vfxMode: 'one-shot' | 'persistent',
  vfxDuration: number,
  onVfxChange: (instances: VfxInstance[]) => void,
): VfxLayerActions {
  const layerRef = useRef<Container | null>(null);
  const instancesRef = useRef(vfxInstances);
  useEffect(() => { instancesRef.current = vfxInstances; });
  const animFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<Map<string, Particle[]>>(new Map());
  const timersRef = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  // ── Create VFX layer ──
  useEffect(() => {
    const worldContainer = worldContainerRef.current;
    if (!worldContainer) return;
    const layer = new Container();
    layer.label = 'vfx-layer';
    worldContainer.addChild(layer);
    layerRef.current = layer;
    const particles = particlesRef.current;
    const timers = timersRef.current;

    return () => {
      layer.destroy({ children: true });
      layerRef.current = null;
      particles.clear();
      for (const t of timers.values()) clearTimeout(t);
      timers.clear();
    };
  }, [worldContainerRef]);

  // ── Spawn particles for each VFX instance ──
  useEffect(() => {
    const app = appRef.current;
    const layer = layerRef.current;
    if (!app || !layer) return;

    const existing = particlesRef.current;
    const currentIds = new Set(vfxInstances.map((v) => v.id));

    // Remove old
    for (const [id, parts] of existing) {
      if (!currentIds.has(id)) {
        for (const p of parts) p.gfx.destroy();
        existing.delete(id);
      }
    }

    // Add new
    for (const inst of vfxInstances) {
      if (!existing.has(inst.id)) {
        const parts = spawnParticles(inst, layer);
        existing.set(inst.id, parts);

        // One-shot auto-remove
        if (inst.mode === 'one-shot') {
          const dur = (inst.duration || 2) * 1000;
          const timer = setTimeout(() => {
            onVfxChange(instancesRef.current.filter((v) => v.id !== inst.id));
            timersRef.current.delete(inst.id);
          }, dur);
          timersRef.current.set(inst.id, timer);
        }
      }
    }
  }, [appRef, vfxInstances, onVfxChange]);

  // ── Animation loop ──
  useEffect(() => {
    const app = appRef.current;
    if (!app) return;

    let lastTime = performance.now();
    const animate = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      for (const [, parts] of particlesRef.current) {
        for (const p of parts) {
          p.age += dt;
          p.gfx.x += p.vx * dt;
          p.gfx.y += p.vy * dt;
          p.gfx.alpha = Math.max(0, 1 - p.age / p.life);
          p.gfx.scale.set(p.baseScale * (1 + p.age * 0.3));

          // Respawn if dead
          if (p.age >= p.life) {
            resetParticle(p);
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);
    return () => {
      if (animFrameRef.current !== null) cancelAnimationFrame(animFrameRef.current);
    };
  }, [appRef]);

  // ── Click-to-place handler ──
  useEffect(() => {
    const app = appRef.current;
    const worldContainer = worldContainerRef.current;
    const canvas = app?.renderer ? app.canvas : null;
    if (!canvas || !worldContainer || activeTool !== 'vfx') return;

    const onClick = (e: PointerEvent) => {
      if (e.button !== 0) return;
      if (worldContainer.destroyed) return;
      const rect = canvas.getBoundingClientRect();
      const mapX = (e.clientX - rect.left - worldContainer.x) / worldContainer.scale.x;
      const mapY = (e.clientY - rect.top - worldContainer.y) / worldContainer.scale.y;

      const inst: VfxInstance = {
        id: `vfx-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
        preset: selectedPreset,
        x: mapX,
        y: mapY,
        size: vfxSize,
        mode: vfxMode,
        duration: vfxDuration,
      };
      onVfxChange([...instancesRef.current, inst]);
    };

    canvas.addEventListener('pointerdown', onClick);
    setCursor(canvas, 'crosshair');
    return () => {
      canvas.removeEventListener('pointerdown', onClick);
      setCursor(canvas, '');
    };
  }, [appRef, worldContainerRef, activeTool, selectedPreset, vfxSize, vfxMode, vfxDuration, onVfxChange]);

  // ── Actions ──
  const placeVfx = useCallback((
    preset: VfxPreset, mapX: number, mapY: number,
    size: number, mode: 'one-shot' | 'persistent', duration: number,
  ) => {
    const inst: VfxInstance = {
      id: `vfx-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      preset, x: mapX, y: mapY, size, mode, duration,
    };
    onVfxChange([...instancesRef.current, inst]);
  }, [onVfxChange]);

  const removeVfx = useCallback((id: string) => {
    onVfxChange(instancesRef.current.filter((v) => v.id !== id));
  }, [onVfxChange]);

  const clearAllVfx = useCallback(() => {
    onVfxChange([]);
  }, [onVfxChange]);

  return { placeVfx, removeVfx, clearAllVfx };
}

// ── Particle system ──

interface Particle {
  gfx: Graphics;
  vx: number;
  vy: number;
  life: number;
  age: number;
  baseScale: number;
  originX: number;
  originY: number;
  preset: VfxPreset;
  size: number;
}

function spawnParticles(inst: VfxInstance, layer: Container): Particle[] {
  const count = inst.preset === 'explosion' ? 20 : 12;
  const particles: Particle[] = [];
  const colors = PRESET_COLORS[inst.preset];

  for (let i = 0; i < count; i++) {
    const color = colors[Math.floor(Math.random() * colors.length)];
    const gfx = new Graphics();
    const r = 3 + Math.random() * 4;
    gfx.circle(0, 0, r).fill({ color, alpha: 0.8 });

    if (inst.preset === 'fog' || inst.preset === 'smoke') {
      gfx.filters = [new BlurFilter({ strength: 3 })];
    }

    layer.addChild(gfx);

    const p: Particle = {
      gfx,
      vx: 0, vy: 0,
      life: 1, age: 0,
      baseScale: 1,
      originX: inst.x,
      originY: inst.y,
      preset: inst.preset,
      size: inst.size,
    };
    resetParticle(p);
    // Stagger initial age
    p.age = Math.random() * p.life;
    particles.push(p);
  }

  return particles;
}

function resetParticle(p: Particle) {
  const spread = p.size / 2;
  p.gfx.x = p.originX + (Math.random() - 0.5) * spread;
  p.gfx.y = p.originY + (Math.random() - 0.5) * spread;
  p.age = 0;
  p.gfx.alpha = 0.8;

  switch (p.preset) {
    case 'fire':
      p.vx = (Math.random() - 0.5) * 20;
      p.vy = -(20 + Math.random() * 30);
      p.life = 0.5 + Math.random() * 0.8;
      p.baseScale = 0.8 + Math.random() * 0.6;
      break;
    case 'explosion': {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 80;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 0.3 + Math.random() * 0.5;
      p.baseScale = 1 + Math.random();
      break;
    }
    case 'smoke':
      p.vx = (Math.random() - 0.5) * 10;
      p.vy = -(5 + Math.random() * 15);
      p.life = 1 + Math.random() * 2;
      p.baseScale = 1 + Math.random() * 0.5;
      break;
    case 'lightning':
      p.vx = (Math.random() - 0.5) * 60;
      p.vy = (Math.random() - 0.5) * 60;
      p.life = 0.1 + Math.random() * 0.3;
      p.baseScale = 0.5 + Math.random() * 1.5;
      break;
    case 'glow':
      p.vx = (Math.random() - 0.5) * 8;
      p.vy = -(3 + Math.random() * 8);
      p.life = 1 + Math.random() * 1.5;
      p.baseScale = 0.6 + Math.random() * 0.4;
      break;
    case 'fog':
      p.vx = (Math.random() - 0.5) * 6;
      p.vy = (Math.random() - 0.5) * 4;
      p.life = 2 + Math.random() * 3;
      p.baseScale = 1.5 + Math.random();
      break;
    case 'ice':
      p.vx = (Math.random() - 0.5) * 15;
      p.vy = (Math.random() - 0.5) * 15;
      p.life = 0.8 + Math.random() * 1.2;
      p.baseScale = 0.5 + Math.random() * 0.5;
      break;
  }
}
