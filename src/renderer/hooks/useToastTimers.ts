import { useState, useRef, useCallback } from 'react';

export function useToastTimers(onHide: () => void, displayTimeMs = 4000) {
  const [closing, setClosing] = useState(false);
  const hideTimerRef = useRef<number | undefined>(undefined);
  const closeTimerRef = useRef<number | undefined>(undefined);

  const clearDismissTimers = useCallback(() => {
    clearTimeout(hideTimerRef.current);
    clearTimeout(closeTimerRef.current);
  }, []);

  const startDismissTimers = useCallback(() => {
    clearDismissTimers();
    hideTimerRef.current = window.setTimeout(() => {
      setClosing(true);
      closeTimerRef.current = window.setTimeout(() => {
        onHide();
      }, 300); // Wait for slideDown animation
    }, displayTimeMs);
  }, [clearDismissTimers, onHide, displayTimeMs]);

  const scheduleClose = useCallback((delayMs = 1000) => {
    clearDismissTimers();
    setTimeout(() => {
      setClosing(true);
      setTimeout(() => onHide(), 300);
    }, delayMs);
  }, [clearDismissTimers, onHide]);

  return { closing, setClosing, startDismissTimers, clearDismissTimers, scheduleClose };
}
