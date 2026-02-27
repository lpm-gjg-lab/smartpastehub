/**
 * unicode-cleaner.ts
 *
 * Handles the full spectrum of Unicode/encoding problems that cause copy-paste
 * corruption across applications:
 *
 *  1. Zero-width & invisible characters  (already in plugin, also here for pipeline use)
 *  2. Smart quotes / typographic punctuation  → straight ASCII equivalents
 *  3. Soft hyphen \u00AD                  → removed (invisible, breaks code/search)
 *  4. Non-breaking space \u00A0 & variants → regular space
 *  5. Windows CRLF / old Mac CR           → LF
 *  6. Windows-1252 / Latin-1 mojibake    → correct UTF-8 (e.g. â€™ → ')
 *  7. Ligatures (ﬁ ﬂ ﬀ etc.)             → plain ASCII equivalents
 *  8. Fullwidth ASCII (Ａ－Ｚ etc.)        → halfwidth ASCII
 *  9. Emoji safety — preserves emoji as-is (no stripping)
 * 10. RTL control marks                  → removed (can flip display in wrong contexts)
 */

export interface UnicodeCleanOptions {
  /** Replace smart quotes with straight quotes. Default: true */
  straightenQuotes?: boolean;
  /** Remove soft hyphens \u00AD. Default: true */
  removeSoftHyphen?: boolean;
  /** Replace non-breaking spaces with regular spaces. Default: true */
  normalizeNbsp?: boolean;
  /** Normalize line endings to LF. Default: true */
  normalizeCrlf?: boolean;
  /** Fix common Windows-1252 mojibake sequences. Default: true */
  fixMojibake?: boolean;
  /** Expand typographic ligatures to ASCII. Default: true */
  expandLigatures?: boolean;
  /** Normalize fullwidth ASCII to halfwidth. Default: false (only for code/terminal) */
  normalizeFullwidth?: boolean;
  /** Remove zero-width characters. Default: true */
  removeZeroWidth?: boolean;
  /** Remove RTL/LTR control marks. Default: true */
  removeRtlMarks?: boolean;
}

const DEFAULT_OPTIONS: Required<UnicodeCleanOptions> = {
  straightenQuotes: true,
  removeSoftHyphen: true,
  normalizeNbsp: true,
  normalizeCrlf: true,
  fixMojibake: true,
  expandLigatures: true,
  normalizeFullwidth: false,
  removeZeroWidth: true,
  removeRtlMarks: true,
};

// ── Zero-width & invisible characters ─────────────────────────────────────────
// \u200B Zero-width space
// \u200C Zero-width non-joiner
// \u200D Zero-width joiner  (keep in emoji sequences — handled separately)
// \uFEFF BOM / zero-width no-break space
// \u00AD Soft hyphen (handled separately with its own option)
const ZERO_WIDTH_RE = /[\u200B\u200C\uFEFF]/g;

// ── RTL/LTR control marks ─────────────────────────────────────────────────────
// \u200E LTR mark  \u200F RTL mark
// \u202A–\u202E directional embedding/override
// \u2066–\u2069 isolate marks
const RTL_MARKS_RE = /[\u200E\u200F\u202A-\u202E\u2066-\u2069]/g;

// ── Smart / typographic quotes ────────────────────────────────────────────────
const SMART_QUOTES: [RegExp, string][] = [
  [/[\u201C\u201D\u201E\u201F\u275D\u275E]/g, '"'], // "  "  „  ‟  ❝  ❞  → "
  [/[\u2018\u2019\u201A\u201B\u275B\u275C]/g, "'"], // '  '  ‚  ‛  ❛  ❜  → '
  [/[\u00AB\u00BB\u2039\u203A]/g, '"'], // «  »  ‹  ›          → "
  [/\u2032/g, "'"], // ′ prime             → '
  [/\u2033/g, '"'], // ″ double prime      → "
];

// ── Typographic dashes ────────────────────────────────────────────────────────
// Keep em/en dashes as-is by default — they are semantically meaningful.
// Only normalize the rare "double hyphen" artifact.
// (Users who want dash→hyphen can add a regex rule themselves.)

// ── Typographic ellipsis ──────────────────────────────────────────────────────
// \u2026 … → ... (three regular dots)
// Only apply when quotes are straightened (same "typographic → plain" mode).
const ELLIPSIS_RE = /\u2026/g;

// ── Ligatures ─────────────────────────────────────────────────────────────────
const LIGATURES: [RegExp, string][] = [
  [/\uFB00/g, "ff"],
  [/\uFB01/g, "fi"],
  [/\uFB02/g, "fl"],
  [/\uFB03/g, "ffi"],
  [/\uFB04/g, "ffl"],
  [/\uFB05/g, "st"],
  [/\uFB06/g, "st"],
  [/\u00C6/g, "AE"],
  [/\u00E6/g, "ae"],
  [/\u0152/g, "OE"],
  [/\u0153/g, "oe"],
  [/\u00DF/g, "ss"], // German ß → ss (for contexts that don't support it)
];

// ── Fullwidth ASCII (Ａ－Ｚ, ａ－ｚ, ０－９, common symbols) ──────────────────
// Unicode range: \uFF01–\uFF5E maps to \u0021–\u005E (offset 0xFEE0)
function normalizeFullwidthChars(text: string): string {
  return text.replace(/[\uFF01-\uFF5E]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
  );
}

// ── Non-breaking space variants ───────────────────────────────────────────────
// \u00A0 NO-BREAK SPACE
// \u202F NARROW NO-BREAK SPACE
// \u2007 FIGURE SPACE
// \u2009 THIN SPACE
// \u200A HAIR SPACE
// \u3000 IDEOGRAPHIC SPACE (full-width, common in CJK copy)
const NBSP_RE = /[\u00A0\u202F\u2007\u2009\u200A\u3000]/g;

// ── Windows-1252 / Latin-1 mojibake ──────────────────────────────────────────
// These appear when text encoded as Windows-1252 is pasted into a UTF-8 context
// and each byte is decoded as a separate ISO-8859-1 code point.
// Most common sequences from real-world copy-paste:
const MOJIBAKE: [RegExp, string][] = [
  // Smart quotes (most common)
  [/â€œ/g, "\u201C"], // " (left double)
  [/â€/g, "\u201D"], // " (right double) — must come AFTER â€œ
  [/â€˜/g, "\u2018"], // ' (left single)
  [/â€™/g, "\u2019"], // ' (right single)
  [/â€¦/g, "\u2026"], // …
  [/â€"/g, "\u2013"], // – en dash
  [/â€"/g, "\u2014"], // — em dash
  // Accented characters
  [/Ã©/g, "é"],
  [/Ã¨/g, "è"],
  [/Ãª/g, "ê"],
  [/Ã«/g, "ë"],
  [/Ã /g, "à"],
  [/Ã¢/g, "â"],
  [/Ã¤/g, "ä"],
  [/Ã¶/g, "ö"],
  [/Ã¼/g, "ü"],
  [/Ã±/g, "ñ"],
  [/Ã§/g, "ç"],
  [/Ã/g, "À"],
  // Bullet / trademark / copyright
  [/â€¢/g, "•"],
  [/Â®/g, "®"],
  [/Â©/g, "©"],
  [/â„¢/g, "™"],
  [/Â°/g, "°"],
  [/Â·/g, "·"],
];

// ── Main export ───────────────────────────────────────────────────────────────

export function cleanUnicode(
  text: string,
  options: UnicodeCleanOptions = {},
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let out = text;

  // 1. Fix mojibake first — before anything else removes/replaces chars
  if (opts.fixMojibake) {
    for (const [re, replacement] of MOJIBAKE) {
      out = out.replace(re, replacement);
    }
  }

  // 2. Normalize line endings
  if (opts.normalizeCrlf) {
    out = out.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  }

  // 3. Remove zero-width characters (not \u200D — needed for emoji ZWJ sequences)
  if (opts.removeZeroWidth) {
    out = out.replace(ZERO_WIDTH_RE, "");
  }

  // 4. Remove soft hyphen
  if (opts.removeSoftHyphen) {
    out = out.replace(/\u00AD/g, "");
  }

  // 5. Remove RTL/LTR control marks
  if (opts.removeRtlMarks) {
    out = out.replace(RTL_MARKS_RE, "");
  }

  // 6. Replace non-breaking spaces with regular spaces
  if (opts.normalizeNbsp) {
    out = out.replace(NBSP_RE, " ");
  }

  // 7. Expand ligatures
  if (opts.expandLigatures) {
    for (const [re, replacement] of LIGATURES) {
      out = out.replace(re, replacement);
    }
  }

  // 8. Straighten quotes + ellipsis
  if (opts.straightenQuotes) {
    for (const [re, replacement] of SMART_QUOTES) {
      out = out.replace(re, replacement);
    }
    out = out.replace(ELLIPSIS_RE, "...");
  }

  // 9. Normalize fullwidth ASCII (optional — default off)
  if (opts.normalizeFullwidth) {
    out = normalizeFullwidthChars(out);
  }

  // Emoji (\uD800–\uDFFF surrogate pairs, \u{1F000}–\u{1FFFF}) are preserved
  // as-is throughout all steps above. No stripping, no encoding changes.

  return out;
}

/**
 * Variant for code/terminal contexts:
 * - Enables fullwidth normalization
 * - Straightens quotes (smart quotes break code)
 * - Removes all invisible characters
 * - Does NOT expand ligatures (ß, æ etc. may be intentional in identifiers)
 */
export function cleanUnicodeForCode(text: string): string {
  return cleanUnicode(text, {
    straightenQuotes: true,
    removeSoftHyphen: true,
    normalizeNbsp: true,
    normalizeCrlf: true,
    fixMojibake: true,
    expandLigatures: false,
    normalizeFullwidth: true,
    removeZeroWidth: true,
    removeRtlMarks: true,
  });
}

/**
 * Variant for plain-text / prose contexts:
 * - Keeps em dash, en dash, ellipsis as real Unicode (readable)
 * - Straightens only ambiguous quotes
 * - No fullwidth normalization
 */
export function cleanUnicodeForProse(text: string): string {
  return cleanUnicode(text, {
    straightenQuotes: false, // keep typographic punctuation in prose
    removeSoftHyphen: true,
    normalizeNbsp: true,
    normalizeCrlf: true,
    fixMojibake: true,
    expandLigatures: true,
    normalizeFullwidth: false,
    removeZeroWidth: true,
    removeRtlMarks: true,
  });
}
