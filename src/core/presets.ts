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
];
