import React from 'react';
import styles from '../styles/pages/PlaceholderPage.module.css';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';

export const SyncPage: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className="text-h1">Sync</h1>
        <Badge variant="success">
          <span className={`${styles.statusDot} ${styles.active}`} style={{ marginRight: '4px' }} />
          Connected
        </Badge>
      </div>

      <section className={styles.section}>
        <h2 className="text-h2" style={{ marginBottom: 'var(--space-md)' }}>
          Devices
        </h2>
        <div className={styles.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                <line x1="8" y1="21" x2="16" y2="21" />
                <line x1="12" y1="17" x2="12" y2="21" />
              </svg>
              <div>
                <div className={styles.title}>Desktop — This Device</div>
                <div className={styles.description}>Windows • Last sync: just now</div>
              </div>
            </div>
            <span className={`${styles.statusDot} ${styles.active}`} />
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="5" y="2" width="14" height="20" rx="2" ry="2" />
                <line x1="12" y1="18" x2="12.01" y2="18" />
              </svg>
              <div>
                <div className={styles.title}>Android Phone</div>
                <div className={styles.description}>Android 14 • Last sync: 5 min ago</div>
              </div>
            </div>
            <span className={`${styles.statusDot} ${styles.active}`} />
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className="text-h2" style={{ marginBottom: 'var(--space-md)' }}>
          Pair New Device
        </h2>
        <div className={styles.card} style={{ textAlign: 'center' }}>
          <div style={{
            width: '140px',
            height: '140px',
            margin: '0 auto var(--space-md)',
            background: 'var(--glass-bg)',
            border: '1px solid var(--glass-border)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-tertiary)',
            fontSize: '0.75rem',
          }}>
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" opacity="0.4">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <path d="M7 7h4v4H7zM13 7h4v4h-4zM7 13h4v4H7z" />
            </svg>
          </div>
          <p className="text-caption" style={{ marginBottom: 'var(--space-md)' }}>
            Scan QR code from the Smart Paste Hub mobile app
          </p>
          <Button variant="secondary">Generate QR Code</Button>
        </div>
      </section>
    </div>
  );
};
