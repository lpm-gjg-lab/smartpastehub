/**
 * slug-generator.ts
 *
 * Utility helpers to produce URL-safe and filename-safe slugs.
 */

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function transliterate(text: string): string {
  const ss = "ss";
  const ae = "ae";
  const oe = "oe";
  const o = "o";
  const d = "d";
  const th = "th";

  return text
    .replace(/ß/g, ss)
    .replace(/[ÆǼ]/g, ae.toUpperCase())
    .replace(/[æǽ]/g, ae)
    .replace(/Œ/g, oe.toUpperCase())
    .replace(/œ/g, oe)
    .replace(/[ØÖ]/g, o.toUpperCase())
    .replace(/[øö]/g, o)
    .replace(/Đ/g, d.toUpperCase())
    .replace(/đ/g, d)
    .replace(/Þ/g, th.toUpperCase())
    .replace(/þ/g, th)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * Generate a URL-safe slug from text.
 */
export function generateSlug(text: string, separator = "-"): string {
  const safeSeparator = separator || "-";
  const escapedSeparator = escapeForRegExp(safeSeparator);
  const source = transliterate(text).toLowerCase();

  const slug = source
    .replace(/[^a-z0-9]+/g, safeSeparator)
    .replace(new RegExp(`${escapedSeparator}{2,}`, "g"), safeSeparator)
    .replace(new RegExp(`^${escapedSeparator}|${escapedSeparator}$`, "g"), "");

  return slug;
}

/**
 * Generate a file-safe slug using underscore as separator.
 */
export function generateFileSlug(text: string): string {
  return generateSlug(text, "_");
}
