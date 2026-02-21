import React, { useState, useCallback } from 'react';

type FormatMode = 'markdown' | 'plaintext' | 'html';

declare global {
  interface Window {
    electronAPI?: {
      invoke: (channel: string, payload?: unknown) => Promise<unknown>;
    };
  }
}

interface ClipResult {
  title: string;
  content: string;
  textContent: string;
  excerpt: string;
  byline?: string;
  siteName?: string;
  length: number;
}

export default function WebClipper() {
  const [url, setUrl] = useState('');
  const [clipResult, setClipResult] = useState<ClipResult | null>(null);
  const [format, setFormat] = useState<FormatMode>('markdown');
  const [renderedContent, setRenderedContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);

  const clip = useCallback(async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError('');
    setClipResult(null);
    setRenderedContent('');
    try {
      // Fetch HTML in renderer (Node fetch / browser fetch)
      const fetchRes = await fetch(url);
      const html = await fetchRes.text();

      const res = (await window.electronAPI?.invoke('clipper:clip-url', {
        html,
        url,
      })) as { data: ClipResult } | undefined;

      if (res?.data) {
        const result = res.data;
        setClipResult(result);
        await _applyFormat(result.content, format);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [url, format]);

  const _applyFormat = async (html: string, fmt: FormatMode) => {
    if (fmt === 'html') {
      setRenderedContent(html);
      return;
    }
    const channel =
      fmt === 'markdown' ? 'clipper:to-markdown' : 'clipper:to-plaintext';
    const res = (await window.electronAPI?.invoke(channel, html)) as
      | { data: string }
      | undefined;
    setRenderedContent(res?.data ?? '');
  };

  const handleFormatChange = async (fmt: FormatMode) => {
    setFormat(fmt);
    if (clipResult) {
      await _applyFormat(clipResult.content, fmt);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(renderedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSave = async () => {
    if (!clipResult || !renderedContent) return;
    // Persist via snippets IPC
    await window.electronAPI?.invoke('snippets:create', {
      title: clipResult.title || url,
      content: renderedContent,
      tags: ['web-clip'],
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const formats: { key: FormatMode; label: string }[] = [
    { key: 'markdown', label: 'Markdown' },
    { key: 'plaintext', label: 'Plain Text' },
    { key: 'html', label: 'HTML' },
  ];

  return (
    <div
      style={{
        width: 480,
        height: 560,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(15,15,25,0.96)',
        backdropFilter: 'blur(16px)',
        fontFamily: 'system-ui, sans-serif',
        color: '#e0e0ef',
        overflow: 'hidden',
        borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          fontWeight: 600,
          fontSize: 13,
        }}
      >
        🌐 Web Clipper
      </div>

      {/* URL input */}
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          gap: 8,
        }}
      >
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && void clip()}
          placeholder="https://example.com/article"
          style={{
            flex: 1,
            padding: '6px 10px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 6,
            color: '#e0e0ef',
            fontSize: 12,
          }}
        />
        <button
          onClick={() => void clip()}
          disabled={loading || !url.trim()}
          style={{
            padding: '6px 14px',
            borderRadius: 6,
            border: 'none',
            cursor: loading || !url.trim() ? 'not-allowed' : 'pointer',
            fontSize: 12,
            fontWeight: 600,
            background: 'rgba(100,120,255,0.8)',
            color: '#fff',
          }}
        >
          {loading ? '…' : 'Clip'}
        </button>
      </div>

      {/* Article meta */}
      {clipResult && (
        <div
          style={{
            padding: '6px 14px',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
            fontSize: 11,
            opacity: 0.7,
          }}
        >
          <strong style={{ opacity: 1, fontSize: 12 }}>
            {clipResult.title}
          </strong>
          {clipResult.byline && ` · ${clipResult.byline}`}
          {clipResult.siteName && ` · ${clipResult.siteName}`}
          {` · ${clipResult.length} chars`}
        </div>
      )}

      {/* Format toggle */}
      <div
        style={{
          padding: '6px 14px',
          display: 'flex',
          gap: 6,
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {formats.map(({ key, label }) => (
          <button
            key={key}
            onClick={() => void handleFormatChange(key)}
            style={{
              padding: '3px 10px',
              borderRadius: 4,
              border: 'none',
              cursor: 'pointer',
              fontSize: 11,
              background:
                format === key
                  ? 'rgba(100,120,255,0.8)'
                  : 'rgba(255,255,255,0.1)',
              color: '#fff',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Preview */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px 14px',
        }}
      >
        {error && <div style={{ color: '#f87171', fontSize: 12 }}>{error}</div>}
        {!error && !renderedContent && !loading && (
          <div style={{ opacity: 0.4, fontSize: 12 }}>
            Enter a URL and click Clip to extract article content.
          </div>
        )}
        {renderedContent && (
          <pre
            style={{
              margin: 0,
              fontSize: 11,
              lineHeight: 1.6,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              color: '#d0d0e8',
              fontFamily: format === 'html' ? 'monospace' : 'inherit',
            }}
          >
            {renderedContent}
          </pre>
        )}
      </div>

      {/* Action bar */}
      <div
        style={{
          padding: '8px 12px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          display: 'flex',
          gap: 8,
        }}
      >
        <button
          onClick={() => void handleCopy()}
          disabled={!renderedContent}
          style={{
            flex: 2,
            padding: '7px 0',
            borderRadius: 6,
            border: 'none',
            cursor: renderedContent ? 'pointer' : 'not-allowed',
            fontSize: 12,
            fontWeight: 600,
            background: copied
              ? 'rgba(100,200,100,0.7)'
              : 'rgba(100,120,255,0.8)',
            color: '#fff',
          }}
        >
          {copied ? '✓ Copied!' : 'Copy'}
        </button>
        <button
          onClick={() => void handleSave()}
          disabled={!clipResult}
          style={{
            flex: 1,
            padding: '7px 0',
            borderRadius: 6,
            border: 'none',
            cursor: clipResult ? 'pointer' : 'not-allowed',
            fontSize: 12,
            background: saved
              ? 'rgba(100,200,100,0.3)'
              : 'rgba(255,255,255,0.08)',
            color: '#fff',
          }}
        >
          {saved ? '✓ Saved' : 'Save to Snippets'}
        </button>
      </div>
    </div>
  );
}
