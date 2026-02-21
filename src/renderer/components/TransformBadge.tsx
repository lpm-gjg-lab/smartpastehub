import React from 'react';
import styles from '../styles/components/TransformBadge.module.css';
import type { TransformLabel } from '../types';

interface TransformBadgeProps {
  transform: TransformLabel;
}

export const TransformBadge: React.FC<TransformBadgeProps> = ({
  transform,
}) => {
  return (
    <span className={styles.badge} title={transform.description}>
      <span className={styles.icon}>{transform.icon}</span>
      <span className={styles.label}>{transform.label}</span>
    </span>
  );
};
