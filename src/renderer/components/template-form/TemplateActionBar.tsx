import React, { useState } from 'react';

interface Props {
  onCopy: () => Promise<void>;
  onSave: () => Promise<void>;
  disableSave: boolean;
}

export function TemplateActionBar({ onCopy, onSave, disableSave }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div
      style={{
        padding: '10px 14px',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        background: 'rgba(0,0,0,0.2)',
      }}
    >
      <button
        onClick={() => {
          // @ts-ignore
          window.floatingAPI?.send('template:close');
        }}
        style={{
          background: 'transparent',
          border: 'none',
          color: 'rgba(255,255,255,0.5)',
          cursor: 'pointer',
          fontSize: 12,
        }}
      >
        Cancel
      </button>

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onSave}
          disabled={disableSave}
          style={{
            background: 'rgba(255,255,255,0.1)',
            border: 'none',
            color: disableSave ? 'rgba(255,255,255,0.3)' : '#fff',
            padding: '6px 14px',
            borderRadius: 6,
            cursor: disableSave ? 'not-allowed' : 'pointer',
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          💾 Save
        </button>
        <button
          onClick={handleCopy}
          style={{
            background: '#0070f3',
            border: 'none',
            color: '#fff',
            padding: '6px 14px',
            borderRadius: 6,
            cursor: 'pointer',
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          {copied ? 'Copied!' : '📋 Fill & Copy'}
        </button>
      </div>
    </div>
  );
}
