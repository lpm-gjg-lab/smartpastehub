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
  {
    // Paste code/data into terminal — fullwidth + smart quotes must be cleaned
    id: 'to-terminal-code',
    name: 'Paste Code to Terminal -> Unicode Clean',
    targetApp: 'WindowsTerminal.exe',
    contentType: 'source_code',
    preset: 'codePassthrough',
    transforms: ['unicodeClean'],
    enabled: true,
  },
  {
    id: 'to-terminal-json',
    name: 'Paste JSON/Data to Terminal -> Unicode Clean',
    targetApp: 'WindowsTerminal.exe',
    contentType: 'json_data',
    preset: 'codePassthrough',
    transforms: ['unicodeClean'],
    enabled: true,
  },
  {
    // Outlook — email body detected, strip quoted reply + junk
    id: 'from-outlook-email',
    name: 'Copy from Outlook -> Email Clean',
    sourceApp: 'OUTLOOK.EXE',
    contentType: 'email_text',
    preset: 'emailClean',
    transforms: ['emailClean', 'normalizeWhitespace'],
    enabled: true,
  },
  {
    id: 'from-thunderbird-email',
    name: 'Copy from Thunderbird -> Email Clean',
    sourceApp: 'thunderbird.exe',
    contentType: 'email_text',
    preset: 'emailClean',
    transforms: ['emailClean', 'normalizeWhitespace'],
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
