import {
  app,
  BrowserWindow,
  Notification,
  Tray,
  crashReporter,
} from "electron";
import { ClipboardWatcher } from "./clipboard-watcher";
import {
  createTray,
  setIncognitoActive,
  updateTrayAutoCleanState,
} from "./tray-manager";
import { unregisterAllHotkeys } from "./hotkey-manager";
import { registerIpcHandlers } from "./ipc-handlers";
import { Database } from "./db";
import { getSettings, updateSettings } from "./settings-store";
import { logger } from "../shared/logger";
import { disconnectSync, setSyncEventHandlers } from "../sync/sync-manager";
import { ContextMenuManager } from "./utils/context-menu";
import { getLearnedPasteMethods } from "./paste-fallback-engine";
import { destroyHud, showHud } from "./hud-manager";
import { SnippetsRepository } from "./repositories/snippets.repo";
import { UsageStatsRepository } from "./repositories/usage-stats.repo";
import { ContextRulesRepository } from "./repositories/context-rules.repo";
import { createFloatingWindow, createMainWindow } from "./window-factory";
import {
  configurePasteFlowRuntime,
  getSessionCleanCount,
  setPasteFlowRepositories,
  submitPasteFeedback,
} from "./paste-flow";
import {
  configureHotkeySetup,
  setupHotkeys,
  translateClipboard,
  triggerGhostWrite,
} from "./hotkey-setup";
import { wireClipboardWatcher } from "./clipboard-handler";
import { handleContextMenuArgs } from "./context-menu-handler";
import { setupSyncRuntime } from "./sync-setup";
import { setupExtensionServer } from "./extension-server";
import { setupAutoUpdater } from "./auto-updater";
import { telemetry } from "./telemetry";
import { pushObservabilityEvent } from "./observability";
import { registerBuiltinPlugins } from "../plugins/builtin";

declare global {
  // eslint-disable-next-line no-var
  var appIsQuiting: boolean;
}
global.appIsQuiting = false;

// Must be called BEFORE app.whenReady() on Windows.
// Without this, the OS associates the taskbar entry with electron.exe
// and shows the generic Electron atom icon instead of our custom icon.
if (process.platform === "win32") {
  app.setAppUserModelId("com.smartpastehub.app");
}
app.setName("SmartPasteHub");

let incognitoMode = false;
export function isIncognito(): boolean {
  return incognitoMode;
}

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;
let db: Database | null = null;
const watcher = new ClipboardWatcher();

function initializeCrashReporter(): void {
  try {
    crashReporter.start({
      submitURL: "",
      uploadToServer: false,
      compress: true,
      ignoreSystemCrashHandler: false,
    });
    logger.info("Crash reporter initialized", {
      crashDumpsPath: app.getPath("crashDumps"),
    });
  } catch (error) {
    logger.warn("Crash reporter initialization failed", { error });
  }
}

initializeCrashReporter();

function registerProcessHealthObservers(): void {
  app.on("render-process-gone", (_event, webContents, details) => {
    logger.error("Renderer process exited unexpectedly", {
      reason: details.reason,
      exitCode: details.exitCode,
      url: webContents.getURL(),
    });
  });

  app.on("child-process-gone", (_event, details) => {
    logger.error("Child process exited unexpectedly", {
      type: details.type,
      reason: details.reason,
      exitCode: details.exitCode,
      serviceName: details.serviceName,
      name: details.name,
    });
  });

  app.on("web-contents-created", (_event, contents) => {
    contents.on("unresponsive", () => {
      logger.warn("Web contents became unresponsive", {
        id: contents.id,
        url: contents.getURL(),
      });
    });

    contents.on("responsive", () => {
      logger.info("Web contents recovered responsiveness", {
        id: contents.id,
        url: contents.getURL(),
      });
    });
  });
}

registerProcessHealthObservers();

async function initializeApp(): Promise<void> {
  db = new Database();
  const snippetsRepo = new SnippetsRepository(db);
  const usageStatsRepo = new UsageStatsRepository(db);
  const contextRulesRepo = new ContextRulesRepository(db);

  setPasteFlowRepositories({ snippetsRepo, usageStatsRepo, contextRulesRepo });
  configurePasteFlowRuntime({ getMainWindow: () => mainWindow });
  registerBuiltinPlugins();
  configureHotkeySetup({
    getMainWindow: () => mainWindow,
    createFloatingWindow,
  });

  mainWindow = createMainWindow(() => {
    mainWindow = null;
  });
  registerIpcHandlers(
    mainWindow,
    db,
    setupHotkeys,
    createFloatingWindow,
    () => getLearnedPasteMethods(),
    (payload) => submitPasteFeedback(payload),
  );

  await setupHotkeys();

  tray = createTray(
    () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    () => {
      if (mainWindow) {
        mainWindow.show();
        mainWindow.focus();
      }
    },
    () => {
      incognitoMode = !incognitoMode;
      setIncognitoActive(incognitoMode);
      showHud(
        {
          cleaned: incognitoMode
            ? "🕵️ Incognito ON — clipboard not recorded"
            : "🕵️ Incognito OFF — recording resumed",
          original: "",
          type: "system",
        },
        3000,
      );
    },
    {
      ghostWriteClipboard: () => {
        setTimeout(() => {
          triggerGhostWrite();
        }, 180);
      },
      translateClipboard: () => {
        void translateClipboard();
      },
    },
  );

  wireClipboardWatcher(watcher, {
    getMainWindow: () => mainWindow,
    isIncognito,
  });

  setSyncEventHandlers({
    onConnected(details) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("sync:connected", details);
      }
    },
    onDisconnected(details) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("sync:disconnected", details);
      }
    },
    onReceived(details) {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("sync:received", details);
      }
    },
  });

  await setupSyncRuntime(mainWindow);
  setupExtensionServer();
  setupAutoUpdater();

  const settings = await getSettings();
  telemetry.init(settings, app.getVersion());
  telemetry.track("app_start");
  if (settings.general.enableContextMenu) {
    const installed = await ContextMenuManager.install(
      settings.general.contextMenuMode ?? "top_level",
    );
    if (!installed) {
      logger.warn("Context menu install reported invalid status");
      showHud(
        {
          cleaned:
            "Context menu setup failed. Use Settings > Context Menu Repair to reinstall entries.",
          original: "",
          type: "system",
        },
        4500,
      );
    }
  } else {
    await ContextMenuManager.uninstall();
  }

  const startHidden = settings.general.startHidden ?? true;
  if (!startHidden) {
    mainWindow.show();
  }

  if (!settings.general.hasSeenOnboarding) {
    if (Notification.isSupported()) {
      new Notification({
        title: "SmartPasteHub is running",
        body: `Press ${settings.hotkeys.pasteClean} to clean clipboard. Right-click the tray icon for more options.`,
      }).show();
    }
    await updateSettings({
      general: { ...settings.general, hasSeenOnboarding: true },
    });
  }

  updateTrayAutoCleanState(settings.general.autoCleanOnCopy);

  if (app.isPackaged) {
    app.setLoginItemSettings({
      openAtLogin: settings.general.startOnBoot ?? false,
    });
  }

  watcher.on("change", (payload) => {
    if (tray && !tray.isDestroyed()) {
      const preview = payload.text.trim().slice(0, 30);
      tray.setToolTip(
        `SmartPasteHub${incognitoMode ? " 🕵️" : ""}\n📋 ${preview || "..."}\n✨ ${getSessionCleanCount()} cleans this session`,
      );
    }
  });
}

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on("second-instance", async (_event: unknown, commandLine: string[]) => {
    const handled = await handleContextMenuArgs(commandLine);
    if (!handled) {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

app.whenReady().then(async () => {
  await handleContextMenuArgs(process.argv);
  await initializeApp();
});

process.on("uncaughtException", (error) => {
  console.error("[uncaughtException]", error);
  try {
    logger.fatal("Uncaught exception", { error });
    telemetry.track("app_error", {
      scope: "main",
      kind: "uncaughtException",
      message: error?.message,
      stack: error?.stack,
    });
    pushObservabilityEvent({
      ts: new Date().toISOString(),
      kind: "policy",
      detail: "Main process uncaught exception",
      metadata: { message: error?.message },
    });
  } catch {
    // logger not ready
  }
});

process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
  try {
    logger.error("Unhandled rejection", { reason });
    const reasonMessage =
      reason instanceof Error ? reason.message : String(reason);
    telemetry.track("app_error", {
      scope: "main",
      kind: "unhandledRejection",
      message: reasonMessage,
      stack: reason instanceof Error ? reason.stack : undefined,
    });
    pushObservabilityEvent({
      ts: new Date().toISOString(),
      kind: "policy",
      detail: "Main process unhandled rejection",
      metadata: { message: reasonMessage },
    });
  } catch {
    // logger not ready
  }
});

app.on("window-all-closed", () => {
  return;
});

let beforeQuitTelemetryFlushed = false;
app.on("before-quit", (event: { preventDefault: () => void }) => {
  global.appIsQuiting = true;
  if (beforeQuitTelemetryFlushed) {
    return;
  }
  beforeQuitTelemetryFlushed = true;
  event.preventDefault();
  telemetry.track("app_quit");
  void telemetry.flush().finally(() => {
    app.quit();
  });
});

app.on("will-quit", () => {
  disconnectSync();
  unregisterAllHotkeys();
  watcher.stop();
  destroyHud();
  tray?.destroy();
  logger.flush();
});
