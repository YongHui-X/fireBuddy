import { useEffect, useRef, type RefObject } from 'react';

const focusableSelector = [
  'button:not([disabled])',
  '[href]',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',');

type AccessibleDialogOptions = {
  isOpen?: boolean;
  canClose?: boolean;
  onClose: () => void;
};

/** Keep keyboard focus inside an open dialog and restore it when the dialog closes. */
export function useAccessibleDialog<T extends HTMLElement>({
  isOpen = true,
  canClose = true,
  onClose,
}: AccessibleDialogOptions): RefObject<T | null> {
  const dialogRef = useRef<T | null>(null);
  const onCloseRef = useRef(onClose);
  const canCloseRef = useRef(canClose);

  onCloseRef.current = onClose;
  canCloseRef.current = canClose;

  useEffect(() => {
    if (!isOpen) {
      return undefined;
    }

    const previouslyFocused = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const dialog = dialogRef.current;

    const initialFocus = dialog?.querySelector<HTMLElement>('[data-dialog-initial-focus]')
      ?? dialog?.querySelector<HTMLElement>(focusableSelector)
      ?? dialog;
    initialFocus?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (!dialogRef.current) {
        return;
      }

      if (event.key === 'Escape' && canCloseRef.current) {
        event.preventDefault();
        onCloseRef.current();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const focusableElements = Array.from(
        dialogRef.current.querySelectorAll<HTMLElement>(focusableSelector),
      ).filter((element) => element.getAttribute('aria-hidden') !== 'true');

      if (focusableElements.length === 0) {
        event.preventDefault();
        dialogRef.current.focus();
        return;
      }

      const firstElement = focusableElements[0];
      const lastElement = focusableElements[focusableElements.length - 1];

      if (event.shiftKey && document.activeElement === firstElement) {
        event.preventDefault();
        lastElement.focus();
      } else if (!event.shiftKey && document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [isOpen]);

  return dialogRef;
}
