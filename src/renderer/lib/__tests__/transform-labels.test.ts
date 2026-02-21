import { describe, it, expect } from 'vitest';
import { getTransformLabel, getTransformLabels } from '../transform-labels';

describe('transform-labels', () => {
  const knownLabels = [
    ['mojibake', 'Mojibake Repair'],
    ['rtl', 'RTL Fix'],
    ['emoji', 'Emoji Fix'],
    ['homoglyph', 'Homoglyph Detection'],
    ['bank-formatter', 'Bank Format'],
    ['resi-detector', 'Tracking Number'],
    ['ecommerce-extractor', 'E-Commerce'],
    ['data-transpose', 'Data Transpose'],
    ['number-formatter', 'Number Format'],
    ['phone-formatter', 'Phone Format'],
    ['date-formatter', 'Date Format'],
    ['stack-trace-parser', 'Stack Trace'],
    ['markdown-converter', 'Markdown'],
    ['sheets-splitter', 'Sheets Split'],
    ['invoice-parser', 'Invoice'],
    ['policy', 'Policy Applied'],
  ];

  it.each(knownLabels)(
    'should return correct label for %s',
    (id, expectedLabel) => {
      const result = getTransformLabel(id);
      expect(result.id).toBe(id);
      expect(result.label).toBe(expectedLabel);
    },
  );

  it('should return fallback for unknown change id', () => {
    const unknownId = 'custom-transform';
    const result = getTransformLabel(unknownId);
    expect(result.id).toBe(unknownId);
    expect(result.label).toBe('Custom Transform');
    expect(result.description).toBe('Applied custom-transform transform');
    expect(result.icon).toBe('✨');
  });

  it('should handle getTransformLabels with array input', () => {
    const changes = ['mojibake', 'unknown-one', 'rtl'];
    const results = getTransformLabels(changes);

    expect(results).toHaveLength(3);
    expect(results[0]?.label).toBe('Mojibake Repair');
    expect(results[1]?.label).toBe('Unknown One');
    expect(results[2]?.label).toBe('RTL Fix');
  });
});
