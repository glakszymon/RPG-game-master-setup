import { type ButtonHTMLAttributes, forwardRef } from 'react';
import { Slot } from '@radix-ui/react-slot';
import styles from './Button.module.css';

/**
 * Warianty wizualne przycisku:
 *   primary   — złoty, główna akcja
 *   secondary — obramowanie, drugorzędna
 *   ghost     — minimalny, toolbar/ikona
 *   danger    — czerwony, destrukcyjna
 */
type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;

  /**
   * Kwadratowy przycisk na ikonę (jednakowa szerokość/wysokość).
   */
  iconOnly?: boolean;

  /**
   * Radix Slot pattern — gdy true, Button renderuje się jako
   * swoje jedyne dziecko (np. <a>), zachowując styl.
   *
   * Przykład:
   *   <Button asChild><a href="/foo">Link</a></Button>
   */
  asChild?: boolean;
}

/**
 * Bazowy komponent przycisku.
 *
 * Używa Radix `Slot` do asChild pattern — dzięki temu Button
 * może renderować się jako <a>, <Link>, czy dowolny inny element,
 * zachowując wszystkie style.
 */
const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = 'primary',
      size = 'md',
      iconOnly = false,
      asChild = false,
      className,
      children,
      ...props
    },
    ref,
  ) => {
    const Comp = asChild ? Slot : 'button';

    const classNames = [
      styles.button,
      styles[variant],
      styles[size],
      iconOnly ? styles.iconOnly : '',
      className ?? '',
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <Comp ref={ref} className={classNames} {...props}>
        {children}
      </Comp>
    );
  },
);

Button.displayName = 'Button';

export { Button };
