import { useRef, useCallback } from 'react';
import { Sprite, Assets } from 'pixi.js';
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
  const mapSpriteRef = useRef<Sprite | null>(null);
  const handleLoadMap = useCallback(async () => {
    const filePath = await window.electronAPI?.dialog.openImageFile();
    if (!filePath || !appRef.current) return;
    const texture = await Assets.load(filePath);
    if (mapSpriteRef.current) {
      mapSpriteRef.current.destroy();
    }
    const sprite = new Sprite(texture);
    appRef.current.stage.addChild(sprite);
    mapSpriteRef.current = sprite;
    onToolStateChange({ ...state, imagePath: filePath });
  }, [appRef, state, onToolStateChange]);
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