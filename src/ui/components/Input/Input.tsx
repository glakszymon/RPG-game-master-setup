import {
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  forwardRef,
  useId,
} from 'react';
import styles from './Input.module.css';

/* ─── Input ─── */

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Label wyświetlany nad polem */
  label?: string;
  /** Komunikat błędu — włącza czerwony border */
  error?: string;
}

/**
 * Pole tekstowe z glassmorphism tłem.
 *
 * Użycie:
 *   <Input label="Nazwa" placeholder="Wpisz nazwę..." />
 *   <Input label="HP" type="number" error="Wymagane" />
 */
const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, className, id: externalId, ...props }, ref) => {
    const generatedId = useId();
    const id = externalId ?? generatedId;

    return (
      <div
        className={[styles.wrapper, error ? styles.error : '', className ?? '']
          .filter(Boolean)
          .join(' ')}
      >
        {label && (
          <label htmlFor={id} className={styles.label}>
            {label}
          </label>
        )}
        <input ref={ref} id={id} className={styles.input} {...props} />
        {error && <span className={styles.errorMessage}>{error}</span>}
      </div>
    );
  },
);

Input.displayName = 'Input';

/* ─── Textarea ─── */

export interface TextareaProps
  extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

/**
 * Wieloliniowe pole tekstowe.
 *
 * Użycie:
 *   <Textarea label="Opis" rows={4} />
 */
const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, className, id: externalId, ...props }, ref) => {
    const generatedId = useId();
    const id = externalId ?? generatedId;

    return (
      <div
        className={[styles.wrapper, error ? styles.error : '', className ?? '']
          .filter(Boolean)
          .join(' ')}
      >
        {label && (
          <label htmlFor={id} className={styles.label}>
            {label}
          </label>
        )}
        <textarea ref={ref} id={id} className={styles.textarea} {...props} />
        {error && <span className={styles.errorMessage}>{error}</span>}
      </div>
    );
  },
);

Textarea.displayName = 'Textarea';

export { Input, Textarea };
