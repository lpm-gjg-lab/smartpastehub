import React from "react";
import styles from "../styles/components/EmptyState.module.css";

interface EmptyStateAction {
  label: string;
  onClick: () => void;
}

interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  action?: EmptyStateAction;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  subtitle,
  action,
}) => {
  return (
    <div className={styles.emptyState}>
      <div className={styles.iconWrap}>
        <div className={styles.icon}>{icon}</div>
      </div>
      <p className={styles.title}>{title}</p>
      {subtitle && <p className={styles.subtitle}>{subtitle}</p>}
      {action && (
        <button
          type="button"
          className={styles.actionBtn}
          onClick={action.onClick}
        >
          {action.label}
        </button>
      )}
    </div>
  );
};
