import React from 'react';
import styles from '../styles/components/Toggle.module.css';

interface ToggleProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const Toggle: React.FC<ToggleProps> = ({
  label,
  className,
  ...props
}) => {
  return (
    <label className={`${styles.toggle} ${className || ''}`} aria-label={label}>
      <input type="checkbox" {...props} />
      <span className={styles.slider}></span>
    </label>
  );
};
