import { DetectionResult } from '../shared/types';

const JSON_START = /^(\s*[[{])/;
const YAML_HINT = /^\s*\w+\s*:\s*.+/m;
const TOML_HINT = /^\s*\w+\s*=\s*.+/m;
const CODE_HINT =
  /\b(function|class|const|let|var|def|import|export|#include)\b/;
const TABLE_TSV = /\t/;
const TABLE_CSV = /,.*\n.*,/;

export function detectContentType(
  text: string,
  html?: string,
): DetectionResult {
  const trimmed = text.trim();

  if (html) {
    if (/<table[\s>]/i.test(html)) {
      return { type: 'html_table', confidence: 0.95, metadata: {} };
    }
    if (/<(b|strong|i|em|span|font|style)[\s>]/i.test(html)) {
      return { type: 'styled_html', confidence: 0.8, metadata: {} };
    }
    if (/<(p|div|ul|ol|li|h1|h2|h3|h4|h5|h6)[\s>]/i.test(html)) {
      return { type: 'structured_html', confidence: 0.7, metadata: {} };
    }
  }

  if (TABLE_TSV.test(trimmed)) {
    return { type: 'tsv_table', confidence: 0.8, metadata: {} };
  }
  if (TABLE_CSV.test(trimmed)) {
    return { type: 'csv_table', confidence: 0.7, metadata: {} };
  }
  if (JSON_START.test(trimmed)) {
    try {
      JSON.parse(trimmed);
      return { type: 'json_data', confidence: 0.9, metadata: {} };
    } catch {
      return { type: 'plain_text', confidence: 0.4, metadata: {} };
    }
  }
  if (YAML_HINT.test(trimmed)) {
    return { type: 'yaml_data', confidence: 0.6, metadata: {} };
  }
  if (TOML_HINT.test(trimmed)) {
    return { type: 'toml_data', confidence: 0.6, metadata: {} };
  }
  if (CODE_HINT.test(trimmed)) {
    return { type: 'source_code', confidence: 0.6, metadata: {} };
  }

  const lines = trimmed.split(/\r?\n/).filter(Boolean);
  const shortLines = lines.filter((line) => line.length < 60);
  const noEndPunct = shortLines.filter((line) => !/[.!?:]$/.test(line));
  if (lines.length > 3 && noEndPunct.length / lines.length > 0.6) {
    return { type: 'pdf_text', confidence: 0.7, metadata: {} };
  }

  return { type: 'plain_text', confidence: 0.5, metadata: {} };
}
