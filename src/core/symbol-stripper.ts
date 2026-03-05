/**
 * symbol-stripper.ts
 *
 * Removes decorative / structural symbols that commonly appear as artifacts
 * when text is copied from PDFs, OCR output, or legacy formatted documents.
 *
 * Strips:
 *  1. Box-drawing characters  U+2500–U+257F  (│ ─ ┌ ┐ └ ┘ ├ ┤ etc.)
 *  2. Block elements          U+2580–U+259F  (█ ▓ ▒ ░ ▀ ▄ etc.)
 *  3. Geometric shapes        U+25A0–U+25FF  (▪ ▫ ◆ ◇ ○ ●)
 *     EXCEPT: • (U+2022) which is a valid list bullet
 *  4. Dingbat ornaments       U+2700–U+27BF  (✦ ✧ ✩ ✪ ❖ etc.)
 *     EXCEPT: common checkmarks/arrows that carry intent (✓ ✗ → ←)
 *
 * Preserves:
 *  - Regular ASCII punctuation and symbols
 *  - Bullet •  (U+2022)
 *  - Checkmarks ✓ ✗ and directional arrows → ← ↑ ↓
 *  - All emoji (U+1F000+ handled via surrogate pairs)
 *  - Math symbols, currency, accented letters, CJK, etc.
 */

// ── Box-drawing characters ─────────────────────────────────────────────────
// U+2500 to U+257F — used for ASCII tables and border art
const BOX_DRAWING_RE = /[\u2500-\u257F]/g;

// ── Block elements ─────────────────────────────────────────────────────────
// U+2580 to U+259F — legacy terminal block graphics
const BLOCK_ELEMENTS_RE = /[\u2580-\u259F]/g;

// ── Geometric shapes (excluding bullet •) ─────────────────────────────────
// U+25A0–U+25FF, but preserve U+2022 BULLET (handled in whitespace pre-pass)
// We match the range and then skip U+2022 via the char check.
// Simpler: just match the whole range minus bullet in one regex using negative lookahead.
const GEOMETRIC_SHAPES_RE = /[\u25A0-\u25FF]/g;
const BULLET = "\u2022"; // keep this one

// ── Dingbats to strip ──────────────────────────────────────────────────────
// U+2700–U+27BF are the "Dingbats" block. Most are decorative ornaments that
// appear as OCR noise. We preserve a small intentional set:
//   ✓ U+2713  check mark
//   ✗ U+2717  ballot X
//   → U+2192  rightwards arrow (in Arrows block – not dingbats, but kept)
const DINGBATS_RE = /[\u2700-\u2712\u2714-\u2716\u2718-\u27BF]/g;

// ── Arrows block ───────────────────────────────────────────────────────────
// U+2190–U+21FF — arrows like → ← ↑ ↓ are kept intentionally (no regex here).
// Only the dingbat range above is stripped.

/**
 * Strip decorative/structural symbols from plain text.
 *
 * After stripping, lines that become blank or whitespace-only are collapsed,
 * and trailing spaces left behind by removed chars are trimmed per line.
 */
export function stripDecorativeSymbols(text: string): string {
    let out = text;

    // 1. Box-drawing
    out = out.replace(BOX_DRAWING_RE, "");

    // 2. Block elements
    out = out.replace(BLOCK_ELEMENTS_RE, "");

    // 3. Geometric shapes — restore bullet immediately after
    out = out.replace(GEOMETRIC_SHAPES_RE, (ch) => (ch === BULLET ? ch : ""));

    // 4. Dingbat ornaments (keep ✓ ✗ which are outside the stripped range above)
    out = out.replace(DINGBATS_RE, "");

    // 5. Clean up: trim trailing whitespace per line, then collapse lines that
    //    became empty mid-paragraph into nothing (not a paragraph break).
    out = out
        .split("\n")
        .map((line) => line.replace(/[ \t]+$/, "")) // trailing spaces
        .join("\n");

    // 6. Collapse sequences of 3+ blank lines introduced by empty-symbol-only
    //    lines being removed (turns them into a paragraph break \n\n at most).
    out = out.replace(/\n{3,}/g, "\n\n");

    return out;
}
