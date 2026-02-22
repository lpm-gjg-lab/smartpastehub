import React from 'react';
import styles from '../styles/pages/SettingsPage.module.css';

export const Onboarding: React.FC<{ onComplete: () => void }> = ({ onComplete }) => {
  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999
    }}>
      <div style={{
        background: 'var(--surface-1)', padding: '2rem', borderRadius: '12px',
        maxWidth: 500, textAlign: 'center', border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-lg)'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🎉</div>
        <h2 style={{ marginBottom: '1rem' }}>Welcome to Smart Paste Hub!</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem', lineHeight: 1.5 }}>
          Your intelligent clipboard assistant is ready. Use <strong>Ctrl+Alt+V</strong> to paste cleaned text anywhere, or open the settings to configure OCR, cross-device sync, and AI features.
        </p>
        <button 
          onClick={onComplete}
          style={{
            background: 'var(--accent-primary)', color: 'white', border: 'none',
            padding: '10px 24px', borderRadius: '6px', cursor: 'pointer', fontWeight: 600
          }}
        >
          Get Started
        </button>
      </div>
    </div>
  );
};
