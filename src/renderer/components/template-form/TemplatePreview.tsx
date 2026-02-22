import React from 'react';

interface Props {
  preview: string;
}

export function TemplatePreview({ preview }: Props) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ fontSize: 11, opacity: 0.6, textTransform: 'uppercase' }}>
        Preview
      </div>
      <div
        style={{
          background: '#1a1a24',
          border: '1px solid rgba(255,255,255,0.1)',
          padding: 10,
          borderRadius: 6,
          fontSize: 12,
          fontFamily: 'monospace',
          minHeight: 60,
          whiteSpace: 'pre-wrap',
          color: '#a0e0a0',
        }}
      >
        {preview || <span style={{ opacity: 0.3 }}>Nothing to preview</span>}
      </div>
    </div>
  );
}
