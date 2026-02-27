import React, { useEffect, useRef, useState } from "react";
import styles from "../styles/components/AppSidebar.module.css";
import type { AppTab } from "../types";
import appLogo from "../assets/app-logo.png";
import { hasSmartPasteBridge, invokeIPC } from "../lib/ipc";
import { useToastStore } from "../stores/useToastStore";

interface AppSidebarProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
}

const TABS: Array<{
  id: AppTab;
  label: string;
  icon: React.ReactNode;
}> = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: (
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
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="4" rx="1" />
        <rect x="14" y="11" width="7" height="10" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </svg>
    ),
  },
  {
    id: "paste",
    label: "Smart Paste",
    icon: (
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
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        <path d="M9 14l2 2 4-4" />
      </svg>
    ),
  },
  {
    id: "history",
    label: "History",
    icon: (
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
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
    ),
  },
  {
    id: "snippets",
    label: "Snippets",
    icon: (
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
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <line x1="10" y1="9" x2="8" y2="9" />
      </svg>
    ),
  },
  {
    id: "templates",
    label: "Templates",
    icon: (
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
        <rect x="3" y="3" width="18" height="18" rx="2" />
        <line x1="3" y1="9" x2="21" y2="9" />
        <line x1="9" y1="21" x2="9" y2="9" />
      </svg>
    ),
  },
  {
    id: "settings",
    label: "Settings",
    icon: (
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
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
      </svg>
    ),
  },
];

export const AppSidebar: React.FC<AppSidebarProps> = ({
  activeTab,
  onTabChange,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const { addToast } = useToastStore();

  // Persist theme preference
  const getInitialTheme = () =>
    (localStorage.getItem("theme") as "dark" | "light" | null) ?? "dark";

  const [theme, setTheme] = useState<"dark" | "light">(getInitialTheme);
  const [activeSignals, setActiveSignals] = useState<{
    multiCollecting: boolean;
    multiItems: number;
    macroRecording: boolean;
    telemetryDegraded: boolean;
  }>({
    multiCollecting: false,
    multiItems: 0,
    macroRecording: false,
    telemetryDegraded: false,
  });

  // App version — read statically from package.json (no IPC needed)
  const appVersion = "0.1.0";

  // On mount: read theme from IPC and sync
  useEffect(() => {
    if (!hasSmartPasteBridge()) {
      return;
    }

    invokeIPC<{ general?: { theme?: string } }>("settings:get")
      .then((s) => {
        const ipcTheme = (s?.general?.theme as "dark" | "light") ?? null;
        if (ipcTheme && ipcTheme !== theme) {
          setTheme(ipcTheme);
        }
      })
      .catch((err) => {
        addToast({
          title: "Settings Sync Failed",
          message: err instanceof Error ? err.message : String(err),
          type: "error",
        });
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addToast]);

  // On change: apply DOM, persist, sync to IPC
  useEffect(() => {
    if (theme === "light") {
      document.documentElement.setAttribute("data-theme", "light");
    } else {
      document.documentElement.removeAttribute("data-theme");
    }
    localStorage.setItem("theme", theme);
    if (!hasSmartPasteBridge()) {
      return;
    }

    invokeIPC("settings:update", { general: { theme } }).catch((err) => {
      addToast({
        title: "Theme Save Failed",
        message: err instanceof Error ? err.message : String(err),
        type: "error",
      });
    });
  }, [addToast, theme]);

  useEffect(() => {
    let multiFailures = 0;
    let warned = false;

    const readMacroFlag = () => {
      const active = localStorage.getItem("sph_macro_recording") === "1";
      setActiveSignals((prev) => ({ ...prev, macroRecording: active }));
    };

    const syncMultiState = async () => {
      if (!hasSmartPasteBridge()) {
        return;
      }
      try {
        const multi = await invokeIPC<{
          isCollecting: boolean;
          items: string[];
        }>("multi:state");
        setActiveSignals((prev) => ({
          ...prev,
          multiCollecting: Boolean(multi?.isCollecting),
          multiItems: Array.isArray(multi?.items) ? multi.items.length : 0,
          telemetryDegraded: false,
        }));
        if (warned && multiFailures >= 3) {
          addToast({
            title: "Sidebar recovered",
            message: "Background status is synced again",
            type: "info",
            duration: 1800,
          });
        }
        multiFailures = 0;
        warned = false;
      } catch {
        multiFailures += 1;
        if (multiFailures >= 3 && !warned) {
          warned = true;
          setActiveSignals((prev) => ({ ...prev, telemetryDegraded: true }));
          addToast({
            title: "Sidebar status delayed",
            message: "Unable to refresh Multi-Copy status",
            type: "warning",
            duration: 2600,
          });
        }
      }
    };

    readMacroFlag();
    void syncMultiState();
    const intervalId = window.setInterval(() => {
      readMacroFlag();
      void syncMultiState();
    }, 2500);

    const macroHandler = () => {
      readMacroFlag();
    };
    window.addEventListener("sph:macro-recording", macroHandler);

    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener("sph:macro-recording", macroHandler);
    };
  }, [addToast]);

  const hasActiveModes =
    activeSignals.multiCollecting || activeSignals.macroRecording;
  const showStatusStrip = hasActiveModes || activeSignals.telemetryDegraded;

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      const next = (index + 1) % TABS.length;
      (menuRef.current?.children[next] as HTMLButtonElement)?.focus();
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      const prev = (index - 1 + TABS.length) % TABS.length;
      (menuRef.current?.children[prev] as HTMLButtonElement)?.focus();
    }
  };

  return (
    <div className={styles.sidebar}>
      {/* Logo */}
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <img src={appLogo} alt="SmartPasteHub" className={styles.logoImage} />
        </div>
        <div className={styles.logoText}>
          <span className={styles.logoName}>SmartPaste</span>
          <span className={styles.logoTagline}>Hub</span>
        </div>
      </div>

      {showStatusStrip && (
        <div className={styles.statusStrip}>
          {activeSignals.multiCollecting && (
            <span className={styles.statusChip}>
              ● Multi-Copy ({activeSignals.multiItems})
            </span>
          )}
          {activeSignals.macroRecording && (
            <span className={styles.statusChip}>● Macro Recording</span>
          )}
          {activeSignals.telemetryDegraded && (
            <span className={styles.statusChipWarn}>● Status Delayed</span>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav
        className={styles.nav}
        ref={menuRef}
        role="menu"
        aria-label="Main navigation"
      >
        {TABS.map((tab, index) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              role="menuitem"
              className={`${styles.navItem} ${isActive ? styles.active : ""}`}
              onClick={() => onTabChange(tab.id)}
              onKeyDown={(e) => handleKeyDown(e, index)}
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
              title={tab.label}
            >
              {isActive && <div className={styles.activePill} />}
              <span className={styles.icon}>{tab.icon}</span>
              <span className={styles.label}>{tab.label}</span>
              {tab.id === "paste" && hasActiveModes && (
                <span className={styles.badge}>Active</span>
              )}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={styles.footer}>
        <button className={styles.helpBtn} aria-label="Help" title="Help">
          <span className={styles.icon}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
          </span>
          <span className={styles.helpLabel}>Help</span>
        </button>

        {/* Inline theme toggle */}
        <div className={styles.themeRow}>
          <span className={styles.themeLabel}>Theme</span>
          <div className={styles.themeToggle}>
            <button
              className={`${styles.themeBtn} ${theme === "dark" ? styles.themeBtnActive : ""}`}
              onClick={() => setTheme("dark")}
              aria-label="Dark mode"
              title="Dark mode"
            >
              🌙
            </button>
            <button
              className={`${styles.themeBtn} ${theme === "light" ? styles.themeBtnActive : ""}`}
              onClick={() => setTheme("light")}
              aria-label="Light mode"
              title="Light mode"
            >
              ☀️
            </button>
          </div>
        </div>
        {appVersion && <div className={styles.versionLabel}>v{appVersion}</div>}
      </div>
    </div>
  );
};
