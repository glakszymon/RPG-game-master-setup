/*
 * CanvasContextMenu — right-click tool spawner with grouped categories.
 *
 * Uses Radix ContextMenu (native right-click trigger) for positioning.
 * Opens in viewport-space (overlay), not canvas-space.
 */

import { useCallback, useRef } from 'react';
import * as ContextMenu from '@radix-ui/react-context-menu';
import { TOOL_CATEGORIES, TOOL_INFO } from './types';
import type { ToolType } from './types';
import styles from './ContextMenu.module.css';

interface ContextMenuProps {
  onOpenTool: (toolType: ToolType, canvasX: number, canvasY: number) => void;
  /** Convert viewport coords to canvas coords */
  viewportToCanvas: (clientX: number, clientY: number) => { x: number; y: number };
  children: React.ReactNode;
}

function CanvasContextMenu({ onOpenTool, viewportToCanvas, children }: ContextMenuProps) {
  const contextPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    // Store position for use when a tool is selected
    contextPosRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleSelect = useCallback(
    (toolType: ToolType) => {
      const pos = contextPosRef.current;
      const canvasCoords = viewportToCanvas(pos.x, pos.y);
      onOpenTool(toolType, canvasCoords.x, canvasCoords.y);
    },
    [viewportToCanvas, onOpenTool],
  );

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild onContextMenu={handleContextMenu}>
        <div style={{ display: 'contents' }}>
          {children}
        </div>
      </ContextMenu.Trigger>

      <ContextMenu.Portal>
        <ContextMenu.Content className={styles.content}>
          {TOOL_CATEGORIES.map((category) => (
            <ContextMenu.Group key={category.label}>
              <ContextMenu.Label className={styles.groupLabel}>
                {category.label}
              </ContextMenu.Label>
              {category.tools.map((toolType) => {
                const info = TOOL_INFO[toolType];
                return (
                  <ContextMenu.Item
                    key={toolType}
                    className={styles.item}
                    onSelect={() => handleSelect(toolType)}
                  >
                    <span className={styles.itemIcon}>{info.icon}</span>
                    <span>{info.name}</span>
                  </ContextMenu.Item>
                );
              })}
              <ContextMenu.Separator className={styles.separator} />
            </ContextMenu.Group>
          ))}
        </ContextMenu.Content>
      </ContextMenu.Portal>
    </ContextMenu.Root>
  );
}

export { CanvasContextMenu };
