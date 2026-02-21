import React from 'react';
import styles from '../styles/components/AppLayout.module.css';

interface AppLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ sidebar, children }) => {
  return (
    <div className={styles.layout}>
      <aside className={styles.sidebarWrapper}>{sidebar}</aside>
      <main className={styles.mainContent}>{children}</main>
    </div>
  );
};
