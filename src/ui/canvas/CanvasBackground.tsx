/*
 * CanvasBackground — configurable canvas background.
 *
 * Three modes: solid dark, dot grid, line grid.
 * Rendered as CSS background patterns that scale with the canvas transform.
 */

import styles from './CanvasBackground.module.css';
import type { BackgroundType } from './types';

interface CanvasBackgroundProps {
  type: BackgroundType;
}

function CanvasBackground({ type }: CanvasBackgroundProps) {
  const className = [
    styles.background,
    type === 'dot-grid' ? styles.dotGrid : '',
    type === 'line-grid' ? styles.lineGrid : '',
  ]
    .filter(Boolean)
    .join(' ');

  return <div className={className} />;
}

export { CanvasBackground };
