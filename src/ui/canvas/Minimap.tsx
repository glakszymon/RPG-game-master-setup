/*
 * Minimap — schematic overview of all windows on the canvas.
 *
 * Shows colored rectangles for each window and a viewport indicator.
 * View-only — no click interaction.
 */

import { useMemo } from 'react';
import type { WindowState, ViewportTransform } from './types';
import styles from './Minimap.module.css';

interface MinimapProps {
  windows: WindowState[];
  viewport: ViewportTransform;
  viewportWidth: number;
  viewportHeight: number;
  visible: boolean;
}

/** Map tool types to minimap colors */
const TOOL_COLORS: Record<string, string> = {
  'combat-tracker': '#f87171',
  'party-tracker': '#60a5fa',
  'bestiary': '#c084fc',
  'notepad': '#fbbf24',
  'map-display': '#4ade80',
  'soundboard': '#f472b6',
  'weather-generator': '#67e8f9',
  'time-tracker': '#a78bfa',
  'shop-generator': '#fb923c',
  'dice-roller': '#e879f9',
};

const MINIMAP_WIDTH = 180;
const MINIMAP_HEIGHT = 120;

function Minimap({ windows, viewport, viewportWidth, viewportHeight, visible }: MinimapProps) {
  if (!visible) return null;

  const visibleWindows = windows.filter((w) => !w.minimized);

  const { scale: mapScale, offsetX, offsetY } = useMemo(() => {
    if (visibleWindows.length === 0) {
      return { scale: 1, offsetX: 0, offsetY: 0 };
    }

    // Find bounding box of all windows + viewport area
    const vpLeft = -viewport.x / viewport.scale;
    const vpTop = -viewport.y / viewport.scale;
    const vpRight = vpLeft + viewportWidth / viewport.scale;
    const vpBottom = vpTop + viewportHeight / viewport.scale;

    let minX = vpLeft;
    let minY = vpTop;
    let maxX = vpRight;
    let maxY = vpBottom;

    for (const w of visibleWindows) {
      minX = Math.min(minX, w.x);
      minY = Math.min(minY, w.y);
      maxX = Math.max(maxX, w.x + w.width);
      maxY = Math.max(maxY, w.y + w.height);
    }

    // Add padding
    const pad = 100;
    minX -= pad;
    minY -= pad;
    maxX += pad;
    maxY += pad;

    const rangeX = maxX - minX;
    const rangeY = maxY - minY;
    const s = Math.min(MINIMAP_WIDTH / rangeX, MINIMAP_HEIGHT / rangeY);

    return { scale: s, offsetX: -minX, offsetY: -minY };
  }, [visibleWindows, viewport, viewportWidth, viewportHeight]);

  // Viewport indicator in canvas space
  const vpLeft = -viewport.x / viewport.scale;
  const vpTop = -viewport.y / viewport.scale;
  const vpW = viewportWidth / viewport.scale;
  const vpH = viewportHeight / viewport.scale;

  return (
    <div className={styles.minimap}>
      <svg width={MINIMAP_WIDTH} height={MINIMAP_HEIGHT} className={styles.svg}>
        {/* Window rectangles */}
        {visibleWindows.map((w) => (
          <rect
            key={w.id}
            x={(w.x + offsetX) * mapScale}
            y={(w.y + offsetY) * mapScale}
            width={w.width * mapScale}
            height={w.height * mapScale}
            fill={TOOL_COLORS[w.toolType] ?? '#888'}
            opacity={0.6}
            rx={1}
          />
        ))}

        {/* Viewport indicator */}
        <rect
          x={(vpLeft + offsetX) * mapScale}
          y={(vpTop + offsetY) * mapScale}
          width={vpW * mapScale}
          height={vpH * mapScale}
          fill="none"
          stroke="rgba(255, 255, 255, 0.5)"
          strokeWidth={1}
          rx={1}
        />
      </svg>
    </div>
  );
}

export { Minimap };
