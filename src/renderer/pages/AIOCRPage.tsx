import React from 'react';
import styles from '../styles/pages/PlaceholderPage.module.css';
import { Button } from '../components/Button';
import { Toggle } from '../components/Toggle';

export const AIOCRPage: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className="text-h1">AI &amp; OCR</h1>
      </div>

      <section className={styles.section}>
        <h2 className="text-h2" style={{ marginBottom: 'var(--space-md)' }}>
          OCR Settings
        </h2>
        <div className={styles.card}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--space-md)',
            }}
          >
            <div>
              <div className={styles.title}>Enable OCR</div>
              <div className={styles.description}>
                Automatically extract text from images
              </div>
            </div>
            <Toggle defaultChecked />
          </div>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div className={styles.title}>Language</div>
              <div className={styles.description}>Select OCR language</div>
            </div>
            <select
              style={{
                padding: '6px 10px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--glass-border)',
                background: 'var(--glass-bg)',
                color: 'var(--text-primary)',
                fontSize: '0.8125rem',
                fontFamily: 'var(--font-sans)',
              }}
            >
              <option>English</option>
              <option>Indonesian</option>
              <option>Japanese</option>
            </select>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className="text-h2" style={{ marginBottom: 'var(--space-md)' }}>
          AI Rewrite
        </h2>
        <div className={styles.card}>
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--space-md)',
            }}
          >
            <div>
              <div className={styles.title}>Enable AI Suggestions</div>
              <div className={styles.description}>
                Get suggestions for rewriting text
              </div>
            </div>
            <Toggle />
          </div>
          <Button variant="secondary">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            Configure API Key
          </Button>
        </div>
      </section>
    </div>
  );
};
