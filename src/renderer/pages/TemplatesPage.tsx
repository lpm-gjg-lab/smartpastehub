import React from 'react';
import styles from '../styles/pages/TemplatesPage.module.css';
import { Button } from '../components/Button';

const MOCK_TEMPLATES = [
  {
    id: 1,
    title: 'Email Formal',
    content:
      'Yth. {nama},\n\nDengan hormat,\n\n{isi_pesan}\n\nHormat kami,\n{pengirim}',
    variables: ['nama', 'isi_pesan', 'pengirim'],
  },
  {
    id: 2,
    title: 'Konfirmasi Order',
    content:
      'Halo {customer}, pesanan #{id} sudah kami terima. Total: {total}.',
    variables: ['customer', 'id', 'total'],
  },
  {
    id: 3,
    title: 'Meeting Invite',
    content:
      'Hi {name},\n\nYou are invited to {meeting} on {date} at {time}.\n\nLocation: {location}',
    variables: ['name', 'meeting', 'date', 'time', 'location'],
  },
];

export const TemplatesPage: React.FC = () => {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className="text-h1">Templates</h1>
        <Button variant="primary">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
          >
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          New Template
        </Button>
      </div>

      <div className={styles.grid}>
        {MOCK_TEMPLATES.map((template, index) => (
          <div
            key={template.id}
            className={styles.card}
            style={{ animationDelay: `${index * 60}ms` }}
            tabIndex={0}
          >
            <div className={styles.cardHeader}>
              <span className={styles.cardTitle}>{template.title}</span>
              <Button
                variant="ghost"
                style={{ padding: '4px 8px', fontSize: '0.6875rem' }}
              >
                Edit
              </Button>
            </div>
            <div className={styles.cardContent}>{template.content}</div>
            <div className={styles.variables}>
              {template.variables.map((variable) => (
                <span
                  key={variable}
                  className={styles.variable}
                >{`{${variable}}`}</span>
              ))}
            </div>
            <div className={styles.cardFooter}>
              <Button
                variant="secondary"
                style={{ padding: '4px 10px', fontSize: '0.6875rem' }}
              >
                Use Template
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
