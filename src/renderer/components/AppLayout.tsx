import React from "react";
import styles from "../styles/components/AppLayout.module.css";

interface AppLayoutProps {
  sidebar: React.ReactNode;
  children: React.ReactNode;
  mainId?: string;
}

export const AppLayout: React.FC<AppLayoutProps> = ({
  sidebar,
  children,
  mainId,
}) => {
  return (
    <div className={styles.layout}>
      <aside className={styles.sidebarWrapper}>{sidebar}</aside>
      <main id={mainId} className={styles.mainContent} tabIndex={-1}>
        {children}
      </main>
    </div>
  );
};
