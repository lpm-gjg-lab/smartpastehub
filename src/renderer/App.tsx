import { useCallback, useEffect, useState } from "react";
import "./styles/globals.css";
import { Onboarding } from "./components/Onboarding";
import { AppLayout } from "./components/AppLayout";
import { AppSidebar } from "./components/AppSidebar";
import { SmartPastePage } from "./pages/SmartPastePage";
import { HistoryPage } from "./pages/HistoryPage";
import { SettingsPage } from "./pages/SettingsPage";
import { DashboardPage } from "./pages/DashboardPage";
import {
  SnippetsPage,
  TemplatesPage,
} from "./pages/Placeholders";
import OCRPopup from "./windows/OCRPopup";
import WebClipper from "./windows/WebClipper";
import DragDropZone from "./windows/DragDropZone";
import AutoChart from "./windows/AutoChart";
import PasteHistoryRing from "./windows/PasteHistoryRing";
import QRBridge from "./windows/QRBridge";
import TemplateForm from "./windows/TemplateForm";
import { ToastContainer } from "./components/Toast";
import { useToastStore } from "./stores/useToastStore";
import { onIPC } from "./lib/ipc";
import type { AppTab } from "./types";

interface AppProps {
  initialTab?: AppTab;
}

// Floating window hash-router — detect if opened as a standalone floating window
const FLOATING_HASH = window.location.hash.replace("#", "");
export const App: React.FC<AppProps> = ({ initialTab = "paste" }) => {
  const [activeTab, setActiveTab] = useState<AppTab>(initialTab);

  // Early return: render standalone floating window components
  if (FLOATING_HASH === "/ocr") return <OCRPopup />;
  if (FLOATING_HASH === "/web-clipper") return <WebClipper />;
  if (FLOATING_HASH === "/drag-drop-zone") return <DragDropZone />;
  if (FLOATING_HASH === "/auto-chart") return <AutoChart />;
  if (FLOATING_HASH === "/paste-history-ring") return <PasteHistoryRing />;
  if (FLOATING_HASH === "/qr-bridge") return <QRBridge />;
  if (FLOATING_HASH === "/template-form") return <TemplateForm />;
  const [showOnboarding, setShowOnboarding] = useState(
    () => !localStorage.getItem("onboarded"),
  );
  const { addToast } = useToastStore();

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
    const unsubSecurity = onIPC("security:alert", (payload: any) => {
      announce("Warning: sensitive data detected.");
      addToast({
        title: "Sensitive Data Detected",
        message: "Your clipboard content contains sensitive information.",
        type: "warning",
        duration: 8000,
      });
    });

    const unsubPolicy = onIPC("security:policy", (payload: any) => {
      const action = payload?.action as string | undefined;
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

    const unsubRecovery = onIPC("recovery:restored", () => {
      announce("Session restored.");
      addToast({
        title: "Session Restored",
        message: "Recovered from unexpected shutdown",
        type: "info",
      });
    });

    const unsubClipboard = onIPC("clipboard:content", (payload: any) => {
      const type = String(payload?.type ?? "plain_text");
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

    const unsubAutoCleared = onIPC("clipboard:auto-cleared", (payload: any) => {
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

    const unsubSyncReceived = onIPC("sync:received", (payload: any) => {
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
      unsubRecovery();
      unsubClipboard();
      unsubCleaned();
      unsubAutoCleared();
      unsubSyncConnected();
      unsubSyncDisconnected();
      unsubSyncReceived();
    };
  }, [addToast, announce]);

  return (
    <>
      {showOnboarding && (
        <Onboarding
          onComplete={() => {
            localStorage.setItem("onboarded", "1");
            setShowOnboarding(false);
          }}
        />
      )}
      <div id="sr-announcer" className="sr-only" aria-live="polite"></div>
      <AppLayout
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
