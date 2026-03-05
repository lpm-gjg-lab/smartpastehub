/**
 * Removes duplicate lines while preserving first-seen order.
 */

export interface RemoveDuplicateLineOptions {
  ignoreCase?: boolean;
  ignoreWhitespace?: boolean;
  preserveBlankLines?: boolean;
}

function normalizeLine(
  line: string,
  options: RemoveDuplicateLineOptions,
): string {
  let normalized = line;

  if (options.ignoreWhitespace) {
    normalized = normalized.trim().replace(/\s+/g, " ");
  }

  if (options.ignoreCase) {
    normalized = normalized.toLowerCase();
  }

  return normalized;
}

/**
 * Removes duplicate lines from text.
 * Keeps the first occurrence and removes subsequent duplicates.
 */
export function removeDuplicateLines(
  text: string,
  options: RemoveDuplicateLineOptions = {},
): string {
  const { preserveBlankLines = true } = options;
  const lines = text.split(/\r?\n/);
  const seen = new Set<string>();
  const output: string[] = [];

  for (const line of lines) {
    if (line.trim() === "" && preserveBlankLines) {
      output.push(line);
      continue;
    }

    const key = normalizeLine(line, options);
    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    output.push(line);
  }

  return output.join("\n");
}
