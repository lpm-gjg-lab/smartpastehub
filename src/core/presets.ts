import { StripOptions, PRESETS as HTML_PRESETS } from './html-stripper';

export interface PresetDefinition {
  id: string;
  label: string;
  htmlOptions?: StripOptions;
  transforms: string[];
}

export const PRESETS: PresetDefinition[] = [
  {
    id: 'plainText',
    label: 'Plain Text',
    htmlOptions: HTML_PRESETS['plainText'],
    transforms: ['stripHtml', 'normalizeWhitespace'],
  },
  {
    id: 'keepStructure',
    label: 'Keep Structure',
    htmlOptions: HTML_PRESETS['keepStructure'],
    transforms: ['stripHtml'],
  },
  {
    id: 'pdfFix',
    label: 'PDF Fix',
    transforms: ['fixLineBreaks', 'normalizeWhitespace'],
  },
  {
    id: 'markdownTable',
    label: 'Markdown Table',
    transforms: ['tableToMarkdown'],
  },
  {
    // source_code, json, yaml, toml — unicode-clean only, no whitespace changes
    id: 'codePassthrough',
    label: 'Code / Data Passthrough',
    transforms: ['unicodeClean'],
  },
  {
    // email body — strip quoted reply + trailing junk + unicode clean
    id: 'emailClean',
    label: 'Email Clean',
    transforms: ['emailClean', 'normalizeWhitespace'],
  },
];
