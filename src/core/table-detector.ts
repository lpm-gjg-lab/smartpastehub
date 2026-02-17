export function isTSV(text: string): boolean {
  return /\t/.test(text) && text.split(/\r?\n/).length > 1;
}

export function isCSV(text: string): boolean {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return false;
  const first = (lines[0] ?? '').split(',');
  return first.length > 1;
}
