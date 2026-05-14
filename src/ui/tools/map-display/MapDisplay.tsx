import { useRef, useCallback, useEffect } from 'react';
import { Sprite, Assets, Container } from 'pixi.js';
import { usePixiApp } from './hooks/usePixiApp';
import { DEFAULT_MAP_STATE } from './types';
import type { MapDisplayState } from './types';
import styles from './MapDisplay.module.css';

interface MapDisplayProps {
  toolState: MapDisplayState | undefined;
  onToolStateChange: (state: MapDisplayState) => void;
  campaignId: string;
}

export function MapDisplay({ toolState, onToolStateChange, campaignId }: MapDisplayProps) {
  const state = toolState ?? DEFAULT_MAP_STATE;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const appRef = usePixiApp(containerRef);

  // Main scene container — holds all map layers, gets zoom/pan applied to it
  const worldRef = useRef<Container | null>(null);
  const mapSpriteRef = useRef<Sprite | null>(null);

  // Track state ref for event handlers (avoids stale closures)
  const stateRef = useRef(state);
  stateRef.current = state;

  // Initialize world container once app is ready
  useEffect(() => {
    const app = appRef.current;
    if (!app || worldRef.current) return;

    const world = new Container();
    app.stage.addChild(world);
    worldRef.current = world;

    // Restore saved viewport
    world.x = state.viewport.x;
    world.y = state.viewport.y;
    world.scale.set(state.viewport.zoom);
  }, [appRef.current]);

  // Load map image (on first open with saved path, or after picking new file)
  const loadImage = useCallback(async (filePath: string) => {
    const app = appRef.current;
    const world = worldRef.current;
    if (!app || !world) return;

    // Read file through main process (bypasses Chromium file:// security)
    const dataUrl = await window.electronAPI?.dialog.readImage(filePath);
    if (!dataUrl) return;

    const texture = await Assets.load(dataUrl);

    if (mapSpriteRef.current) {
      mapSpriteRef.current.destroy();
    }

    const sprite = new Sprite(texture);
    // Insert at bottom of world (index 0) so grid/tokens/fow render on top
    world.addChildAt(sprite, 0);
    mapSpriteRef.current = sprite;
  }, [appRef]);

  // Restore saved map on mount
  useEffect(() => {
    if (state.imagePath && appRef.current && worldRef.current && !mapSpriteRef.current) {
      loadImage(state.imagePath);
    }
  }, [state.imagePath, appRef.current, worldRef.current]);

  // File picker handler
  const handleLoadMap = useCallback(async () => {
    const filePath = await window.electronAPI?.dialog.openImageFile();
    if (!filePath) return;

    await loadImage(filePath);
    onToolStateChange({ ...stateRef.current, imagePath: filePath });
  }, [loadImage, onToolStateChange]);

  // ── Zoom & Pan ──
  useEffect(() => {
    const canvas = appRef.current?.canvas;
    if (!canvas) return;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const world = worldRef.current;
      if (!world) return;

      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const oldScale = world.scale.x;
      const newScale = Math.min(Math.max(oldScale * zoomFactor, 0.1), 10);

      // Zoom toward mouse position
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      world.x = mouseX - (mouseX - world.x) * (newScale / oldScale);
      world.y = mouseY - (mouseY - world.y) * (newScale / oldScale);
      world.scale.set(newScale);

      onToolStateChange({
        ...stateRef.current,
        viewport: { x: world.x, y: world.y, zoom: newScale },
      });
    };

    let isPanning = false;
    let lastX = 0;
    let lastY = 0;

    const onPointerDown = (e: PointerEvent) => {
      // Middle mouse button (wheel click) or left + space for panning
      if (e.button === 1) {
        isPanning = true;
        lastX = e.clientX;
        lastY = e.clientY;
        canvas.setPointerCapture(e.pointerId);
        e.preventDefault();
      }
    };

    const onPointerMove = (e: PointerEvent) => {
      if (!isPanning) return;
      const world = worldRef.current;
      if (!world) return;

      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      world.x += dx;
      world.y += dy;
      lastX = e.clientX;
      lastY = e.clientY;
    };

    const onPointerUp = (e: PointerEvent) => {
      if (!isPanning) return;
      isPanning = false;
      canvas.releasePointerCapture(e.pointerId);

      const world = worldRef.current;
      if (world) {
        onToolStateChange({
          ...stateRef.current,
          viewport: { x: world.x, y: world.y, zoom: world.scale.x },
        });
      }
    };

    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('pointerdown', onPointerDown);
    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerup', onPointerUp);

    return () => {
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
    };
  }, [appRef.current, onToolStateChange]);

  return (
    <div className={styles.container} ref={containerRef}>
      {!state.imagePath && (
        <button className={styles.loadButton} onClick={handleLoadMap}>
          Load Map
        </button>
      )}
    </div>
  );
}
