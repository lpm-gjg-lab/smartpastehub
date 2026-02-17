import React from 'react';
import styles from '../styles/components/Toast.module.css';
import { useToastStore } from '../stores/useToastStore';
import { Button } from './Button';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useToastStore();

  return (
    <div className={styles.toastContainer}>
      {toasts.map((toast) => (
        <div 
          key={toast.id} 
          className={`${styles.toast} ${styles[toast.type]}`}
          role="alert"
          aria-live="assertive"
        >
          <div className={styles.header}>
            <span className={styles.title}>{toast.title}</span>
            <Button 
              variant="ghost" 
              onClick={() => removeToast(toast.id)}
              style={{ padding: '2px', fontSize: '12px' }}
            >
              ✕
            </Button>
          </div>
          {toast.message && <div className={styles.message}>{toast.message}</div>}
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
        </div>
      ))}
    </div>
  );
};
