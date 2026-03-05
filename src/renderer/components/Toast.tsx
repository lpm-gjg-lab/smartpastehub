import React from "react";
import styles from "../styles/components/Toast.module.css";
import { useToastStore } from "../stores/useToastStore";
import { Button } from "./Button";
import { useTranslation } from "react-i18next";

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast, pauseToast, resumeToast } = useToastStore();
  const { t } = useTranslation();

  const onToastKeyDown = (
    e: React.KeyboardEvent<HTMLDivElement>,
    toast: (typeof toasts)[number],
  ) => {
    if (e.key === "Escape") {
      e.preventDefault();
      removeToast(toast.id);
      return;
    }

    if (
      (e.key === "Enter" || e.key === " ") &&
      e.currentTarget === e.target &&
      toast.action
    ) {
      e.preventDefault();
      toast.action.onClick();
    }
  };

  return (
    <div className={styles.toastContainer}>
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`${styles.toast} ${styles[toast.type]}`}
          role={
            toast.type === "warning" || toast.type === "error"
              ? "alert"
              : "status"
          }
          aria-live={
            toast.type === "warning" || toast.type === "error"
              ? "assertive"
              : "polite"
          }
          aria-atomic="true"
          tabIndex={0}
          onKeyDown={(e) => onToastKeyDown(e, toast)}
          onMouseEnter={() => pauseToast(toast.id)}
          onMouseLeave={() => resumeToast(toast.id)}
          onFocus={() => pauseToast(toast.id)}
          onBlur={() => resumeToast(toast.id)}
        >
          <div className={styles.header}>
            <span className={styles.title}>{toast.title}</span>
            <Button
              variant="ghost"
              onClick={() => removeToast(toast.id)}
              aria-label={`${t("common.close")} ${toast.title}`}
              className={styles.closeBtn}
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
                aria-label={toast.action.label}
                className={styles.actionButton}
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
                  aria-label={action.label}
                  className={styles.actionButton}
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
