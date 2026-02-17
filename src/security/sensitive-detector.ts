import { SensitiveMatch } from '../shared/types';

const PII_PATTERNS: Record<string, RegExp> = {
  email: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  phone_id: /(?:\+62|62|0)[\s.-]?8[1-9][\d\s.-]{7,12}/g,
  phone_intl: /\+\d{1,3}[\s.-]?\d{3,4}[\s.-]?\d{3,4}[\s.-]?\d{0,4}/g,
  nik: /\b\d{2}(?:0[1-9]|[1-7]\d)\d{2}(?:0[1-9]|[12]\d|3[01])(?:0[1-9]|1[012])\d{6}\b/g,
  credit_card: /\b(?:4\d{3}|5[1-5]\d{2}|6011|3[47]\d{2})[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/g,
  npwp: /\b\d{2}\.?\d{3}\.?\d{3}\.?\d-?\d{3}\.?\d{3}\b/g,
  passport_id: /\b[A-Z]\d{7}\b/g,
  bank_account: /\b\d{8,16}\b/g,
  ip_address: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
  aws_key: /(?:AKIA|ASIA)[A-Z0-9]{16}/g,
};

export function detectSensitiveData(text: string): SensitiveMatch[] {
  const matches: SensitiveMatch[] = [];
  for (const [type, pattern] of Object.entries(PII_PATTERNS)) {
    for (const match of text.matchAll(pattern)) {
      const value = match[0];
      const startIndex = match.index ?? 0;
      matches.push({
        type: type as SensitiveMatch['type'],
        value,
        startIndex,
        endIndex: startIndex + value.length,
      });
    }
  }
  return matches;
}
