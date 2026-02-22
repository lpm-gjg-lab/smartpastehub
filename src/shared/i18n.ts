import id from "../locales/id.json";
import en from "../locales/en.json";

const translations: Record<string, Record<string, unknown>> = {
  id: id as Record<string, unknown>,
  en: en as Record<string, unknown>,
};

const fallbackLocale = "id";
const localeListeners = new Set<() => void>();

let currentLocale = "id";

function normalizeLocale(locale: string): string {
  const normalized = locale.toLowerCase();
  if (translations[normalized]) {
    return normalized;
  }

  const baseLocale = normalized.split("-")[0] ?? fallbackLocale;
  if (translations[baseLocale]) {
    return baseLocale;
  }

  return fallbackLocale;
}

function notifyLocaleListeners() {
  for (const listener of localeListeners) {
    listener();
  }
}

export function detectDefaultLocale(): string {
  if (
    typeof navigator !== "undefined" &&
    typeof navigator.language === "string"
  ) {
    return normalizeLocale(navigator.language);
  }

  return fallbackLocale;
}

export function setLocale(locale: string): void {
  const nextLocale = normalizeLocale(locale);
  if (nextLocale !== currentLocale) {
    currentLocale = nextLocale;
    notifyLocaleListeners();
  }
}

export function subscribeI18n(listener: () => void): () => void {
  localeListeners.add(listener);
  return () => {
    localeListeners.delete(listener);
  };
}

export function t(
  key: string,
  params?: Record<string, string | number>,
): string {
  const keys = key.split(".");
  let value: unknown = translations[currentLocale];

  for (const k of keys) {
    value = (value as Record<string, unknown>)?.[k];
  }

  if (typeof value !== "string") {
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
