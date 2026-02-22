import { describe, it, expect, vi } from 'vitest';

vi.mock('electron', () => ({
  app: { getPath: () => './.logs' }
}));

import { cleanContent } from '../../src/core/cleaner';

describe('Core Cleaner Pipeline', () => {
  it('should clean plain text normally', async () => {
    const input = { text: 'Some text   with   extra  spaces' };
    const result = await cleanContent(input);
    expect(result.cleaned).toBe('Some text with extra spaces');
  });

  it('should strip HTML but keep structural tags if appropriate', async () => {
    const input = {
      text: 'Bold text',
      html: '<b>Bold</b> <span style="color: red">text</span>'
    };
    const result = await cleanContent(input);
    expect(result.cleaned).toContain('**Bold** text');
  });

  it('should detect sensitive data and return an alert', async () => {
    const input = {
      text: 'My phone number is 081234567890.'
    };
    const result = await cleanContent(input);
    expect(result.securityAlert).not.toBeNull();
    expect(result.securityAlert?.matches.length).toBeGreaterThan(0);
  });
});
