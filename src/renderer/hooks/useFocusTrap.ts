import React from 'react';
import { getFocusCycleIndex } from '../lib/focus-trap';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface UseFocusTrapOptions {
  active: boolean;
  containerRef: React.RefObject<HTMLElement | null>;
  onEscape: () => void;
  returnFocusRef?: React.RefObject<HTMLElement | null>;
}

export function useFocusTrap(options: UseFocusTrapOptions) {
  const { active, containerRef, onEscape, returnFocusRef } = options;

  React.useEffect(() => {
    if (!active) {
      return;
    }

    const previousActive = document.activeElement as HTMLElement | null;
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const getFocusable = () =>
      Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));

    const focusable = getFocusable();
    focusable[0]?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onEscape();
        return;
      }

      if (event.key !== 'Tab') {
        return;
      }

      const currentFocusable = getFocusable();
      if (currentFocusable.length === 0) {
        return;
      }

      const currentIndex = currentFocusable.findIndex(
        (element) => element === document.activeElement,
      );
      const safeCurrentIndex = currentIndex < 0 ? 0 : currentIndex;
      const nextIndex = getFocusCycleIndex(
        safeCurrentIndex,
        currentFocusable.length,
        event.shiftKey,
      );
      if (nextIndex < 0) {
        return;
      }

      event.preventDefault();
      currentFocusable[nextIndex]?.focus();
    };

    document.addEventListener('keydown', onKeyDown);

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      const fallback = previousActive;
      const nextFocus = returnFocusRef?.current ?? fallback;
      nextFocus?.focus();
    };
  }, [active, containerRef, onEscape, returnFocusRef]);
}
