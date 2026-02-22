import React, { useState, useCallback } from 'react';
import styles from './styles/components/ToastWindow.module.css';
import { useToastTimers } from './hooks/useToastTimers';
import { useToastData } from './hooks/useToastData';
import { runToastAction } from './components/toast/toastActions';
import { ToastHeader } from './components/toast/ToastHeader';
import { ToastActionBar } from './components/toast/ToastActionBar';

export default function ToastApp() {
  const [copied, setCopied] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const hideWindow = useCallback(() => {
    // @ts-ignore
    window.floatingAPI?.send('toast:hide');
  }, []);

  const { closing, setClosing, startDismissTimers, clearDismissTimers, scheduleClose } = useToastTimers(hideWindow);
  
  const { data, setData } = useToastData(() => {
    setClosing(false);
    setCopied(false);
    setIsAiLoading(false);
    startDismissTimers();
  });

  if (!data) return null;

  const handleAction = (action: string) => {
    runToastAction(action, data, setData, setIsAiLoading, setCopied, scheduleClose, clearDismissTimers);
  };

  return (
    <div className={styles.toastContainer}>
      <div className={`${styles.toastBox} ${closing ? styles.closing : ''}`}>
        <ToastHeader data={data} />
        <div className={styles.content}>
          {data.securityAlert
            ? '⚠️ Sensitive data masked'
            : data.type === 'bypass_mode' || data.type === 'system'
              ? data.cleaned
              : data.cleaned.slice(0, 100)}
        </div>
        <ToastActionBar 
          data={data} 
          isAiLoading={isAiLoading} 
          copied={copied} 
          onAction={handleAction} 
        />
      </div>
    </div>
  );
}
