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
