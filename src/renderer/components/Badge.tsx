import React from 'react';
import styles from '../styles/components/Badge.module.css';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'secondary';
  children: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'primary',
  children,
  className,
  ...props
}) => {
  return (
    <span
      className={`${styles.badge} ${styles[variant]} ${className || ''}`}
      {...props}
    >
      {children}
    </span>
  );
};
