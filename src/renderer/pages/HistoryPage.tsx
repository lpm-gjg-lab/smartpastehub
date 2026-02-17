import React from 'react';
import styles from '../styles/pages/HistoryPage.module.css';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Badge } from '../components/Badge';

const MOCK_HISTORY = [
  {
    id: 1,
    content: 'const greeting = "Hello, World!";\nconsole.log(greeting);',
    type: 'TEXT',
    app: 'VS Code',
    time: '2 min ago',
  },
  {
    id: 2,
    content: 'SELECT * FROM users WHERE active = true ORDER BY created_at DESC LIMIT 10;',
    type: 'TEXT',
    app: 'DataGrip',
    time: '15 min ago',
  },
  {
    id: 3,
    content: 'https://api.example.com/v2/users?page=1&limit=25',
    type: 'TEXT',
    app: 'Chrome',
    time: '1 hour ago',
  },
  {
    id: 4,
    content: '{ "name": "SmartPasteHub", "version": "0.1.0", "dependencies": {} }',
    type: 'DATA',
    app: 'Postman',
    time: '3 hours ago',
  },
];

const typeVariant = (type: string) => {
  switch (type) {
    case 'DATA': return 'success' as const;
    case 'TABLE': return 'warning' as const;
    case 'OCR': return 'danger' as const;
    default: return 'secondary' as const;
  }
};

export const HistoryPage: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className="text-h1">History</h1>
        <Button variant="ghost">Clear All</Button>
      </div>

      <div className={styles.searchBar}>
        <Input placeholder="Search clipboard history..." style={{ flex: 1 }} />
        <Button variant="secondary">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
          </svg>
          Filter
        </Button>
      </div>

      <div className={styles.list}>
        {MOCK_HISTORY.map((item, index) => (
          <div
            key={item.id}
            className={styles.item}
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <div className={styles.itemHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-sm)' }}>
                <Badge variant={typeVariant(item.type)}>{item.type}</Badge>
                <span>{item.app}</span>
              </div>
              <span>{item.time}</span>
            </div>
            <div className={styles.itemContent}>{item.content}</div>
            <div className={styles.itemActions}>
              <Button variant="ghost" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copy
              </Button>
              <Button variant="ghost" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                Delete
              </Button>
              <Button variant="ghost" style={{ padding: '4px 8px', fontSize: '0.75rem' }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                Save
              </Button>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.pagination}>
        <Button variant="ghost" style={{ padding: '6px 10px' }}>← Prev</Button>
        <span className="text-caption">Page 1 of 5</span>
        <Button variant="ghost" style={{ padding: '6px 10px' }}>Next →</Button>
      </div>
    </div>
  );
};
