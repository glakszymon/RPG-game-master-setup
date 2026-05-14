import { type ReactNode } from 'react';
import * as RadixTooltip from '@radix-ui/react-tooltip';
import styles from './Tooltip.module.css';

export interface TooltipProps {
  /** Tekst tooltipa */
  content: string;
  /** Element, nad którym pojawia się tooltip */
  children: ReactNode;
  /** Strona (domyślnie top) */
  side?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Tooltip — opakowuje Radix Tooltip.
 *
 * Użycie:
 *   <Tooltip content="Zapisz kampanię">
 *     <Button iconOnly>💾</Button>
 *   </Tooltip>
 */
function Tooltip({ content, children, side = 'top' }: TooltipProps) {
  return (
    <RadixTooltip.Provider delayDuration={300}>
      <RadixTooltip.Root>
        <RadixTooltip.Trigger asChild>{children}</RadixTooltip.Trigger>
        <RadixTooltip.Portal>
          <RadixTooltip.Content
            className={styles.content}
            side={side}
            sideOffset={6}
          >
            {content}
            <RadixTooltip.Arrow className={styles.arrow} />
          </RadixTooltip.Content>
        </RadixTooltip.Portal>
      </RadixTooltip.Root>
    </RadixTooltip.Provider>
  );
}

export { Tooltip };
