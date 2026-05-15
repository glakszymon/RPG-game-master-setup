import { type ReactNode } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import styles from './Modal.module.css';

export interface ModalProps {
  /** Kontroluj otwarcie z zewnątrz */
  open: boolean;
  onOpenChange: (open: boolean) => void;

  /** Tytuł modala (wymagany dla accessibility) */
  title: string;

  /** Opcjonalny opis pod tytułem */
  description?: string;

  /** Treść modala */
  children: ReactNode;

  /** Przyciski na dole (np. Zapisz / Anuluj) */
  footer?: ReactNode;

  /** Optional extra class on the content panel (for size overrides) */
  contentClassName?: string;
}

/**
 * Modal z glassmorphism — opakowuje Radix Dialog.
 *
 * Radix daje nam za darmo:
 *   - Focus trap (Tab nie wychodzi poza modal)
 *   - Escape zamyka
 *   - Klik na overlay zamyka
 *   - aria-labelledby, aria-describedby
 *   - Scroll lock na body
 *
 * Użycie:
 *   <Modal
 *     open={isOpen}
 *     onOpenChange={setIsOpen}
 *     title="Nowa kampania"
 *     footer={<><Button variant="secondary">Anuluj</Button><Button>Zapisz</Button></>}
 *   >
 *     <Input label="Nazwa" />
 *   </Modal>
 */
function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  contentClassName,
}: ModalProps) {
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className={styles.overlay} />
        <Dialog.Content className={`${styles.content}${contentClassName ? ` ${contentClassName}` : ''}`}>
          <div className={styles.header}>
            <div>
              <Dialog.Title className={styles.title}>{title}</Dialog.Title>
              {description && (
                <Dialog.Description className={styles.description}>
                  {description}
                </Dialog.Description>
              )}
            </div>
            <Dialog.Close asChild>
              <button className={styles.closeButton} aria-label="Zamknij">
                {/* Prosty X — później możesz zamienić na ikonę */}
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                >
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </Dialog.Close>
          </div>

          <div className={styles.body}>{children}</div>

          {footer && <div className={styles.footer}>{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

export { Modal };
