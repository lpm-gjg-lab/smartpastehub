import React, { ReactNode, useEffect, useRef } from "react";
import styles from "../styles/components/FloatingWindowShell.module.css";

interface Props {
  title: string;
  icon?: string;
  children: ReactNode;
  width?: number | string;
  height?: number | string;
}

export function FloatingWindowShell({
  title,
  icon,
  children,
  width = "100%",
  height = "100%",
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeBtnRef.current?.focus();
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Escape") {
      e.preventDefault();
      window.close();
      return;
    }

    if (e.key !== "Tab" || !dialogRef.current) {
      return;
    }

    const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
    );

    if (focusable.length === 0) {
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (!first || !last) {
      return;
    }
    const active = document.activeElement as HTMLElement | null;

    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="floating-window-title"
      onKeyDown={handleKeyDown}
      className={styles.root}
      style={{ width, height }}
    >
      <div className={styles.header}>
        <span id="floating-window-title" className={styles.title}>
          {icon && `${icon} `}
          {title}
        </span>
        <button
          ref={closeBtnRef}
          onClick={() => window.close()}
          aria-label="Close window"
          className={styles.closeBtn}
        >
          ✕
        </button>
      </div>

      <div className={styles.content}>{children}</div>
    </div>
  );
}
