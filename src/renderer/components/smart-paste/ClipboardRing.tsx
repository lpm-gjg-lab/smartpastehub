import React from "react";
import { useTranslation } from "react-i18next";
import styles from "../../styles/pages/SmartPastePage.module.css";

interface RingItem {
  id: number;
  slotIndex: number;
  content: string;
  contentType: string;
  timestamp: number;
}

interface ClipboardRingProps {
  ringItems: RingItem[];
  onSelect: (item: RingItem) => Promise<void>;
}

export const ClipboardRing: React.FC<ClipboardRingProps> = ({
  ringItems,
  onSelect,
}) => {
  const { t } = useTranslation();

  return (
    <div className={styles.ringPanel}>
      <div className={styles.multiHeader}>
        <span className={styles.multiLabel}>
          📋 {t("smart_paste.clipboard_stack")}
        </span>
        <span className={styles.multiStatus}>{ringItems.length} recent</span>
      </div>
      {ringItems.length > 0 && (
        <div className={styles.ringChips}>
          {ringItems.slice(0, 5).map((item) => (
            <button
              key={item.id}
              className={styles.ringChip}
              onClick={() => void onSelect(item)}
              title={item.content}
            >
              {item.content.slice(0, 32)}
              {item.content.length > 32 ? "…" : ""}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};
