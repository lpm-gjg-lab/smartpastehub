import React from 'react';
import styles from '../../styles/components/ToastWindow.module.css';
import { ToastData } from '../../hooks/useToastData';
import { getTransformLabel } from '../../lib/transform-labels';

interface Props {
  data: ToastData;
}

export function ToastHeader({ data }: Props) {
  const transformNames = data.changes?.map(getTransformLabel).filter(Boolean) || [];
  const typeLabel = data.type.replace('_', ' ').toUpperCase();

  const getIcon = () => {
    if (data.type === 'bypass_mode') return '🛑';
    if (data.type === 'system') return '⚙️';
    return '✨';
  };

  const getTitle = () => {
    if (data.type === 'bypass_mode') return 'Auto-Clean Snoozed';
    if (data.type === 'system') return 'System Notification';
    if (data.type === 'ocr_result') return 'Text Extracted from Image';
    if (data.type === 'ai_vision') return 'AI Image Description';
    if (data.isMerged) return `Merged ${data.mergedCount} items`;
    if (transformNames.length > 0) return `${transformNames.length} formats applied`;
    return 'Copied & Cleaned';
  };

  return (
    <div className={styles.header}>
      <div className={styles.title}>
        <span className={styles.icon}>{getIcon()}</span>
        {getTitle()}
        {data.sourceApp && data.type !== 'system' && (
          <span style={{ opacity: 0.5, fontSize: '10px', marginLeft: '4px' }}>
            from {data.sourceApp.split('.')[0]}
          </span>
        )}
      </div>
      {data.type !== 'bypass_mode' && data.type !== 'system' && (
        <div className={styles.typeBadge}>{typeLabel}</div>
      )}
    </div>
  );
}
