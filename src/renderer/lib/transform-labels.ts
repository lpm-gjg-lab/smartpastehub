import type { TransformLabel } from '../types';

const TRANSFORM_LABELS: Record<string, TransformLabel> = {
  mojibake: {
    id: 'mojibake',
    label: 'Mojibake Repair',
    description: 'Fixed garbled encoding',
    icon: '🔧',
  },
  rtl: {
    id: 'rtl',
    label: 'RTL Fix',
    description: 'Fixed right-to-left text',
    icon: '↔️',
  },
  emoji: {
    id: 'emoji',
    label: 'Emoji Fix',
    description: 'Fixed emoji compatibility',
    icon: '😊',
  },
  homoglyph: {
    id: 'homoglyph',
    label: 'Homoglyph Detection',
    description: 'Detected lookalike characters',
    icon: '🔍',
  },
  'bank-formatter': {
    id: 'bank-formatter',
    label: 'Bank Format',
    description: 'Formatted bank account numbers',
    icon: '🏦',
  },
  'resi-detector': {
    id: 'resi-detector',
    label: 'Tracking Number',
    description: 'Detected shipment tracking',
    icon: '📦',
  },
  'ecommerce-extractor': {
    id: 'ecommerce-extractor',
    label: 'E-Commerce',
    description: 'Extracted marketplace data',
    icon: '🛒',
  },
  'data-transpose': {
    id: 'data-transpose',
    label: 'Data Transpose',
    description: 'Transposed data layout',
    icon: '🔄',
  },
  'number-formatter': {
    id: 'number-formatter',
    label: 'Number Format',
    description: 'Formatted numbers',
    icon: '🔢',
  },
  'phone-formatter': {
    id: 'phone-formatter',
    label: 'Phone Format',
    description: 'Formatted phone numbers',
    icon: '📱',
  },
  'date-formatter': {
    id: 'date-formatter',
    label: 'Date Format',
    description: 'Formatted dates',
    icon: '📅',
  },
  'stack-trace-parser': {
    id: 'stack-trace-parser',
    label: 'Stack Trace',
    description: 'Parsed stack trace',
    icon: '🐛',
  },
  'markdown-converter': {
    id: 'markdown-converter',
    label: 'Markdown',
    description: 'Converted to Markdown',
    icon: '📝',
  },
  'sheets-splitter': {
    id: 'sheets-splitter',
    label: 'Sheets Split',
    description: 'Split spreadsheet data',
    icon: '📊',
  },
  'invoice-parser': {
    id: 'invoice-parser',
    label: 'Invoice',
    description: 'Parsed invoice data',
    icon: '🧾',
  },
  policy: {
    id: 'policy',
    label: 'Policy Applied',
    description: 'Content policy enforced',
    icon: '🛡️',
  },
  'json-formatter': {
    id: 'json-formatter',
    label: 'JSON Format',
    description: 'Pretty-printed JSON/YAML/TOML',
    icon: '📋',
  },
  'code-indent-fixer': {
    id: 'code-indent-fixer',
    label: 'Indent Fix',
    description: 'Fixed mixed indentation',
    icon: '⇥',
  },
  'duplicate-line-remover': {
    id: 'duplicate-line-remover',
    label: 'Dedup Lines',
    description: 'Removed duplicate lines',
    icon: '🧹',
  },
  'timestamp-converter': {
    id: 'timestamp-converter',
    label: 'Timestamp',
    description: 'Converted timestamp format',
    icon: '⏱️',
  },
  'path-converter': {
    id: 'path-converter',
    label: 'Path Convert',
    description: 'Converted file path format',
    icon: '📁',
  },
  'base64-codec': {
    id: 'base64-codec',
    label: 'Base64 Decode',
    description: 'Decoded Base64 content',
    icon: '🔓',
  },
  'color-converter': {
    id: 'color-converter',
    label: 'Color Convert',
    description: 'Converted color format',
    icon: '🎨',
  },
  'math-evaluator': {
    id: 'math-evaluator',
    label: 'Math Result',
    description: 'Evaluated math expression',
    icon: '🧮',
  },
  'sensitive-masker': {
    id: 'sensitive-masker',
    label: 'PII Masked',
    description: 'Masked sensitive data',
    icon: '🔒',
  },
  'case-converter': {
    id: 'case-converter',
    label: 'Case Convert',
    description: 'Converted text case',
    icon: '🔤',
  },
  'list-sorter': {
    id: 'list-sorter',
    label: 'List Sort',
    description: 'Sorted list items',
    icon: '↕️',
  },
  'slug-generator': {
    id: 'slug-generator',
    label: 'Slug',
    description: 'Generated URL slug',
    icon: '🔗',
  },
};

export function getTransformLabel(changeId: string): TransformLabel {
  return (
    TRANSFORM_LABELS[changeId] ?? {
      id: changeId,
      label: changeId
        .replace(/-/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      description: `Applied ${changeId} transform`,
      icon: '✨',
    }
  );
}

export function getTransformLabels(changes: string[]): TransformLabel[] {
  return changes.map(getTransformLabel);
}
