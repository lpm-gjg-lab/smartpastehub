import { load } from 'cheerio';
import TurndownService from 'turndown';

export interface StripOptions {
  keepBold: boolean;
  keepItalic: boolean;
  keepLists: boolean;
  keepLinks: boolean;
  keepHeadings: boolean;
  keepLineBreaks: boolean;
}

export const PRESETS: Record<string, StripOptions> = {
  plainText: {
    keepBold: false,
    keepItalic: false,
    keepLists: false,
    keepLinks: false,
    keepHeadings: false,
    keepLineBreaks: true,
  },
  keepStructure: {
    keepBold: true,
    keepItalic: true,
    keepLists: true,
    keepLinks: true,
    keepHeadings: true,
    keepLineBreaks: true,
  },
};

export function stripHTML(html: string, options: StripOptions): string {
  const $ = load(html);
  $('style,script').remove();

  const service = new TurndownService({
    headingStyle: 'atx',
    bulletListMarker: '-',
    codeBlockStyle: 'fenced',
  });

  if (!options.keepBold) {
    service.remove(['strong', 'b']);
  }
  if (!options.keepItalic) {
    service.remove(['em', 'i']);
  }
  if (!options.keepLists) {
    service.remove(['ul', 'ol', 'li']);
  }
  if (!options.keepLinks) {
    service.addRule('stripLinks', {
      filter: 'a',
      replacement: (content: string) => content,
    });
  }
  if (!options.keepHeadings) {
    service.remove(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
  }

  const markdown = service.turndown($.html());
  if (!options.keepLineBreaks) {
    return markdown.replace(/\n{2,}/g, ' ');
  }
  return markdown.trim();
}
