import { describe, it, expect } from 'vitest';
import { stripHTML, PRESETS } from '../../src/core/html-stripper';

describe('HTML Stripper', () => {
  it('strips inline styles in plainText preset', () => {
    const html = '<p style="color:red"><strong>Hi</strong> <em>there</em></p>';
    const result = stripHTML(html, PRESETS.plainText);
    expect(result).toContain('Hi');
    expect(result).not.toContain('<strong>');
  });

  it('keeps bold in keepStructure preset', () => {
    const html = '<p><strong>Hi</strong></p>';
    const result = stripHTML(html, PRESETS.keepStructure);
    expect(result).toContain('**Hi**');
  });
});
