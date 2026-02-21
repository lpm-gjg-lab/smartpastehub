import React from 'react';
import styles from '../styles/components/SmartPasteZone.module.css';
import { Button } from './Button';

interface SmartPasteZoneProps {
  inputText: string;
  onInputChange: (text: string) => void;
  onClean: (text: string) => void;
  isProcessing: boolean;
  className?: string;
}

export const SmartPasteZone: React.FC<SmartPasteZoneProps> = ({
  inputText,
  onInputChange,
  onClean,
  isProcessing,
  className,
}) => {
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Submit on Ctrl+Enter
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      if (inputText.trim() && !isProcessing) {
        onClean(inputText);
      }
    }
  };

  return (
    <div className={`${styles.container} ${className || ''}`}>
      <div className={styles.textareaWrapper}>
        <textarea
          className={styles.textarea}
          value={inputText}
          onChange={(e) => onInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Paste anything here — or press Ctrl+Shift+V anywhere"
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

        <div className={styles.shortcutHint}>⌨ Ctrl+Shift+V</div>
      </div>

      <div className={styles.actions}>
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
