import { ContextRule, ContentType } from '../shared/types';

export const DEFAULT_RULES: ContextRule[] = [
  {
    id: 'pdf-reader-fix',
    name: 'PDF Reader -> Fix Line Breaks',
    sourceApp: 'AcroRd32.exe',
    preset: 'pdfFix',
    transforms: ['fixLineBreaks', 'normalizeWhitespace'],
    enabled: true,
  },
  {
    id: 'to-vscode-markdown',
    name: 'Paste to VS Code -> Markdown Table',
    targetApp: 'Code.exe',
    contentType: 'html_table',
    preset: 'markdownTable',
    transforms: ['tableToMarkdown'],
    enabled: true,
  },
];

export function matchContextRule(
  rules: ContextRule[],
  sourceApp?: string,
  targetApp?: string,
  contentType?: ContentType,
): ContextRule | null {
  return (
    rules.find((rule) => {
      if (!rule.enabled) return false;
      if (rule.sourceApp && rule.sourceApp !== sourceApp) return false;
      if (rule.targetApp && rule.targetApp !== targetApp) return false;
      if (rule.contentType && rule.contentType !== contentType) return false;
      return true;
    }) ?? null
  );
}
