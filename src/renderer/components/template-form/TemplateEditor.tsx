import React from 'react';

interface Props {
  rawContent: string;
  setRawContent: (val: string) => void;
}

export function TemplateEditor({ rawContent, setRawContent }: Props) {
  return (
    <textarea
      placeholder="Type template with {{variables}} and [[system:date]]"
      value={rawContent}
      onChange={(e) => setRawContent(e.target.value)}
      style={{
        width: '100%',
        height: 100,
        boxSizing: 'border-box',
        background: 'rgba(0,0,0,0.3)',
        border: '1px solid rgba(255,255,255,0.1)',
        color: '#fff',
        padding: 10,
        borderRadius: 6,
        fontSize: 12,
        fontFamily: 'monospace',
        resize: 'vertical',
        outline: 'none',
      }}
    />
  );
}
