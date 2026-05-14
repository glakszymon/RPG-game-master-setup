import { type HTMLAttributes, forwardRef } from 'react';
import styles from './Card.module.css';

type CardVariant = 'surface' | 'elevated';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: CardVariant;

  /** Dodaje hover efekt z accent glow */
  interactive?: boolean;

  /** Stały accent glow (np. aktywne okno narzędziowe) */
  glow?: boolean;
}

/**
 * Karta z glassmorphism — główny container UI.
 *
 * Użycie:
 *   <Card>Treść</Card>
 *   <Card variant="elevated">Modal content</Card>
 *   <Card interactive onClick={handleClick}>Klikalna karta</Card>
 */
const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      variant = 'surface',
      interactive = false,
      glow = false,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const classNames = [
      styles.card,
      styles[variant],
      interactive ? styles.interactive : '',
      glow ? styles.glow : '',
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <div ref={ref} className={classNames} {...props}>
        {children}
      </div>
    );
  },
);

Card.displayName = 'Card';

export { Card };
