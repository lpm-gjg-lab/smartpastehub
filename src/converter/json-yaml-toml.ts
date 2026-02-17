import yaml from 'js-yaml';
import toml from 'toml';

export type DataFormat = 'json' | 'yaml' | 'toml';

export function detectFormat(text: string): DataFormat | null {
  const trimmed = text.trim();
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'json';
  if (/(^|\n)\s*\w+\s*:\s*.+/.test(trimmed)) return 'yaml';
  if (/(^|\n)\s*\w+\s*=\s*.+/.test(trimmed)) return 'toml';
  return null;
}

export function convert(text: string, from: DataFormat, to: DataFormat): string {
  let data: unknown;
  if (from === 'json') data = JSON.parse(text);
  if (from === 'yaml') data = yaml.load(text);
  if (from === 'toml') data = toml.parse(text);

  if (to === 'json') return JSON.stringify(data, null, 2);
  if (to === 'yaml') return yaml.dump(data);
  if (to === 'toml') return Object.entries(data as Record<string, unknown>)
    .map(([k, v]) => `${k} = ${JSON.stringify(v)}`)
    .join('\n');
  return text;
}

export function autoConvert(text: string, targetFormat: DataFormat): string {
  const detected = detectFormat(text);
  if (!detected) return text;
  return convert(text, detected, targetFormat);
}
