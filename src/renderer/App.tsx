import { useCallback, useEffect, useState } from "react";
import "./styles/globals.css";
import "./i18n";
import { Onboarding } from "./components/Onboarding";
import { AppLayout } from "./components/AppLayout";
import { AppSidebar } from "./components/AppSidebar";
import { SmartPastePage } from "./pages/SmartPastePage";
import { HistoryPage } from "./pages/HistoryPage";
import { SettingsPage } from "./pages/SettingsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { SnippetsPage } from "./pages/placeholders/SnippetsPage";
import { TemplatesPage } from "./pages/placeholders/TemplatesPage";
import OCRPopup from "./windows/OCRPopup";
import WebClipper from "./windows/WebClipper";
import DragDropZone from "./windows/DragDropZone";
import AutoChart from "./windows/AutoChart";
import PasteHistoryRing from "./windows/PasteHistoryRing";
import QRBridge from "./windows/QRBridge";
import TemplateForm from "./windows/TemplateForm";
import { ToastContainer } from "./components/Toast";
import { useToastStore } from "./stores/useToastStore";
import { invokeIPC, onIPC } from "./lib/ipc";
import { applyThemeToRoot } from "./lib/theme-sync";
import type { AppTab } from "./types";
import type { AppSettings } from "../shared/types";
import type { IPCEvents } from "../shared/ipc-types";
import i18n from "i18next";

interface AppProps {
  initialTab?: AppTab;
}

// Floating window hash-router — detect if opened as a standalone floating window
const FLOATING_HASH = window.location.hash.replace("#", "");
export const App: React.FC<AppProps> = ({ initialTab = "paste" }) => {
  const [activeTab, setActiveTab] = useState<AppTab>(initialTab);

  useEffect(() => {
    let mounted = true;

    const loadLanguage = async () => {
      try {
        const appSettings = await invokeIPC<AppSettings>("settings:get");
        const lang = appSettings?.general?.language;
        if (!mounted || (lang !== "id" && lang !== "en")) {
          return;
        }
        if (i18n.language !== lang) {
          await i18n.changeLanguage(lang);
        }
      } catch {
        // noop
      }
    };

    const onLanguageChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ language?: "id" | "en" }>).detail;
      const lang = detail?.language;
      if (lang === "id" || lang === "en") {
        void i18n.changeLanguage(lang);
      }
    };

    void loadLanguage();
    window.addEventListener("app:language-changed", onLanguageChanged);

    const onThemeChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ theme?: string }>).detail;
      if (detail?.theme) {
        applyThemeToRoot(detail.theme);
      }
    };

    const initialTheme = localStorage.getItem("theme") || "dark";
    applyThemeToRoot(initialTheme);
    window.addEventListener("app:theme-changed", onThemeChanged);

    return () => {
      mounted = false;
      window.removeEventListener("app:language-changed", onLanguageChanged);
      window.removeEventListener("app:theme-changed", onThemeChanged);
    };
  }, []);

  useEffect(() => {
    if (!window.smartpaste) {
      return;
    }

    let lastSentKey = "";
    let lastSentAt = 0;

    const shouldSend = (key: string): boolean => {
      const now = Date.now();
      if (key === lastSentKey && now - lastSentAt < 4000) {
        return false;
      }
      lastSentKey = key;
      lastSentAt = now;
      return true;
    };

    const sendRendererError = (payload: {
      message: string;
      stack?: string;
      source?: string;
      line?: number;
      column?: number;
      kind?: "error" | "unhandledrejection";
    }) => {
      const key = `${payload.kind}:${payload.message}:${payload.source ?? ""}`;
      if (!shouldSend(key)) {
        return;
      }
      invokeIPC<boolean>("diagnostics:renderer-error", payload).catch(() => {
        // Best effort, never break UI for telemetry.
      });
    };

    const onError = (event: ErrorEvent) => {
      sendRendererError({
        message: event.message || "Unknown renderer error",
        stack: event.error instanceof Error ? event.error.stack : undefined,
        source: event.filename,
        line: event.lineno,
        column: event.colno,
        kind: "error",
      });
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      const reasonMessage =
        reason instanceof Error ? reason.message : String(reason);
      sendRendererError({
        message: reasonMessage,
        stack: reason instanceof Error ? reason.stack : undefined,
        kind: "unhandledrejection",
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem("onboarded"),
  );
  const { addToast } = useToastStore();

  useEffect(() => {
    const handleOpenOnboarding = () => {
      setShowOnboarding(true);
    };

    window.addEventListener("app:open-onboarding", handleOpenOnboarding);
    return () => {
      window.removeEventListener("app:open-onboarding", handleOpenOnboarding);
    };
  }, []);

  const announce = useCallback((message: string) => {
    const announcer = document.getElementById("sr-announcer");
    if (!announcer) {
      return;
    }
    announcer.textContent = "";
    requestAnimationFrame(() => {
      announcer.textContent = message;
    });
  }, []);

  // Keyboard navigation for tabs
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === "1") {
          e.preventDefault();
          setActiveTab("paste");
        } else if (e.key === "2") {
          e.preventDefault();
          setActiveTab("history");
        } else if (e.key === "3") {
          e.preventDefault();
          setActiveTab("settings");
        } else if (e.key === "4") {
          e.preventDefault();
          setActiveTab("dashboard");
        }
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, []);

  // Global IPC Listeners (must be preserved)
  useEffect(() => {
    const unsubSecurity = onIPC("security:alert", (_payload: IPCEvents["security:alert"]) => {
      announce("Warning: sensitive data detected.");
      addToast({
        title: "Sensitive Data Detected",
        message: "Your clipboard content contains sensitive information.",
        type: "warning",
        duration: 8000,
      });
    });

    const unsubPolicy = onIPC("security:policy", (payload: IPCEvents["security:policy"]) => {
      const action = payload?.action;
      const reason = String(payload?.reason ?? "Security policy applied");
      const targetApp = String(payload?.targetApp ?? "unknown app");

      if (action === "block") {
        announce("Paste blocked by security policy.");
        addToast({
          title: "Paste Blocked",
          message: `${targetApp}: ${reason}`,
          type: "error",
          duration: 9000,
        });
        return;
      }

      announce("Security reminder shown.");

      addToast({
        title: "Security Reminder",
        message: `${targetApp}: ${reason}`,
        type: "warning",
        duration: 7000,
      });
    });
    const unsubClipboard = onIPC("clipboard:content", (payload: IPCEvents["clipboard:content"]) => {
      const type = payload?.type ?? "plain_text";
      if (type === "multi_clipboard") {
        const count = Number(payload?.mergedCount ?? 0);
        const max = Number(payload?.maxItems ?? 10);
        announce("Multi-copy updated.");
        addToast({
          title: "Multi-Copy",
          message: `${count}/${max} items collected`,
          type: "info",
          duration: 2500,
        });
        return;
      }

      if (type === "paste_queue") {
        const count = Number(payload?.mergedCount ?? 0);
        announce("Paste queue updated.");
        addToast({
          title: "Paste Queue",
          message:
            count > 0
              ? `Queue has ${count} item${count > 1 ? "s" : ""}. ${String(payload?.text ?? "")}`
              : "Queue is empty",
          type: "info",
          duration: 2500,
        });
        return;
      }

      announce("Content copied.");
      addToast({
        title: "Copied to Clipboard",
        message: "Content ready to be pasted",
        type: "info",
        duration: 3000,
      });
    });
    const unsubCleaned = onIPC("clipboard:cleaned", () => {
      announce("Clipboard cleaned.");
      addToast({
        title: "Clipboard Cleaned",
        message: "Content auto-cleaned via hotkey",
        type: "success",
        duration: 3000,
      });
    });

    const unsubAutoCleared = onIPC("clipboard:auto-cleared", (payload: IPCEvents["clipboard:auto-cleared"]) => {
      const seconds = Number(payload?.seconds ?? 0);
      announce("Clipboard auto-cleared.");
      addToast({
        title: "Clipboard Auto-Cleared",
        message:
          seconds > 0
            ? `Clipboard cleared after ${seconds}s`
            : "Clipboard was automatically cleared",
        type: "info",
        duration: 3500,
      });
    });

    const unsubSyncConnected = onIPC("sync:connected", () => {
      announce("Sync connected.");
      addToast({
        title: "Sync Connected",
        message: "Secure clipboard sync is now online",
        type: "success",
        duration: 3500,
      });
    });

    const unsubSyncDisconnected = onIPC("sync:disconnected", () => {
      announce("Sync disconnected.");
      addToast({
        title: "Sync Disconnected",
        message: "Clipboard sync connection has closed",
        type: "warning",
        duration: 4000,
      });
    });

    const unsubSyncReceived = onIPC("sync:received", (payload: IPCEvents["sync:received"]) => {
      const fromDevice = String(payload?.fromDeviceId ?? "another device");
      announce("Clipboard received from paired device.");
      addToast({
        title: "Clipboard Received",
        message: `From ${fromDevice}`,
        type: "info",
        duration: 3500,
      });
    });

    return () => {
      unsubSecurity();
      unsubPolicy();
      unsubClipboard();
      unsubCleaned();
      unsubAutoCleared();
      unsubSyncConnected();
      unsubSyncDisconnected();
      unsubSyncReceived();
    };
  }, [addToast, announce]);

  // Floating windows still share the same top-level hook order.
  if (FLOATING_HASH === "/ocr") return <OCRPopup />;
  if (FLOATING_HASH === "/web-clipper") return <WebClipper />;
  if (FLOATING_HASH === "/drag-drop-zone") return <DragDropZone />;
  if (FLOATING_HASH === "/auto-chart") return <AutoChart />;
  if (FLOATING_HASH === "/paste-history-ring") return <PasteHistoryRing />;
  if (FLOATING_HASH === "/qr-bridge") return <QRBridge />;
  if (FLOATING_HASH === "/template-form") return <TemplateForm />;

  return (
    <>
      <a className="skip-link" href="#app-main-content">
        Skip to main content
      </a>
      {showOnboarding && (
        <Onboarding
          onNavigate={(tab) => setActiveTab(tab)}
          onComplete={() => {
            localStorage.setItem("onboarded", "1");
            setShowOnboarding(false);
          }}
        />
      )}
      <div
        id="sr-announcer"
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      ></div>
      <AppLayout
        mainId="app-main-content"
        sidebar={
          <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        }
      >
        {activeTab === "dashboard" && (
          <DashboardPage
            onQuickAction={(target) => {
              if (target === "paste") setActiveTab("paste");
              if (target === "history") setActiveTab("history");
              if (target === "settings") setActiveTab("settings");
            }}
          />
        )}
        {activeTab === "paste" && <SmartPastePage />}
        {activeTab === "history" && <HistoryPage />}
        {activeTab === "snippets" && <SnippetsPage />}
        {activeTab === "templates" && <TemplatesPage />}
        {activeTab === "settings" && <SettingsPage />}
      </AppLayout>
      <ToastContainer />
    </>
  );
};

export default App;
