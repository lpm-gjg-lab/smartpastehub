export interface RegexRule {
  name: string;
  pattern: string;
  replacement: string;
  flags?: string;
  enabled: boolean;
}

export function applyRegexRules(text: string, rules: RegexRule[]): string {
  return rules.reduce((acc, rule) => {
    if (!rule.enabled) return acc;
    const re = new RegExp(rule.pattern, rule.flags ?? 'g');
    return acc.replace(re, rule.replacement);
  }, text);
}
