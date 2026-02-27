/**
 * Detect whether text is likely tab-separated values (TSV).
 *
 * Heuristics:
 * 1. At least 2 non-empty lines.
 * 2. At least 2 lines must contain tabs.
 * 3. The number of tabs per line should be consistent across tabbed lines.
 * 4. At least 80% of non-empty lines should contain tabs.
 * 5. If the text looks like natural-language prose, reject it.
 */
export function isTSV(text: string): boolean {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return false;

  // Reject if it looks like natural-language prose
  if (looksLikeProse(lines)) return false;

  const tabCounts = lines.map((line) => (line.match(/\t/g) || []).length);
  const linesWithTabs = tabCounts.filter((c) => c > 0);

  // Need at least 2 lines with tabs
  if (linesWithTabs.length < 2) return false;

  // Tab counts should be consistent (all tabbed lines have the same # of tabs)
  const isConsistent = linesWithTabs.every((c) => c === linesWithTabs[0]);
  if (!isConsistent) return false;

  // At least 80% of lines should have tabs
  if (linesWithTabs.length / lines.length < 0.8) return false;

  // Each line should produce at least 2 columns
  if ((linesWithTabs[0] ?? 0) < 1) return false;

  return true;
}

/**
 * Detect whether text is likely comma-separated values (CSV).
 *
 * Heuristics:
 * 1. At least 2 non-empty lines.
 * 2. At least 2 lines must contain commas.
 * 3. The number of commas per line should be consistent.
 * 4. At least 80% of non-empty lines should contain commas.
 * 5. If most commas are followed by a space (grammatical commas), reject.
 * 6. If the text looks like natural-language prose, reject.
 * 7. If more than half of the lines end with sentence-ending punctuation, reject.
 */
export function isCSV(text: string): boolean {
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length < 2) return false;

  // Reject if it looks like natural-language prose
  if (looksLikeProse(lines)) return false;

  const commaCounts = lines.map((line) => (line.match(/,/g) || []).length);
  const linesWithCommas = commaCounts.filter((c) => c > 0);

  // Need at least 2 lines with commas
  if (linesWithCommas.length < 2) return false;

  // If more than half of lines end with sentence-ending punctuation → prose
  const endsWithPunct = lines.filter((line) =>
    /[.!?;:]\s*$/.test(line.trim()),
  ).length;
  if (endsWithPunct / lines.length > 0.4) return false;

  // Comma counts should be consistent
  const isConsistent = linesWithCommas.every(
    (c) => c === linesWithCommas[0],
  );
  if (!isConsistent) return false;

  // At least 80% of lines should have commas
  if (linesWithCommas.length / lines.length < 0.8) return false;

  // If every comma is followed by a space → grammatical, not CSV separator
  const allCommas = text.match(/,/g) || [];
  const grammarCommas = text.match(/,\s/g) || [];
  if (
    allCommas.length > 0 &&
    grammarCommas.length / allCommas.length >= 0.9
  ) {
    return false;
  }

  return true;
}

/**
 * Check whether the text likely consists of natural-language prose.
 *
 * We look for:
 * - Average word count per line >= 5 (sentences tend to be longer)
 * - Presence of common sentence markers (capital letters, periods, question marks)
 * - Lines that end with typical sentence-ending punctuation
 */
export function looksLikeProse(lines: string[]): boolean {
  if (lines.length === 0) return false;

  // Count lines that look like sentences (start with uppercase/letter, end with punctuation)
  const sentenceLikeLines = lines.filter((line) => {
    const trimmed = line.trim();
    // Starts with letter and ends with clear sentence-ending punctuation
    // Note: `:` excluded because it's ambiguous (Python, YAML, prose)
    const startsWithLetter = /^[A-Za-z\u00C0-\u024F]/.test(trimmed);
    const endsWithPunct = /[.!?,;]$/.test(trimmed);
    // Has many words AND contains common prose words (articles, prepositions)
    const wordCount = trimmed.split(/\s+/).length;
    const hasProseWords = /\b(the|a|an|is|are|was|were|and|or|but|for|to|in|on|at|of|with|from|by|this|that|it|i|we|you|they|he|she|ini|itu|dan|atau|di|ke|dari|yang|untuk|dengan|ada|sudah|akan|bisa|harus|tidak|kami|kita|saya|anda)\b/i.test(trimmed);
    return (startsWithLetter && endsWithPunct) || (wordCount >= 7 && hasProseWords);
  });

  // If most lines look like sentences → prose
  if (sentenceLikeLines.length / lines.length >= 0.6) {
    return true;
  }

  // Also check average word count — CSV rows typically have short "cells",
  // while prose has longer stretches of text
  const totalWords = lines.reduce(
    (sum, line) => sum + line.trim().split(/\s+/).length,
    0,
  );
  const avgWordsPerLine = totalWords / lines.length;
  if (avgWordsPerLine >= 10) {
    return true;
  }

  return false;
}
