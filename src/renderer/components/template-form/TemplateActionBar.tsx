import React, { useState } from "react";
import styles from "../../styles/components/TemplateForm.module.css";

interface Props {
  onCopy: () => Promise<void>;
  onSave: () => Promise<void>;
  disableSave: boolean;
}

export function TemplateActionBar({ onCopy, onSave, disableSave }: Props) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className={styles.actionBar}>
      <button
        onClick={() => {
          window.close();
        }}
        className={`${styles.btn} ${styles.btnGhost}`}
      >
        Cancel
      </button>

      <div className={styles.actions}>
        <button onClick={onSave} disabled={disableSave} className={styles.btn}>
          💾 Save
        </button>
        <button
          onClick={handleCopy}
          className={`${styles.btn} ${styles.btnPrimary}`}
        >
          {copied ? "Copied!" : "📋 Fill & Copy"}
        </button>
      </div>
    </div>
  );
}
