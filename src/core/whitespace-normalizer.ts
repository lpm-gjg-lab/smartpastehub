export function normalizeWhitespace(text: string): string {
  return text.replace(/\s+$/gm, '').replace(/[\t ]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}
