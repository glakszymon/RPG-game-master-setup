import { useRef } from 'react';
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
  return (
    <div className={styles.container} ref={containerRef} />
  );
}