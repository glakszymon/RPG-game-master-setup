/*
 * Floating utilities types — state shape for viewport-fixed utility widgets.
 */

export type FloatingUtilityType = 'sticky-note' | 'audio-recorder';

export interface FloatingWidgetState {
  id: string;
  type: FloatingUtilityType;
  x: number;
  y: number;
  minimized: boolean;
}

export const FLOATING_WIDGET_INFO: Record<FloatingUtilityType, { name: string; icon: string }> = {
  'sticky-note': { name: 'Sticky Note', icon: '📋' },
  'audio-recorder': { name: 'Audio Recorder', icon: '🎙️' },
};
