import React, { ReactNode } from 'react';

interface Props {
  title: string;
  icon?: string;
  children: ReactNode;
  width?: number;
  height?: number | string;
}

export function FloatingWindowShell({ title, icon, children, width = 440, height = 'auto' }: Props) {
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
        borderRadius: 12,
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
        }}
      >
        {icon && `${icon} `}{title}
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
