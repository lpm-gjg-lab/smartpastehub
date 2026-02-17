import { MaskMode, SensitiveMatch } from '../shared/types';

function maskValue(value: string, mode: Exclude<MaskMode, 'skip'>): string {
  if (mode === 'full') {
    return value.replace(/[A-Za-z0-9]/g, '*');
  }
  const chars = value.split('');
  const keepStart = Math.max(1, Math.floor(chars.length * 0.2));
  const keepEnd = Math.max(1, Math.floor(chars.length * 0.2));
  return chars
    .map((ch, i) => {
      if (i < keepStart || i >= chars.length - keepEnd) return ch;
      return ch === ' ' || ch === '-' || ch === '.' || ch === '@' ? ch : '*';
    })
    .join('');
}

export function maskData(text: string, matches: SensitiveMatch[], mode: MaskMode): string {
  if (mode === 'skip') return text;
  const sorted = [...matches].sort((a, b) => a.startIndex - b.startIndex);
  let result = '';
  let lastIndex = 0;
  for (const match of sorted) {
    result += text.slice(lastIndex, match.startIndex);
    result += maskValue(match.value, mode);
    lastIndex = match.endIndex;
  }
  result += text.slice(lastIndex);
  return result;
}
