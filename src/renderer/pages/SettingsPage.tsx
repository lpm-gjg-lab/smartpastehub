import React from 'react';
import styles from '../styles/pages/SettingsPage.module.css';
import { Card } from '../components/Card';
import { Toggle } from '../components/Toggle';
import { Button } from '../components/Button';

export const SettingsPage: React.FC = () => {
  return (
    <div className={styles.container}>
      <h1 className="text-h1" style={{ marginBottom: 'var(--space-lg)' }}>Settings</h1>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Quick Clean</h2>
        <div className={styles.grid}>
          <Card title="Cleaning Presets">
            <div className={styles.row}>
              <div>
                <div className={styles.label}>Trim Whitespace</div>
                <div className={styles.description}>Remove extra spaces and trailing whitespace</div>
              </div>
              <Toggle defaultChecked />
            </div>
            <div className={styles.row}>
              <div>
                <div className={styles.label}>Fix Line Breaks</div>
                <div className={styles.description}>Normalize line endings across platforms</div>
              </div>
              <Toggle defaultChecked />
            </div>
            <div className={styles.row}>
              <div>
                <div className={styles.label}>Strip HTML Tags</div>
                <div className={styles.description}>Remove HTML formatting from paste</div>
              </div>
              <Toggle />
            </div>
          </Card>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Privacy</h2>
        <div className={styles.grid}>
          <Card title="Data Handling">
            <div className={styles.row}>
              <div>
                <div className={styles.label}>Mask Sensitive Data</div>
                <div className={styles.description}>Auto-detect & mask emails, passwords, API keys</div>
              </div>
              <Toggle defaultChecked />
            </div>
            <div className={styles.row}>
              <div>
                <div className={styles.label}>Auto-Purge History</div>
                <div className={styles.description}>Delete clipboard history older than 30 days</div>
              </div>
              <Toggle />
            </div>
          </Card>
        </div>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Keyboard Shortcuts</h2>
        <Card title="Shortcuts">
          <div className={styles.row}>
            <div className={styles.label}>Quick Paste</div>
            <kbd style={{
              padding: '3px 10px',
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-xs)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
            }}>Ctrl + Shift + V</kbd>
          </div>
          <div className={styles.row}>
            <div className={styles.label}>Search History</div>
            <kbd style={{
              padding: '3px 10px',
              background: 'var(--glass-bg)',
              border: '1px solid var(--glass-border)',
              borderRadius: 'var(--radius-xs)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.75rem',
              color: 'var(--text-secondary)',
            }}>Ctrl + Shift + H</kbd>
          </div>
        </Card>
      </section>

      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Danger Zone</h2>
        <Card>
          <div className={styles.row}>
            <div>
              <div className={styles.label}>Clear All Data</div>
              <div className={styles.description}>Permanently delete all clipboard history and settings</div>
            </div>
            <Button variant="danger">Clear Data</Button>
          </div>
        </Card>
      </section>
    </div>
  );
};
