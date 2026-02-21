import React, { useEffect, useRef } from 'react';
import styles from '../styles/components/AppSidebar.module.css';
import { useI18n } from '../hooks/useI18n';
import type { AppTab } from '../types';

interface AppSidebarProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

const TABS: Array<{ id: AppTab; tooltip: string; icon: React.ReactNode }> = [
  {
    id: 'paste',
    tooltip: 'Smart Paste',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
        <path d="M15 11l-3 3-3-3"></path>
        <path d="M12 14v-6"></path>
      </svg>
    ),
  },
  {
    id: 'history',
    tooltip: 'History',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="10"></circle>
        <polyline points="12 6 12 12 16 14"></polyline>
      </svg>
    ),
  },
  {
    id: 'settings',
    tooltip: 'Settings',
    icon: (
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <circle cx="12" cy="12" r="3"></circle>
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
      </svg>
    ),
  },
];

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  onTabChange,
}) => {
  const { t } = useI18n();
  const menuRef = useRef<HTMLDivElement>(null);

  // Keyboard navigation within sidebar
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const nextIndex = (index + 1) % TABS.length;
      const nextBtn = menuRef.current?.children[nextIndex] as HTMLButtonElement;
      nextBtn?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prevIndex = (index - 1 + TABS.length) % TABS.length;
      const prevBtn = menuRef.current?.children[prevIndex] as HTMLButtonElement;
      prevBtn?.focus();
    }
  };

  return (
    <div className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--accent-primary)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
          </svg>
        </div>
      </div>

      <nav className={styles.nav} ref={menuRef} role="menu">
        {TABS.map((tab, index) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="menuitem"
              className={`${styles.navItem} ${isActive ? styles.active : ''}`}
              onClick={() => onTabChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              aria-label={tab.tooltip}
              aria-current={isActive ? 'page' : undefined}
              title={tab.tooltip} // Simple native tooltip for clean UI
            >
              {isActive && <div className={styles.activePill} />}
              <span className={styles.icon}>{tab.icon}</span>
            </button>
          );
        })}
      </nav>

      <div className={styles.footer}>
        <button
          className={styles.helpBtn}
          aria-label={t('common.help') || 'Help'}
          title={t('common.help') || 'Help'}
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </button>
      </div>
    </div>
  );
};
