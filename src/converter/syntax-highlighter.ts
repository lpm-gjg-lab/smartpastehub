import hljs from 'highlight.js';

export interface HighlightOptions {
  language?: string;
  theme: 'dark' | 'light';
  lineNumbers: boolean;
}

export function highlightCode(code: string, options: HighlightOptions): string {
  const result = options.language
    ? hljs.highlight(code, { language: options.language })
    : hljs.highlightAuto(code);

  const lines = result.value.split('\n');
  const body = options.lineNumbers
    ? lines
        .map((line, i) => `<span class="line"><span class="ln">${i + 1}</span>${line}</span>`)
        .join('\n')
    : lines.join('\n');

  return `<pre class="hljs ${options.theme}"><code>${body}</code></pre>`;
}
