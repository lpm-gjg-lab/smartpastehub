import { ResetIcon } from "@radix-ui/react-icons";

import React from "react";
import styles from "../styles/components/ResultPanel.module.css";
import { Button } from "./Button";
import { TransformBadge } from "./TransformBadge";
import type { SmartPasteResult } from "../types";
import { useTranslation } from "react-i18next";

interface ResultPanelProps {
  result: SmartPasteResult;
  onCopy: (text: string) => void;
  onClear: () => void;
  className?: string;
}

export const ResultPanel: React.FC<ResultPanelProps> = ({
  result,
  onCopy,
  onClear,
  className,
}) => {
  const { t } = useTranslation();
  const inLen = result.input.length;
  const outLen = result.output.length;

  // Format diff cleanly, e.g., "1.2k → 0.8k chars" or "120 → 120 chars"
  const formatNum = (n: number) =>
    n > 999 ? (n / 1000).toFixed(1) + "k" : n.toString();
  const diffText = `${formatNum(inLen)} → ${formatNum(outLen)} chars`;

  return (
    <section
      className={`${styles.panel} ${className || ""}`}
      aria-label="Cleaned result"
    >
      <div className={styles.header}>
        <div className={styles.titleArea}>
          <h3 className={styles.title}>{t("result.title")}</h3>
          {result.transforms.length > 0 && (
            <div className={styles.badges}>
              {result.transforms.map((t) => (
                <TransformBadge key={t.id} transform={t} />
              ))}
            </div>
          )}
        </div>

        <div className={styles.headerActions}>
          <span className={styles.diff}>{diffText}</span>
          <Button variant="ghost" size="sm" onClick={onClear}>
            <ResetIcon style={{ marginRight: 6 }} /> {t("common.clear")}
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onCopy(result.output)}
          >
            <svg
              aria-hidden="true"
              focusable="false"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ marginRight: "6px" }}
            >
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            {t("result.copy_result")}
          </Button>
        </div>
      </div>

      <div className={styles.contentWrapper}>
        <section className={styles.content} aria-label="Result output text">
          {result.output}
        </section>
      </div>
    </section>
  );
};
