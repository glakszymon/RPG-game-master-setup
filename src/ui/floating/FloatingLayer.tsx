/*
 * FloatingLayer — container for all floating utility widgets.
 * Renders as a viewport-fixed sibling of the canvas overlays.
 */

import { memo, useCallback } from 'react';
import { FloatingWidget } from './FloatingWidget';
import { StickyNote } from './widgets/StickyNote';
import { AudioRecorder } from './widgets/AudioRecorder';
import type { FloatingWidgetState } from './types';

interface FloatingLayerProps {
  widgets: FloatingWidgetState[];
  onMove: (id: string, x: number, y: number) => void;
  onMinimize: (id: string) => void;
  onClose: (id: string) => void;
  campaignId: string;
}

export const FloatingLayer = memo(function FloatingLayer({
  widgets,
  onMove,
  onMinimize,
  onClose,
  campaignId,
}: FloatingLayerProps) {
  const renderContent = useCallback(
    (widget: FloatingWidgetState) => {
      switch (widget.type) {
        case 'sticky-note':
          return <StickyNote />;
        case 'audio-recorder':
          return <AudioRecorder campaignId={campaignId} />;
        default:
          return null;
      }
    },
    [campaignId],
  );

  if (widgets.length === 0) return null;

  return (
    <>
      {widgets.map((widget) => (
        <FloatingWidget
          key={widget.id}
          widget={widget}
          onMove={onMove}
          onMinimize={onMinimize}
          onClose={onClose}
        >
          {renderContent(widget)}
        </FloatingWidget>
      ))}
    </>
  );
});
