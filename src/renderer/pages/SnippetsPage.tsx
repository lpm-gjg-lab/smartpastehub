import React from 'react';
import styles from '../styles/pages/SnippetsPage.module.css';
import { Button } from '../components/Button';
import { Badge } from '../components/Badge';

const MOCK_SNIPPETS = [
  {
    id: 1,
    title: 'Console Log',
    trigger: '/log',
    content: 'console.log("${1:message}");',
    language: 'JavaScript',
  },
  {
    id: 2,
    title: 'Arrow Function',
    trigger: '/fn',
    content: 'const ${1:name} = (${2:params}) => {\n  ${3:// body}\n};',
    language: 'JavaScript',
  },
  {
    id: 3,
    title: 'SQL Select',
    trigger: '/sel',
    content: 'SELECT ${1:columns}\nFROM ${2:table}\nWHERE ${3:condition};',
    language: 'SQL',
  },
  {
    id: 4,
    title: 'Email Template',
    trigger: '/email',
    content: 'Dear {name},\n\n{body}\n\nBest regards,\n{sender}',
    language: 'Plain',
  },
];

export const SnippetsPage: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className="text-h1">Snippets</h1>
        <Button variant="primary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Snippet
        </Button>
      </div>

      <div className={styles.grid}>
        {MOCK_SNIPPETS.map((snippet, index) => (
          <div
            key={snippet.id}
            className={styles.card}
            style={{ animationDelay: `${index * 60}ms` }}
            tabIndex={0}
          >
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>{snippet.title}</span>
              <Badge variant="primary">{snippet.language}</Badge>
            </div>
            <div className={styles.cardContent}>{snippet.content}</div>
            <div className={styles.cardFooter}>
              <span style={{
                fontFamily: 'var(--font-mono)',
                fontSize: '0.6875rem',
                color: 'var(--text-tertiary)',
              }}>{snippet.trigger}</span>
              <div style={{ display: 'flex', gap: 'var(--space-xs)' }}>
                <Button variant="ghost" style={{ padding: '4px 8px', fontSize: '0.6875rem' }}>Edit</Button>
                <Button variant="secondary" style={{ padding: '4px 8px', fontSize: '0.6875rem' }}>Copy</Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
