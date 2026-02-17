import React from 'react';
import styles from '../styles/components/Layout.module.css';
import { Sidebar } from './Sidebar';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, onTabChange }) => {
  return (
    <div className={styles.layout}>
      <Sidebar activeTab={activeTab} onTabChange={onTabChange} />
      <main className={styles.main} role="main">
        {children}
      </main>
    </div>
  );
};
