import { describe, it, expect } from 'vitest';
import { convert } from '../../src/converter/json-yaml-toml';

describe('JSON/YAML/TOML Converter', () => {
  it('converts JSON to YAML', () => {
    const json = '{"a":1}';
    const yaml = convert(json, 'json', 'yaml');
    expect(yaml).toContain('a: 1');
  });
});
