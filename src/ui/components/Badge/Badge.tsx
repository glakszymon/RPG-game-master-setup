import { type HTMLAttributes, type ReactNode, forwardRef } from 'react';
import styles from './Badge.module.css';

type BadgeVariant = 'default' | 'accent' | 'success' | 'error' | 'warning' | 'info';

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  children: ReactNode;
}

/**
 * Badge / Tag — mały kolorowy label.
 *
 * Użycie:
 *   <Badge>NPC</Badge>
 *   <Badge variant="error">Dead</Badge>
 *   <Badge variant="success">Active</Badge>
 */
const Badge = forwardRef<HTMLSpanElement, BadgeProps>(
  ({ variant = 'default', className, children, ...props }, ref) => {
    const classNames = [styles.badge, styles[variant], className ?? '']
      .filter(Boolean)
      .join(' ');

    return (
      <span ref={ref} className={classNames} {...props}>
        {children}
      </span>
    );
  },
);

Badge.displayName = 'Badge';

export { Badge };
