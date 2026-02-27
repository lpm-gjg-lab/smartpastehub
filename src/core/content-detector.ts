import { DetectionResult } from "../shared/types";
// Table-detection helpers inlined to avoid module-loading race in Electron watch mode
function looksLikeProse(lines: string[]): boolean {
  if (lines.length === 0) return false;
  const sentenceLikeLines = lines.filter((line) => {
    const trimmed = line.trim();
    const startsWithLetter = /^[A-Za-z\u00C0-\u024F]/.test(trimmed);
    const endsWithPunct = /[.!?,;]$/.test(trimmed);
    const wordCount = trimmed.split(/\s+/).length;
    const hasProseWords =
      /\b(the|a|an|is|are|was|were|and|or|but|for|to|in|on|at|of|with|from|by|this|that|it|i|we|you|they|he|she|ini|itu|dan|atau|di|ke|dari|yang|untuk|dengan|ada|sudah|akan|bisa|harus|tidak|kami|kita|saya|anda)\b/i.test(
        trimmed,
      );
    return (
      (startsWithLetter && endsWithPunct) || (wordCount >= 7 && hasProseWords)
    );
  });
  if (sentenceLikeLines.length / lines.length >= 0.6) return true;
  const totalWords = lines.reduce(
    (sum, line) => sum + line.trim().split(/\s+/).length,
    0,
  );
  return totalWords / lines.length >= 10;
}

function isTSV(text: string): boolean {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return false;
  if (looksLikeProse(lines)) return false;
  const tabCounts = lines.map((line) => (line.match(/\t/g) || []).length);
  const linesWithTabs = tabCounts.filter((c) => c > 0);
  if (linesWithTabs.length < 2) return false;
  if (!linesWithTabs.every((c) => c === linesWithTabs[0])) return false;
  if (linesWithTabs.length / lines.length < 0.8) return false;
  if ((linesWithTabs[0] ?? 0) < 1) return false;
  return true;
}

function isCSV(text: string): boolean {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return false;
  if (looksLikeProse(lines)) return false;
  const commaCounts = lines.map((line) => (line.match(/,/g) || []).length);
  const linesWithCommas = commaCounts.filter((c) => c > 0);
  if (linesWithCommas.length < 2) return false;
  const endsWithPunct = lines.filter((line) =>
    /[.!?;:]\s*$/.test(line.trim()),
  ).length;
  if (endsWithPunct / lines.length > 0.4) return false;
  if (!linesWithCommas.every((c) => c === linesWithCommas[0])) return false;
  if (linesWithCommas.length / lines.length < 0.8) return false;
  const allCommas = text.match(/,/g) || [];
  const grammarCommas = text.match(/,\s/g) || [];
  if (allCommas.length > 0 && grammarCommas.length / allCommas.length >= 0.9)
    return false;
  return true;
}

// ─── Specific pattern matchers ─────────────────────────────────────────────────

/** Matches a single URL (entire text is a URL) */
const URL_FULL = /^(https?|ftp|file):\/\/[^\s]+$/i;
/** Matches URLs embedded in text */
const URL_EMBEDDED = /(https?|ftp):\/\/[^\s]+/gi;

/** Matches an email address (entire text) */
const EMAIL_FULL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
/** Matches email addresses embedded in text */
const EMAIL_EMBEDDED = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

/** Matches Windows or Unix file paths */
const PATH_WIN = /^[A-Z]:\\[\w\\. -]+/i;
const PATH_UNIX = /^(\/[\w.-]+){2,}/;
const PATH_UNC = /^\\\\[\w.-]+\\/;

/** Matches hex, rgb(), rgba(), hsl(), hsla() color codes */
const COLOR_HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})$/;
const COLOR_FUNC = /^(rgba?|hsla?)\(\s*\d+/i;

/** Matches simple math expressions: digits and operators */
const MATH_EXPR = /^[\d\s+\-*/().,%^]+$/;
/** Must contain at least one operator and one digit */
const MATH_HAS_OP = /\d\s*[+\-*/^%]\s*\d/;

/** Matches markdown syntax indicators */
const MD_HEADING = /^#{1,6}\s+.+/m;
const MD_BOLD_ITALIC = /(\*{1,3}|_{1,3}).+\1/;
const MD_LIST = /^(\s*(?:[-*+•▪◦]|\d+[.)]|[A-Za-z][.)])\s+).+/m;
const MD_LINK = /\[.+?\]\(.+?\)/;
const MD_CODE_BLOCK = /^```/m;
const MD_CHECKBOX = /^- \[([ xX])\]/m;

/** JSON start character */
const JSON_START = /^\s*[[{]/;

/** YAML key: value on its own line — must look like config, not prose */
const YAML_KV = /^\s*[\w][\w.-]*\s*:\s*.+/;
/** YAML block indicators */
const YAML_DOC_START = /^---\s*$/m;

/** TOML section header */
const TOML_SECTION = /^\s*\[[\w.-]+\]\s*$/m;
/** TOML key = value */
const TOML_KV = /^\s*[\w][\w.-]*\s*=\s*.+/;

// ─── Phone number patterns ────────────────────────────────────────────────────
// Indonesian: 08xx-xxxx-xxxx, +62 8xx xxxx xxxx, (021) xxx-xxxx
const PHONE_ID = /^(?:\+62|62|0)[\s-]?[2-9][\d\s-]{6,14}$/;
// International E.164 or common formats: +1-800-555-1234, (555) 555-5555
const PHONE_INTL =
  /^(?:\+\d{1,3}[\s-]?)?\(?\d{2,4}\)?[\s.-]?\d{3,4}[\s.-]?\d{4,}$/;
// Multi-phone: several phone numbers, possibly with labels
const PHONE_LABEL =
  /^(?:(?:phone|tel|hp|no\.?\s*hp|mobile|fax|whatsapp|wa)\s*:?\s*)?\+?[\d][\d\s().+\-]{6,}/im;

// ─── Date / time patterns ────────────────────────────────────────────────────
// ISO 8601: 2026-02-26, 2026-02-26T10:30:00Z
const DATE_ISO =
  /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:\d{2})?)?$/;
// Long form: 26 February 2026, February 26, 2026
const DATE_LONG =
  /^(?:\d{1,2}\s+)?(?:January|February|March|April|May|June|July|August|September|October|November|December|Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+(?:\d{1,2},?\s+)?\d{4}$/i;
// Short form: 26/02/2026, 02-26-2026, 26.02.2026
const DATE_SHORT =
  /^(?:0?[1-9]|[12]\d|3[01])[./\-](?:0?[1-9]|1[0-2])[./\-](?:\d{2}|\d{4})$/;
// Time-only: 10:30, 10:30:45, 10:30 AM
const TIME_ONLY = /^(?:[01]?\d|2[0-3]):[0-5]\d(?::[0-5]\d)?(?:\s*[APap][Mm])?$/;
// Date + time in prose: "Senin, 26 Februari 2026 pukul 10.30"
const DATE_PROSE_ID =
  /(?:Senin|Selasa|Rabu|Kamis|Jumat|Sabtu|Minggu),?\s+\d{1,2}\s+(?:Januari|Februari|Maret|April|Mei|Juni|Juli|Agustus|September|Oktober|November|Desember)\s+\d{4}/i;

// ─── Address patterns ─────────────────────────────────────────────────────────
// Street indicators (EN + ID)
const ADDR_STREET =
  /\b(?:jl\.?|jalan|street|st\.?|avenue|ave\.?|road|rd\.?|boulevard|blvd\.?|lane|ln\.?|drive|dr\.?|court|ct\.?|place|pl\.?)/i;
// City/country indicators
const ADDR_CITY =
  /\b(?:jakarta|surabaya|bandung|medan|semarang|makassar|palembang|tangerang|new york|london|singapore|kuala lumpur)\b/i;
// Postal/ZIP code: 5-digit (US/ID) or longer
const ADDR_ZIP = /\b\d{5}(?:-\d{4})?\b|\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/i;
// Province/state abbreviations
const ADDR_PROVINCE =
  /\b(?:DKI|DIY|Jawa\s+(?:Barat|Tengah|Timur)|Bali|Sulawesi|Kalimantan|Papua|Sumatera|[A-Z]{2}\s+\d{5})\b/i;

/**
 * Source-code keywords — require multiple matches or structural code patterns
 * to avoid false positives on prose containing words like "let", "class", "import"
 */
const CODE_KEYWORDS =
  /\b(function|const|let|var|def|import|export|#include|class|if|else|return|for|while|switch|case|try|catch|throw|async|await|interface|type|enum|struct|public|private|protected|static|void|int|string|bool|float|double)\b/g;
const CODE_STRUCTURAL = /[{};]|=>|->|\(\)|::\s*\w|^\s*(\/\/|#|\/\*)/m;

// ─── HTML tag matchers ──────────────────────────────────────────────────────────

const HTML_TABLE = /<table[\s>]/i;
const HTML_STYLED = /<(b|strong|i|em|span|font|style)[\s>]/i;
const HTML_STRUCTURAL = /<(p|div|ul|ol|li|h1|h2|h3|h4|h5|h6)[\s>]/i;

// ─── Main detector ──────────────────────────────────────────────────────────────

export function detectContentType(
  text: string,
  html?: string,
): DetectionResult {
  const trimmed = text.trim();
  if (!trimmed) {
    return { type: "plain_text", confidence: 0.1, metadata: {} };
  }

  // ── 1. HTML detection (from clipboard HTML metadata) ──────────────────────
  if (html) {
    if (HTML_TABLE.test(html)) {
      return { type: "html_table", confidence: 0.95, metadata: {} };
    }
    if (HTML_STYLED.test(html)) {
      return { type: "styled_html", confidence: 0.8, metadata: {} };
    }
    if (HTML_STRUCTURAL.test(html)) {
      return { type: "structured_html", confidence: 0.7, metadata: {} };
    }
  }

  // ── 2. Single-value specific patterns (high confidence, unambiguous) ──────

  // Phone number — check BEFORE email to avoid matching country codes as emails
  if (
    PHONE_ID.test(trimmed) ||
    (PHONE_INTL.test(trimmed) && trimmed.length < 25)
  ) {
    return { type: "phone_number", confidence: 0.9, metadata: {} };
  }

  // Date / time — check BEFORE URL/email to catch ISO dates
  if (
    DATE_ISO.test(trimmed) ||
    DATE_LONG.test(trimmed) ||
    DATE_SHORT.test(trimmed) ||
    TIME_ONLY.test(trimmed)
  ) {
    return { type: "date_text", confidence: 0.9, metadata: {} };
  }

  // URL — entire text is a single URL
  if (URL_FULL.test(trimmed)) {
    return { type: "url_text", confidence: 0.95, metadata: {} };
  }

  // Email — entire text is a single email address
  if (EMAIL_FULL.test(trimmed)) {
    return { type: "email_text", confidence: 0.95, metadata: {} };
  }

  // File path
  if (
    PATH_WIN.test(trimmed) ||
    PATH_UNIX.test(trimmed) ||
    PATH_UNC.test(trimmed)
  ) {
    // Only if the text is short (a single path, not multi-line content)
    if (trimmed.split(/\r?\n/).length <= 3 && trimmed.length < 500) {
      return { type: "path_text", confidence: 0.9, metadata: {} };
    }
  }

  // Color code
  if (COLOR_HEX.test(trimmed) || COLOR_FUNC.test(trimmed)) {
    return { type: "color_code", confidence: 0.95, metadata: {} };
  }

  // Math expression (must be short, contain operators and digits, no letters)
  if (
    trimmed.length < 200 &&
    MATH_EXPR.test(trimmed) &&
    MATH_HAS_OP.test(trimmed)
  ) {
    return { type: "math_expression", confidence: 0.85, metadata: {} };
  }

  // ── 3. JSON (parse to verify) ────────────────────────────────────────────
  if (JSON_START.test(trimmed)) {
    try {
      JSON.parse(trimmed);
      return { type: "json_data", confidence: 0.95, metadata: {} };
    } catch {
      // Not valid JSON – could be code with { or array-like text, fall through
    }
  }

  // ── 4. Table data (TSV/CSV — using robust detector from table-detector.ts) ─
  if (isTSV(trimmed)) {
    return { type: "tsv_table", confidence: 0.8, metadata: {} };
  }
  if (isCSV(trimmed)) {
    return { type: "csv_table", confidence: 0.7, metadata: {} };
  }

  // ── 5. Markdown detection ────────────────────────────────────────────────
  const mdSignals = [
    MD_HEADING.test(trimmed),
    MD_BOLD_ITALIC.test(trimmed),
    MD_LIST.test(trimmed),
    MD_LINK.test(trimmed),
    MD_CODE_BLOCK.test(trimmed),
    MD_CHECKBOX.test(trimmed),
  ].filter(Boolean).length;

  if (mdSignals >= 2) {
    return { type: "md_text", confidence: 0.8, metadata: {} };
  }

  // ── 6. Source code detection (require multiple indicators) ────────────────
  const codeKeywordMatches = trimmed.match(CODE_KEYWORDS);
  const hasStructuralCode = CODE_STRUCTURAL.test(trimmed);
  const codeKeywordCount = codeKeywordMatches?.length ?? 0;

  // Need at least 2 keywords + structural pattern, OR 4+ keywords alone
  if ((codeKeywordCount >= 2 && hasStructuralCode) || codeKeywordCount >= 4) {
    const lines = trimmed.split(/\r?\n/);
    // Extra guard: if it looks like prose, don't detect as code
    if (!looksLikeProse(lines.filter((l) => l.trim().length > 0))) {
      return { type: "source_code", confidence: 0.7, metadata: {} };
    }
  }

  // ── 7. YAML detection (require multiple lines, not prose) ────────────────
  {
    const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const yamlLines = lines.filter((l) => YAML_KV.test(l));
    const hasDocStart = YAML_DOC_START.test(trimmed);

    if (
      (yamlLines.length >= 3 || (hasDocStart && yamlLines.length >= 2)) &&
      yamlLines.length / lines.length >= 0.5 &&
      !looksLikeProse(lines)
    ) {
      return { type: "yaml_data", confidence: 0.7, metadata: {} };
    }
  }

  // ── 8. TOML detection (require section headers or many key=value lines) ──
  {
    const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
    const tomlKvLines = lines.filter((l) => TOML_KV.test(l));
    const hasSections = TOML_SECTION.test(trimmed);

    if (
      (hasSections && tomlKvLines.length >= 1) ||
      (tomlKvLines.length >= 3 && tomlKvLines.length / lines.length >= 0.5)
    ) {
      if (!looksLikeProse(lines)) {
        return { type: "toml_data", confidence: 0.65, metadata: {} };
      }
    }
  }

  // ── 9. Email body detection (greeting + body pattern) ────────────────────
  {
    const emailGreeting = /^(dear|hi|hello|hai|halo|kepada|yth|to:)\s/im;
    const emailClosing =
      /^(regards|sincerely|terima\s*kasih|best|salam|cheers|thanks)\s*[,.]?\s*$/im;
    const hasGreeting = emailGreeting.test(trimmed);
    const hasClosing = emailClosing.test(trimmed);
    if (hasGreeting && hasClosing && trimmed.length > 50) {
      return { type: "email_text", confidence: 0.65, metadata: {} };
    }
  }

  // ── 10. Indonesian date prose (e.g. "Senin, 26 Februari 2026") ────────────
  if (DATE_PROSE_ID.test(trimmed) && trimmed.length < 100) {
    return { type: "date_text", confidence: 0.75, metadata: {} };
  }

  // ── 11. Address detection (multi-signal: street + ZIP/city/province) ──────
  {
    const lines = trimmed.split(/\r?\n/).filter((l) => l.trim().length > 0);
    // Addresses are typically multi-line but not too long
    if (lines.length >= 2 && lines.length <= 10) {
      const hasStreet = ADDR_STREET.test(trimmed);
      const hasCity = ADDR_CITY.test(trimmed);
      const hasZip = ADDR_ZIP.test(trimmed);
      const hasProvince = ADDR_PROVINCE.test(trimmed);
      const addrSignals = [hasStreet, hasCity, hasZip, hasProvince].filter(
        Boolean,
      ).length;

      // Need at least 2 address signals AND not look like regular prose
      if (addrSignals >= 2 && !looksLikeProse(lines)) {
        return { type: "address", confidence: 0.75, metadata: {} };
      }
      // Even 1 street signal + ZIP is enough (very specific combination)
      if (hasStreet && hasZip) {
        return { type: "address", confidence: 0.8, metadata: {} };
      }
    }
  }

  // ── 10. Text with embedded links ─────────────────────────────────────────
  {
    const urlMatches = trimmed.match(URL_EMBEDDED);
    if (urlMatches && urlMatches.length >= 1) {
      // Only if the rest of the text is substantial (not just a URL)
      const nonUrlLength = trimmed.length - urlMatches.join("").length;
      if (nonUrlLength > 20) {
        return { type: "text_with_links", confidence: 0.7, metadata: {} };
      }
      // If it's mostly URLs (multiple URLs), still return url_text
      if (urlMatches.length >= 2) {
        return { type: "url_text", confidence: 0.8, metadata: {} };
      }
    }
  }

  // ── 11. Single markdown signal (lower confidence than multi-signal) ──────
  if (mdSignals === 1 && trimmed.split(/\r?\n/).length > 1) {
    return { type: "md_text", confidence: 0.5, metadata: {} };
  }

  // ── 12. PDF-like text (strict: many short lines without punctuation) ─────
  {
    const lines = trimmed.split(/\r?\n/).filter(Boolean);
    if (lines.length > 3) {
      const shortLines = lines.filter((line) => line.length < 60);
      const noEndPunct = shortLines.filter((line) => !/[.!?:]$/.test(line));
      if (
        shortLines.length / lines.length > 0.7 &&
        noEndPunct.length / lines.length > 0.6
      ) {
        return { type: "pdf_text", confidence: 0.6, metadata: {} };
      }
    }
  }

  // ── 13. Fallback: plain text ─────────────────────────────────────────────
  return { type: "plain_text", confidence: 0.5, metadata: {} };
}
