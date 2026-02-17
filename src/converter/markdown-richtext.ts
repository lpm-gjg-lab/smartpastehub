import { marked } from 'marked';
import TurndownService from 'turndown';

export function markdownToRichText(markdown: string): string {
  return marked.parse(markdown) as string;
}

export function richTextToMarkdown(html: string): string {
  const service = new TurndownService({ codeBlockStyle: 'fenced' });
  return service.turndown(html);
}
