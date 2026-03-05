const UNFORMATTED_LARGE_NUMBER = /(?<![\d.,])\d{4,}(?![\d.,])/g;

function resolveLocale(text: string, locale?: string): string {
  if (locale) {
    return locale;
  }
  if (/(?:\bIDR\b|Rp)/i.test(text)) {
    return "id-ID";
  }
  if (/(?:\bUSD\b|\$)/i.test(text)) {
    return "en-US";
  }
  return "id-ID";
}

/**
 * Add thousand separators to large unformatted numbers in text.
 *
 * Currency hints in text are used for locale auto-detection:
 * - Rp / IDR -> Indonesian formatting
 * - $ / USD  -> US formatting
 */
export function formatNumber(text: string, locale?: string): string {
  const activeLocale = resolveLocale(text, locale);
  const formatter = new Intl.NumberFormat(activeLocale, {
    useGrouping: true,
    maximumFractionDigits: 20,
  });

  return text.replace(UNFORMATTED_LARGE_NUMBER, (rawDigits) => {
    const numericValue = Number(rawDigits);
    if (!Number.isFinite(numericValue)) {
      return rawDigits;
    }
    return formatter.format(numericValue);
  });
}

/**
 * Strip formatting and currency symbols from a number-like string.
 */
export function parseNumber(text: string): string {
  const match = text.match(/-?\d[\d.,]*/);
  if (!match) {
    return "";
  }

  const value = match[0];
  const isNegative = value.startsWith("-");
  const digits = value.replace(/[^\d]/g, "");

  if (!digits) {
    return "";
  }
  return isNegative ? `-${digits}` : digits;
}
