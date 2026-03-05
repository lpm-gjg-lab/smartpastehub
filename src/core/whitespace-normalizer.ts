export function normalizeWhitespace(text: string): string {
  // Step 1: Normalize CRLF to LF
  let result = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // Step 2: Trim trailing spaces/tabs on each line
  result = result.replace(/[ \t]+$/gm, '');

  // Step 3: Collapse 3+ blank lines into double newline (paragraph break)
  result = result.replace(/\n{3,}/g, '\n\n');

  // Step 4: Split into paragraphs by double newline, then within each paragraph
  // merge single newlines (word-wrap artifacts) into a single space.
  result = result
    .split(/\n\n/)
    .map((paragraph) =>
      paragraph
        .split('\n')
        .map((line) => line.trim())
        .filter((line) => line.length > 0)
        .join(' ')
    )
    .join('\n\n');

  // Step 5: Collapse multiple spaces/tabs into one space
  result = result.replace(/[ \t]{2,}/g, ' ');

  return result.trim();
}
