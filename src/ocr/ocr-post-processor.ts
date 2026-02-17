export function cleanOCRText(text: string): string {
  return text.replace(/\s+$/gm, '').replace(/\n{3,}/g, '\n\n').trim();
}
