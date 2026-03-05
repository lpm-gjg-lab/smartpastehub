/**
 * Options for sorting lines of text.
 */
export interface SortLinesOptions {
  direction?: "asc" | "desc";
  ignoreCase?: boolean;
  numeric?: boolean;
  removeDuplicates?: boolean;
}

interface SortableLine {
  raw: string;
  key: string;
}

const MARKDOWN_LIST_MARKER = /^\s*(?:[-*+]\s+|\d+[.)]\s+)(.*)$/;

function getSortKey(line: string): string {
  const markerMatch = line.match(MARKDOWN_LIST_MARKER);
  if (markerMatch) {
    return (markerMatch[1] ?? "").trim();
  }
  return line.trim();
}

/**
 * Sort text line-by-line.
 *
 * Supports plain lines and markdown list items. For markdown list items,
 * sorting is based on the content after the list marker while preserving each
 * line's original marker style.
 */
export function sortLines(
  text: string,
  options: SortLinesOptions = {},
): string {
  if (!text) {
    return text;
  }

  const {
    direction = "asc",
    ignoreCase = true,
    numeric = false,
    removeDuplicates = false,
  } = options;

  const trailingNewline = /\r?\n$/.test(text);
  const normalized = text.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");

  const sortableLines: SortableLine[] = lines.map((line) => ({
    raw: line,
    key: getSortKey(line),
  }));

  const dedupedLines = removeDuplicates
    ? sortableLines.filter((line, index, all) => {
        const current = ignoreCase ? line.key.toLocaleLowerCase() : line.key;
        return (
          all.findIndex((candidate) => {
            const candidateKey = ignoreCase
              ? candidate.key.toLocaleLowerCase()
              : candidate.key;
            return candidateKey === current;
          }) === index
        );
      })
    : sortableLines;

  const collator = new Intl.Collator(undefined, {
    numeric,
    sensitivity: ignoreCase ? "accent" : "variant",
  });

  dedupedLines.sort((a, b) => {
    const comparison = collator.compare(a.key, b.key);
    return direction === "desc" ? -comparison : comparison;
  });

  const result = dedupedLines.map((line) => line.raw).join("\n");
  return trailingNewline && result ? `${result}\n` : result;
}
