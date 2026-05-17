/*
 * CanvasContextMenu — right-click tool spawner with grouped categories.
 *
 * Uses Radix DropdownMenu for positioning and accessibility.
 * Opens in viewport-space (overlay), not canvas-space.
 */

import { useCallback, useState } from 'react';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
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
  const [contextPos, setContextPos] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      // Only open on canvas background, not on windows
      if ((e.target as HTMLElement).closest('.canvas-window')) return;
      e.preventDefault();
      setContextPos({ x: e.clientX, y: e.clientY });
    },
    [],
  );

  const handleSelect = useCallback(
    (toolType: ToolType) => {
      if (!contextPos) return;
      const canvasCoords = viewportToCanvas(contextPos.x, contextPos.y);
      onOpenTool(toolType, canvasCoords.x, canvasCoords.y);
      setContextPos(null);
    },
    [contextPos, viewportToCanvas, onOpenTool],
  );

  return (
    <>
      <div onContextMenu={handleContextMenu} style={{ display: 'contents' }}>
        {children}
      </div>

      <DropdownMenu.Root
        open={contextPos !== null}
        onOpenChange={(open) => {
          if (!open) setContextPos(null);
        }}
      >
        <DropdownMenu.Trigger asChild>
          <span style={{ position: 'fixed', left: contextPos?.x ?? 0, top: contextPos?.y ?? 0, width: 0, height: 0 }} />
        </DropdownMenu.Trigger>

        {contextPos && (
          <DropdownMenu.Portal>
            <DropdownMenu.Content
              className={styles.content}
              style={{
                position: 'fixed',
                left: contextPos.x,
                top: contextPos.y,
              }}
              sideOffset={0}
              align="start"
            >
              {TOOL_CATEGORIES.map((category) => (
                <DropdownMenu.Group key={category.label}>
                  <DropdownMenu.Label className={styles.groupLabel}>
                    {category.label}
                  </DropdownMenu.Label>
                  {category.tools.map((toolType) => {
                    const info = TOOL_INFO[toolType];
                    return (
                      <DropdownMenu.Item
                        key={toolType}
                        className={styles.item}
                        onSelect={() => handleSelect(toolType)}
                      >
                        <span className={styles.itemIcon}>{info.icon}</span>
                        <span>{info.name}</span>
                      </DropdownMenu.Item>
                    );
                  })}
                  <DropdownMenu.Separator className={styles.separator} />
                </DropdownMenu.Group>
              ))}
            </DropdownMenu.Content>
          </DropdownMenu.Portal>
        )}
      </DropdownMenu.Root>
    </>
  );
}

export { CanvasContextMenu };
