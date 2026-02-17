export interface Template {
  id: string;
  name: string;
  content: string;
  variables: string[];
  tags: string[];
}

export function parseTemplate(content: string): string[] {
  const matches = content.match(/\{(\w+)\}/g) ?? [];
  return Array.from(new Set(matches.map((match) => match.replace(/[{}]/g, ''))));
}

export function fillTemplate(template: Template, values: Record<string, string>): string {
  return template.content.replace(/\{(\w+)\}/g, (_, key: string) => values[key] ?? `{${key}}`);
}
