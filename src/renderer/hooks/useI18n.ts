import { useSyncExternalStore } from 'react';
import {
  detectDefaultLocale,
  getLocale,
  setLocale,
  subscribeI18n,
  t,
} from '../../shared/i18n';

let initialized = false;

function initializeLocale() {
  if (initialized) return;
  initialized = true;
  setLocale(detectDefaultLocale());
}

export function useI18n() {
  initializeLocale();

  const locale = useSyncExternalStore(subscribeI18n, getLocale, getLocale);

  return {
    locale,
    setLocale,
    t,
  };
}
