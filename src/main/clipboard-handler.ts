import { BrowserWindow, clipboard } from "electron";
import { ClipboardWatcher, ClipboardPayload } from "./clipboard-watcher";
import { getSettings } from "./settings-store";
import { detectActiveAppSignal } from "../security/active-app-detector";
import { addItem, getMultiClipboard } from "../productivity/multi-clipboard";
import { detectContentType } from "../core/content-detector";
import { isSnoozed } from "./tray-manager";
import { showHud } from "./hud-manager";
import {
  getSnippetsRepo,
  performClean,
  setCopySourceApp,
  wasRecentlyCleaned,
} from "./paste-flow";

export function wireClipboardWatcher(
  watcher: ClipboardWatcher,
  deps: {
    getMainWindow: () => BrowserWindow | null;
    isIncognito: () => boolean;
  },
): void {
  watcher.start();
  watcher.on("change", async (payload: ClipboardPayload) => {
    if (deps.isIncognito()) return;
    const settings = await getSettings();

    const appSignal = await detectActiveAppSignal();
    if (appSignal.detected) {
      setCopySourceApp(appSignal.appName);
    }
    const appFilter = settings.appFilter ?? {
      mode: "off" as const,
      apps: [] as string[],
    };
    if (appFilter.mode !== "off" && appSignal.detected) {
      const appName = appSignal.appName.toLowerCase();
      const matched = appFilter.apps.some((pattern) =>
        appName.includes(pattern),
      );
      if (appFilter.mode === "whitelist" && !matched) return;
      if (appFilter.mode === "blacklist" && matched) return;
    }

    const multiState = getMultiClipboard();
    if (multiState.isCollecting) {
      addItem(payload.text);
      const updated = getMultiClipboard();
      const mainWindow = deps.getMainWindow();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("clipboard:content", {
          ...payload,
          type: "multi_clipboard",
          mergedCount: updated.items.length,
          maxItems: updated.maxItems,
        });
      }
      return;
    }

    const snippetsRepo = getSnippetsRepo();
    if (payload.text.startsWith(";") && snippetsRepo) {
      const firstToken = payload.text.split(/\s/)[0] ?? "";
      const trigger = firstToken.slice(1).toLowerCase();
      if (trigger) {
        const snippets = snippetsRepo.list();
        const found = snippets.find(
          (snippet) =>
            snippet.name.toLowerCase().startsWith(trigger) ||
            (snippet.tags && snippet.tags.toLowerCase().includes(trigger)),
        );
        if (found) {
          clipboard.writeText(found.content);
          showHud(
            {
              cleaned: `🔖 Snippet expanded: ${found.name}`,
              original: payload.text,
              type: "system",
            },
            3000,
          );
          return;
        }
      }
    }

    if (settings.general.autoCleanOnCopy && !isSnoozed()) {
      const autoKb = Math.round(payload.text.length / 1024);
      if (autoKb > 50) {
        showHud(
          {
            cleaned: `⚠️ Large clipboard (${autoKb}KB) — skipped auto-clean`,
            original: payload.text,
            type: "size_warning",
            sizeKb: autoKb,
          },
          6000,
        );
        return;
      }
      if (wasRecentlyCleaned(payload.text)) {
        showHud(
          {
            cleaned: "📋 Already cleaned recently — skipped",
            original: payload.text,
            type: "system",
          },
          1500,
        );
        return;
      }
      await performClean(payload.text, payload.html ?? "", "auto");
      return;
    }

    const mainWindow = deps.getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      const detected = detectContentType(payload.text);
      mainWindow.webContents.send("clipboard:content", {
        ...payload,
        content_type: detected.type,
      });
    }
  });
}
