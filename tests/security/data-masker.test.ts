import { describe, it, expect } from 'vitest';
import { maskData } from '../../src/security/data-masker';

describe('Data Masker', () => {
  it('full mask replaces characters', () => {
    const result = maskData('user@example.com', [{ type: 'email', value: 'user@example.com', startIndex: 0, endIndex: 16 }], 'full');
    expect(result).toContain('*');
  });
});
