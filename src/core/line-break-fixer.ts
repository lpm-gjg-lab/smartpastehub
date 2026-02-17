export interface FixerOptions {
  minLineLength: number;
  maxLineLength: number;
  preserveListItems: boolean;
  preserveHeadings: boolean;
  language: 'id' | 'en';
}

const DEFAULT_OPTIONS: FixerOptions = {
  minLineLength: 40,
  maxLineLength: 80,
  preserveListItems: true,
  preserveHeadings: true,
  language: 'id',
};

export function fixLineBreaks(
  text: string,
  options: Partial<FixerOptions> = {},
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const lines = text.split(/\r?\n/);
  const result: string[] = [];

  for (let i = 0; i < lines.length; i += 1) {
    const line = (lines[i] ?? '').trimEnd();
    const next = lines[i + 1]?.trimStart() ?? '';

    if (line === '') {
      result.push('');
      continue;
    }

    const endsWithPunct = /[.!?:]$/.test(line);
    const isListItem = /^\s*([-*•]|\d+\.)\s+/.test(line);
    const shortLine = line.length < opts.minLineLength;
    const nextStartsCapital = /^[A-Z]/.test(next);
    const isHeading = opts.preserveHeadings && shortLine && nextStartsCapital;

    if (endsWithPunct || (opts.preserveListItems && isListItem) || isHeading) {
      result.push(line);
      continue;
    }

    const isWrapArtifact =
      line.length < opts.maxLineLength && !nextStartsCapital;
    if (isWrapArtifact && next) {
      result.push(`${line} ${next}`.trim());
      i += 1;
      continue;
    }

    result.push(line);
  }

  return result.join('\n').replace(/\n{3,}/g, '\n\n');
}
