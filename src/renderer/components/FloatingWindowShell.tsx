import React, { ReactNode, useEffect, useId, useRef } from "react";
import styles from "../styles/components/FloatingWindowShell.module.css";
import { Cross2Icon } from "@radix-ui/react-icons";

interface Props {
  title: string;
  icon?: ReactNode;
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
  const titleId = useId();

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
      aria-labelledby={titleId}
      onKeyDown={handleKeyDown}
      className={styles.root}
      style={{ width, height }}
    >
      <div className={styles.header}>
        <span id={titleId} className={styles.title}>
          {icon && <span aria-hidden="true">{icon} </span>}
          {title}
        </span>
        <button
          type="button"
          ref={closeBtnRef}
          onClick={() => window.close()}
          aria-label="Close window"
          className={styles.closeBtn}
        >
          <Cross2Icon />
        </button>
      </div>

      <div className={styles.content}>{children}</div>
    </div>
  );
}
