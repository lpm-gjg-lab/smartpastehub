const fs = require('fs');
let content = fs.readFileSync('src/renderer/components/FloatingWindowShell.tsx', 'utf8');

const replacement = `import React, { ReactNode } from 'react';

interface Props {
  title: string;
  icon?: string;
  children: ReactNode;
  width?: number | string;
  height?: number | string;
}

export function FloatingWindowShell({ title, icon, children, width = '100vw', height = '100vh' }: Props) {
  return (
    <div
      style={{
        width,
        height,
        display: 'flex',
        flexDirection: 'column',
        background: 'rgba(15,15,25,0.96)',
        backdropFilter: 'blur(16px)',
        fontFamily: 'system-ui, sans-serif',
        color: '#e0e0ef',
        overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
      }}
    >
      <div
        style={{
          padding: '10px 14px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
          fontWeight: 600,
          fontSize: 13,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          WebkitAppRegion: 'drag', // Makes the header draggable in Electron
          userSelect: 'none'
        } as React.CSSProperties}
      >
        <span>{icon && \`\${icon} \`}{title}</span>
        <button 
          onClick={() => window.close()} 
          style={{
            background: 'transparent',
            border: 'none',
            color: 'rgba(255,255,255,0.5)',
            cursor: 'pointer',
            fontSize: '16px',
            WebkitAppRegion: 'no-drag' // Allows clicking the button
          } as React.CSSProperties}
          onMouseOver={(e) => e.currentTarget.style.color = 'white'}
          onMouseOut={(e) => e.currentTarget.style.color = 'rgba(255,255,255,0.5)'}
        >
          ✕
        </button>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '10px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}
      >
        {children}
      </div>
    </div>
  );
}
`;

fs.writeFileSync('src/renderer/components/FloatingWindowShell.tsx', replacement);
