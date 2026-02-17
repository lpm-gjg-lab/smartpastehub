import id from '../locales/id.json';
import en from '../locales/en.json';

const translations: Record<string, Record<string, unknown>> = {
  id: id as Record<string, unknown>,
  en: en as Record<string, unknown>,
};
let currentLocale = 'id';

export function setLocale(locale: string): void {
  if (translations[locale]) {
    currentLocale = locale;
  }
}

export function t(
  key: string,
  params?: Record<string, string | number>,
): string {
  const keys = key.split('.');
  let value: unknown = translations[currentLocale];

  for (const k of keys) {
    value = (value as Record<string, unknown>)?.[k];
  }

  if (typeof value !== 'string') {
    return key;
  }

  if (params) {
    return value.replace(/\{(\w+)\}/g, (_, k) => String(params[k] ?? `{${k}}`));
  }
  return value;
}

export function getLocale(): string {
  return currentLocale;
}
