import React from 'react';
import styles from '../../styles/components/ToastWindow.module.css';
import { ToastData } from '../../hooks/useToastData';

interface Props {
  data: ToastData;
  isAiLoading: boolean;
  copied: boolean;
  onAction: (action: string) => void;
}

export function ToastActionBar({ data, isAiLoading, copied, onAction }: Props) {
  if (data.type === 'bypass_mode' || data.type === 'system') {
    return null;
  }

  const renderContextButtons = () => {
    switch (data.type) {
      case 'math_expression':
        return (
          <button className={styles.actionBtn} onClick={() => onAction('calculate')} disabled={isAiLoading}>
            🧮 Calculate
          </button>
        );
      case 'color_code':
        return (
          <button className={styles.actionBtn} onClick={() => onAction('convert_color')} disabled={isAiLoading}>
            🎨 Convert Format
          </button>
        );
      case 'path_text':
        return (
          <button className={styles.actionBtn} onClick={() => onAction('extract_file')} disabled={isAiLoading}>
            📄 Extract Content
          </button>
        );
      case 'url_text':
        return (
          <button className={styles.actionBtn} onClick={() => onAction('scrape_url')} disabled={isAiLoading} title="Convert Article to Markdown">
            {isAiLoading ? '🕸️ Scraping...' : '🕸️ Scrape Article'}
          </button>
        );
      case 'md_text':
        return (
          <button className={styles.actionBtn} onClick={() => onAction('convert_md')} disabled={isAiLoading} title="Convert to Rich Text">
            📝 Make Rich Text
          </button>
        );
      case 'text_with_links':
        return (
          <button className={styles.actionBtn} onClick={() => onAction('open_links')} disabled={isAiLoading} title="Extract and open links">
            🔗 Open Links
          </button>
        );
      default:
        return (
          <>
            <button className={styles.actionBtn} onClick={() => onAction('make_secret')} disabled={isAiLoading} title="Create 1-time secret link">
              {isAiLoading ? 'Encrypting...' : '💣 Secret Link'}
            </button>
            <button className={styles.actionBtn} onClick={() => onAction('summarize')} disabled={isAiLoading}>
              {isAiLoading ? '✨ Thinking...' : '📝 Summarize'}
            </button>
          </>
        );
    }
  };

  return (
    <div className={styles.actions}>
      {renderContextButtons()}
      <button className={styles.actionBtn} onClick={() => onAction('UPPERCASE')} disabled={isAiLoading}>
        {copied ? 'Copied!' : 'UPPERCASE'}
      </button>
    </div>
  );
}
