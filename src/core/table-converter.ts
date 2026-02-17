import { load } from 'cheerio';
import type { Element } from 'domhandler';

export interface TableData {
  headers: string[];
  rows: string[][];
  alignment?: Array<'left' | 'center' | 'right'>;
}

export function parseHTMLTable(html: string): TableData {
  const $ = load(html);
  const headers: string[] = [];
  const rows: string[][] = [];

  $('table tr').each((_: number, tr: Element) => {
    const cells = $(tr).find('th, td');
    const row: string[] = [];
    cells.each((__: number, cell: Element) => {
      row.push($(cell).text().trim());
    });
    if ($(tr).find('th').length > 0 && headers.length === 0) {
      headers.push(...row);
    } else if (row.length > 0) {
      rows.push(row);
    }
  });

  return { headers, rows };
}

export function parseTSV(text: string): TableData {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const rows = lines.map((line) => line.split('\t').map((cell) => cell.trim()));
  const [headers, ...body] = rows;
  return { headers: headers ?? [], rows: body };
}

export function parseCSV(text: string): TableData {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const rows = lines.map((line) => line.split(',').map((cell) => cell.trim()));
  const [headers, ...body] = rows;
  return { headers: headers ?? [], rows: body };
}

export function toMarkdown(table: TableData): string {
  const headers = table.headers.length ? table.headers : (table.rows[0] ?? []);
  const rows = table.headers.length ? table.rows : table.rows.slice(1);
  const headerRow = `| ${headers.join(' | ')} |`;
  const separator = `| ${headers.map(() => '---').join(' | ')} |`;
  const body = rows.map((row) => `| ${row.join(' | ')} |`).join('\n');
  return [headerRow, separator, body].filter(Boolean).join('\n');
}

export function toPlainText(table: TableData, padding = 2): string {
  const rows = [table.headers, ...table.rows].filter((row) => row.length > 0);
  const firstRow = rows[0] ?? [];
  const widths = firstRow.map((_, i) =>
    Math.max(...rows.map((row) => (row[i] ?? '').length)),
  );
  return rows
    .map((row) =>
      row
        .map((cell, i) => {
          const width = widths[i] ?? 0;
          return cell.padEnd(width + padding, ' ');
        })
        .join('')
        .trimEnd(),
    )
    .join('\n');
}

export function toCSV(table: TableData): string {
  const rows = [table.headers, ...table.rows].filter((row) => row.length > 0);
  return rows.map((row) => row.join(',')).join('\n');
}
