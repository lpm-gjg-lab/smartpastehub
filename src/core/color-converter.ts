/**
 * color-converter.ts
 *
 * Converts color strings between hex, rgb(a), and hsl(a).
 */

export interface RgbaColor {
  r: number;
  g: number;
  b: number;
  a?: number;
}

export interface HslaColor {
  h: number;
  s: number;
  l: number;
  a?: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeAlpha(alpha?: number): number {
  if (typeof alpha !== "number" || Number.isNaN(alpha)) {
    return 1;
  }
  return clamp(alpha, 0, 1);
}

function formatAlpha(alpha?: number): string {
  return normalizeAlpha(alpha)
    .toFixed(3)
    .replace(/\.0+$/, "")
    .replace(/(\.\d*?)0+$/, "$1");
}

/**
 * Convert hex color text to RGBA values.
 */
export function hexToRgb(hex: string): RgbaColor | null {
  const cleaned = hex.trim().replace(/^#/, "");

  if (![3, 4, 6, 8].includes(cleaned.length) || /[^0-9a-fA-F]/.test(cleaned)) {
    return null;
  }

  const expanded =
    cleaned.length <= 4
      ? cleaned
          .split("")
          .map((c) => `${c}${c}`)
          .join("")
      : cleaned;

  const hasAlpha = expanded.length === 8;
  const r = parseInt(expanded.slice(0, 2), 16);
  const g = parseInt(expanded.slice(2, 4), 16);
  const b = parseInt(expanded.slice(4, 6), 16);

  if (!hasAlpha) {
    return { r, g, b, a: 1 };
  }

  const a = parseInt(expanded.slice(6, 8), 16) / 255;
  return { r, g, b, a };
}

/**
 * Convert RGB(A) values to hex text.
 */
export function rgbToHex(r: number, g: number, b: number, a?: number): string {
  const rr = clamp(Math.round(r), 0, 255).toString(16).padStart(2, "0");
  const gg = clamp(Math.round(g), 0, 255).toString(16).padStart(2, "0");
  const bb = clamp(Math.round(b), 0, 255).toString(16).padStart(2, "0");
  const alpha = normalizeAlpha(a);

  if (alpha < 1) {
    const aa = Math.round(alpha * 255)
      .toString(16)
      .padStart(2, "0");
    return `#${rr}${gg}${bb}${aa}`.toUpperCase();
  }

  return `#${rr}${gg}${bb}`.toUpperCase();
}

/**
 * Convert RGB to HSL.
 */
export function rgbToHsl(r: number, g: number, b: number): HslaColor {
  const rn = clamp(r, 0, 255) / 255;
  const gn = clamp(g, 0, 255) / 255;
  const bn = clamp(b, 0, 255) / 255;

  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;

  let h = 0;
  const l = (max + min) / 2;
  let s = 0;

  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    switch (max) {
      case rn:
        h = ((gn - bn) / delta) % 6;
        break;
      case gn:
        h = (bn - rn) / delta + 2;
        break;
      default:
        h = (rn - gn) / delta + 4;
        break;
    }
    h *= 60;
    if (h < 0) {
      h += 360;
    }
  }

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
    a: 1,
  };
}

/**
 * Convert HSL to RGB.
 */
export function hslToRgb(h: number, s: number, l: number): RgbaColor {
  const hn = ((h % 360) + 360) % 360;
  const sn = clamp(s, 0, 100) / 100;
  const ln = clamp(l, 0, 100) / 100;

  if (sn === 0) {
    const value = Math.round(ln * 255);
    return { r: value, g: value, b: value, a: 1 };
  }

  const c = (1 - Math.abs(2 * ln - 1)) * sn;
  const x = c * (1 - Math.abs(((hn / 60) % 2) - 1));
  const m = ln - c / 2;

  let rp = 0;
  let gp = 0;
  let bp = 0;

  if (hn < 60) {
    rp = c;
    gp = x;
  } else if (hn < 120) {
    rp = x;
    gp = c;
  } else if (hn < 180) {
    gp = c;
    bp = x;
  } else if (hn < 240) {
    gp = x;
    bp = c;
  } else if (hn < 300) {
    rp = x;
    bp = c;
  } else {
    rp = c;
    bp = x;
  }

  return {
    r: Math.round((rp + m) * 255),
    g: Math.round((gp + m) * 255),
    b: Math.round((bp + m) * 255),
    a: 1,
  };
}

function parseRgb(text: string): RgbaColor | null {
  const match = text.match(
    /^rgba?\(\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)\s*(?:,\s*([+-]?\d*(?:\.\d+)?)\s*)?\)$/i,
  );
  if (!match) {
    return null;
  }

  const r = Number(match[1]);
  const g = Number(match[2]);
  const b = Number(match[3]);
  const a = match[4] ? Number(match[4]) : 1;

  if ([r, g, b, a].some((value) => Number.isNaN(value))) {
    return null;
  }

  if (
    r < 0 ||
    r > 255 ||
    g < 0 ||
    g > 255 ||
    b < 0 ||
    b > 255 ||
    a < 0 ||
    a > 1
  ) {
    return null;
  }

  return { r, g, b, a };
}

function parseHsl(text: string): HslaColor | null {
  const match = text.match(
    /^hsla?\(\s*([+-]?\d+(?:\.\d+)?)\s*,\s*([+-]?\d+(?:\.\d+)?)%\s*,\s*([+-]?\d+(?:\.\d+)?)%\s*(?:,\s*([+-]?\d*(?:\.\d+)?)\s*)?\)$/i,
  );
  if (!match) {
    return null;
  }

  const h = Number(match[1]);
  const s = Number(match[2]);
  const l = Number(match[3]);
  const a = match[4] ? Number(match[4]) : 1;

  if ([h, s, l, a].some((value) => Number.isNaN(value))) {
    return null;
  }

  if (s < 0 || s > 100 || l < 0 || l > 100 || a < 0 || a > 1) {
    return null;
  }

  return { h, s, l, a };
}

function formatRgb(color: RgbaColor): string {
  const r = Math.round(color.r);
  const g = Math.round(color.g);
  const b = Math.round(color.b);
  const a = normalizeAlpha(color.a);

  if (a < 1) {
    return `rgba(${r}, ${g}, ${b}, ${formatAlpha(a)})`;
  }
  return `rgb(${r}, ${g}, ${b})`;
}

function formatHsl(color: HslaColor): string {
  const h = Math.round(color.h);
  const s = Math.round(color.s);
  const l = Math.round(color.l);
  const a = normalizeAlpha(color.a);

  if (a < 1) {
    return `hsla(${h}, ${s}%, ${l}%, ${formatAlpha(a)})`;
  }
  return `hsl(${h}, ${s}%, ${l}%)`;
}

/**
 * Detect a color format and output hex, rgb(a), and hsl(a) representations.
 * Returns original input when parsing fails.
 */
export function convertColor(text: string): string {
  const input = text.trim();
  let rgba: RgbaColor | null = null;

  if (input.startsWith("#")) {
    rgba = hexToRgb(input);
  } else if (/^rgba?\(/i.test(input)) {
    rgba = parseRgb(input);
  } else if (/^hsla?\(/i.test(input)) {
    const hsla = parseHsl(input);
    if (hsla) {
      const rgb = hslToRgb(hsla.h, hsla.s, hsla.l);
      rgba = { ...rgb, a: hsla.a };
    }
  }

  if (!rgba) {
    return text;
  }

  const alpha = normalizeAlpha(rgba.a);
  const hex = rgbToHex(rgba.r, rgba.g, rgba.b, alpha);
  const rgbText = formatRgb({ ...rgba, a: alpha });
  const hsl = rgbToHsl(rgba.r, rgba.g, rgba.b);
  const hslText = formatHsl({ ...hsl, a: alpha });

  return `${hex} | ${rgbText} | ${hslText}`;
}
