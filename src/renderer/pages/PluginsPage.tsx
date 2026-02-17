import React from 'react';
import styles from '../styles/pages/PlaceholderPage.module.css';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';
import { Toggle } from '../components/Toggle';

const MOCK_PLUGINS = [
  {
    id: 1,
    name: 'JSON Formatter',
    description: 'Auto-format & validate JSON in clipboard',
    version: '1.2.0',
    installed: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M4 7c0-1.1.9-2 2-2h2m10 0h2a2 2 0 0 1 2 2v2M4 17v2a2 2 0 0 0 2 2h2m10 0h2a2 2 0 0 0 2-2v-2" />
        <path d="M8 12h.01M12 12h.01M16 12h.01" />
      </svg>
    ),
  },
  {
    id: 2,
    name: 'Markdown Converter',
    description: 'Convert HTML to Markdown automatically',
    version: '0.9.1',
    installed: true,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    id: 3,
    name: 'Code Syntax Highlight',
    description: 'Highlight code syntax in copied snippets',
    version: '2.0.0',
    installed: false,
    icon: (
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="16 18 22 12 16 6" />
        <polyline points="8 6 2 12 8 18" />
      </svg>
    ),
  },
];

export const PluginsPage: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className="text-h1">Plugins</h1>
        <Button variant="primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          Browse Store
        </Button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)' }}>
        {MOCK_PLUGINS.map((plugin, index) => (
          <div
            key={plugin.id}
            className={styles.card}
            style={{ animationDelay: `${index * 60}ms` }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-md)' }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  background: 'var(--glass-bg-hover)',
                  borderRadius: 'var(--radius-sm)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--accent-primary)',
                  border: '1px solid var(--glass-border)',
                  flexShrink: 0,
                }}>
                  {plugin.icon}
                </div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                    <span className={styles.title}>{plugin.name}</span>
                    <Badge variant="secondary">{plugin.version}</Badge>
                  </div>
                  <div className={styles.description}>{plugin.description}</div>
                </div>
              </div>
              {plugin.installed ? (
                <Toggle defaultChecked label={`Toggle ${plugin.name}`} />
              ) : (
                <Button variant="secondary" style={{ fontSize: '0.75rem', padding: '4px 12px' }}>
                  Install
                </Button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
