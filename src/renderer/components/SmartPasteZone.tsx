import React from "react";
import styles from "../styles/components/SmartPasteZone.module.css";
import { Button } from "./Button";

interface SmartPasteZoneProps {
  inputText: string;
  onInputChange: (text: string) => void;
  onClean: (text: string) => void;
  isProcessing: boolean;
  detectedType?: string | null;
  pasteHotkeyHint?: string;
  className?: string;
}

export const SmartPasteZone: React.FC<SmartPasteZoneProps> = ({
  inputText,
  onInputChange,
  onClean,
  isProcessing,
  detectedType,
  pasteHotkeyHint,
  className,
}) => {
  const charCount = inputText.length;

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Ctrl+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (inputText.trim() && !isProcessing) {
        onClean(inputText);
      }
    }
  };

  return (
    <div className={`${styles.container} ${className || ""}`}>
      <div className={styles.textareaWrapper}>
        <textarea
          className={styles.textarea}
          value={inputText}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={`Paste anything here — or press ${pasteHotkeyHint ?? "Alt+Shift+V"} anywhere`}
          spellCheck={false}
          autoFocus
        />

        {!inputText && (
          <div className={styles.emptyState}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={styles.emptyIcon}
            >
              <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
              <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
              <path d="M12 11h4"></path>
              <path d="M12 16h4"></path>
              <path d="M8 11h.01"></path>
              <path d="M8 16h.01"></path>
            </svg>
          </div>
        )}

        <div className={styles.shortcutHint}>
          ⌨ {pasteHotkeyHint ?? "Alt+Shift+V"}
        </div>
      </div>

      <div className={styles.actions}>
        <div className={styles.zoneFooter}>
          {detectedType && (
            <div className={styles.detectedBadge}>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="7.5 4.21 12 6.81 16.5 4.21" />
                <polyline points="7.5 19.79 7.5 14.63 3 12" />
                <polyline points="21 12 16.5 14.63 16.5 19.79" />
                <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
                <line x1="12" y1="22.08" x2="12" y2="12" />
              </svg>
              <span>{detectedType.replace("_", " ")}</span>
            </div>
          )}
          {charCount > 0 && (
            <div className={styles.charCount}>
              {charCount.toLocaleString()} chars
            </div>
          )}
        </div>

        <Button
          variant="primary"
          onClick={() => onClean(inputText)}
          disabled={!inputText.trim() || isProcessing}
          loading={isProcessing}
          size="md"
        >
          Clean Now
        </Button>
      </div>
    </div>
  );
};
