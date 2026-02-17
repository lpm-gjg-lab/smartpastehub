import { describe, it, expect } from 'vitest';
import { fixLineBreaks } from '../../src/core/line-break-fixer';

describe('PDF Line-Break Fixer', () => {
  it('merges lines without punctuation', () => {
    const input = 'Hello world\nthis is a test';
    const result = fixLineBreaks(input);
    expect(result).toContain('Hello world this is a test');
  });
});
