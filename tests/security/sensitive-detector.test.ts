import { describe, it, expect } from 'vitest';
import { detectSensitiveData } from '../../src/security/sensitive-detector';

describe('Sensitive Data Detector', () => {
  it('detects email addresses', () => {
    const matches = detectSensitiveData('Contact me at user@example.com');
    expect(matches.some((m) => m.type === 'email')).toBe(true);
  });
});
