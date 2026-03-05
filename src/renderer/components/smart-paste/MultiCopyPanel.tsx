import React from "react";
import { useTranslation } from "react-i18next";
import styles from "../../styles/pages/SmartPastePage.module.css";

interface MultiClipboardState {
  isCollecting: boolean;
  items: string[];
}

interface MultiCopyPanelProps {
  multiState: MultiClipboardState;
  multiAddText: string;
  setMultiAddText: React.Dispatch<React.SetStateAction<string>>;
  handleMultiStart: () => void;
  handleMultiMerge: () => void;
  handleMultiClear: () => void;
  handleMultiAdd: () => void;
}

export const MultiCopyPanel: React.FC<MultiCopyPanelProps> = ({
  multiState,
  multiAddText,
  setMultiAddText,
  handleMultiStart,
  handleMultiMerge,
  handleMultiClear,
  handleMultiAdd,
}) => {
  const { t } = useTranslation();

  return (
    <div className={styles.multiPanel}>
      <div className={styles.multiHeader}>
        <span className={styles.multiLabel}>{t("smart_paste.multi_copy")}</span>
        <span
          className={`${styles.multiStatus} ${multiState.isCollecting ? styles.multiCollecting : ""}`}
        >
          {multiState.isCollecting
            ? `● Collecting (${multiState.items.length})`
            : `${multiState.items.length} items`}
        </span>
      </div>
      <div className={styles.multiActions}>
        <button
          className={styles.multiBtn}
          onClick={handleMultiStart}
          disabled={multiState.isCollecting}
        >
          {multiState.isCollecting ? "Collecting…" : "▶ Start"}
        </button>
        <button
          className={styles.multiBtn}
          onClick={handleMultiMerge}
          disabled={multiState.items.length === 0}
        >
          ⊕ Merge into Input
        </button>
        <button
          className={styles.multiBtn}
          onClick={handleMultiClear}
          disabled={multiState.items.length === 0 && !multiState.isCollecting}
        >
          ✕ Clear
        </button>
        {multiState.isCollecting && (
          <div className={styles.multiAddRow}>
            <input
              className={styles.multiAddInput}
              value={multiAddText}
              onChange={(e) => setMultiAddText(e.target.value)}
              placeholder="Type to add manually…"
              onKeyDown={(e) => e.key === "Enter" && void handleMultiAdd()}
            />
            <button
              className={styles.multiBtn}
              onClick={handleMultiAdd}
              disabled={!multiAddText.trim()}
            >
              + Add
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
