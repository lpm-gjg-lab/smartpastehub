import { detectContentType } from './content-detector';
import { stripHTML } from './html-stripper';
import { fixLineBreaks } from './line-break-fixer';
import { normalizeWhitespace } from './whitespace-normalizer';
import { toMarkdown, parseHTMLTable, parseCSV, parseTSV } from './table-converter';
import { detectSensitiveData } from '../security/sensitive-detector';
import { logger } from '../shared/logger';
import { CleanResult, ClipboardContent, ContentType } from '../shared/types';

function applyTransforms(content: ClipboardContent, type: ContentType): string {
  if (type === 'styled_html' || type === 'structured_html') {
    return stripHTML(content.html ?? content.text, {
      keepBold: true,
      keepItalic: true,
      keepLists: true,
      keepLinks: true,
      keepHeadings: true,
      keepLineBreaks: true,
    });
  }
  if (type === 'pdf_text') {
    return fixLineBreaks(content.text);
  }
  if (type === 'html_table') {
    const table = parseHTMLTable(content.html ?? content.text);
    return toMarkdown(table);
  }
  if (type === 'csv_table') {
    const table = parseCSV(content.text);
    return toMarkdown(table);
  }
  if (type === 'tsv_table') {
    const table = parseTSV(content.text);
    return toMarkdown(table);
  }
  return normalizeWhitespace(content.text);
}

export async function cleanContent(content: ClipboardContent): Promise<CleanResult> {
  try {
    const detection = detectContentType(content.text, content.html);
    let cleaned = content.text;

    try {
      cleaned = applyTransforms(content, detection.type);
    } catch (error) {
      logger.warn('Cleaning failed, using raw text', { error, type: detection.type });
      cleaned = content.text;
    }

    try {
      const matches = detectSensitiveData(cleaned);
      if (matches.length > 0) {
        return { cleaned, securityAlert: { matches, text: cleaned } };
      }
    } catch (error) {
      logger.warn('Security scan failed, skipping', { error });
    }

    return { cleaned, securityAlert: null };
  } catch (error) {
    logger.error('Complete cleaning pipeline failed', { error });
    return { cleaned: content.text, securityAlert: null, error };
  }
}
