import React from 'react';
import styles from '../styles/components/Toast.module.css';
import { useToastStore } from '../stores/useToastStore';
import { Button } from './Button';
import { useI18n } from '../hooks/useI18n';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();
  const { t } = useI18n();

  return (
    <div className={styles.toastContainer}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast} ${styles[toast.type]}`}
          role={
            toast.type === 'warning' || toast.type === 'error'
              ? 'alert'
              : 'status'
          }
          aria-live={
            toast.type === 'warning' || toast.type === 'error'
              ? 'assertive'
              : 'polite'
          }
          aria-atomic="true"
        >
          <div className={styles.header}>
            <span className={styles.title}>{toast.title}</span>
            <Button
              variant="ghost"
              onClick={() => removeToast(toast.id)}
              aria-label={t('common.close')}
              style={{ padding: '2px', fontSize: '12px' }}
            >
              ✕
            </Button>
          </div>
          {toast.message && (
            <div className={styles.message}>{toast.message}</div>
          )}
          {toast.action && (
            <div className={styles.actions}>
              <Button
                variant="secondary"
                onClick={toast.action.onClick}
                style={{ padding: '4px 8px', fontSize: '12px' }}
              >
                {toast.action.label}
              </Button>
            </div>
          )}
          {toast.actions && toast.actions.length > 0 && (
            <div className={styles.actions}>
              {toast.actions.map((action, index) => (
                <Button
                  key={`${toast.id}-${index}`}
                  variant="secondary"
                  onClick={action.onClick}
                  style={{ padding: '4px 8px', fontSize: '12px' }}
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};
