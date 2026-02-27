import { clipboard } from "electron";
import { cleanContent } from "../../core/cleaner";
import { detectContentType } from "../../core/content-detector";
import { getSettings } from "../settings-store";
import { detectActiveAppSignal } from "../../security/active-app-detector";
import { evaluateContextGuard } from "../../security/context-guard";
import { IpcDependencies, SafeHandle } from "./contracts";
import { simulateTypeText } from "../paste-simulator";
import { detectSensitiveData } from "../../security/sensitive-detector";
import { maskData } from "../../security/data-masker";

export function registerClipboardIpc(
  safeHandle: SafeHandle,
  deps: Pick<
    IpcDependencies,
    "mainWindow" | "historyRepo" | "snippetsRepo" | "usageStatsRepo"
  >,
): void {
  safeHandle("clipboard:write", async (_, payload) => {
    const { text } = payload as { text?: string };
    clipboard.writeText(String(text ?? ""));
    return true;
  });

  safeHandle("clipboard:paste", async (_, payload) => {
    const { preset, text, html } = payload as {
      preset: string;
      text: string;
      html?: string;
    };
    const content = { text, html };
    const result = await cleanContent(content);
    const detected = detectContentType(content.text, content.html);
    const activeApp = await detectActiveAppSignal();
    const settings = await getSettings();
    const decision = evaluateContextGuard({
      hasSensitiveData: Boolean(result.securityAlert),
      activeApp,
      autoClearEnabled: settings.security.autoClear,
      defaultAutoClearSeconds: settings.security.clearTimerSeconds,
      unknownContextAction: settings.security.unknownContextAction,
    });

    if (decision.action === "block") {
      if (!deps.mainWindow.isDestroyed()) {
        deps.mainWindow.webContents.send("security:policy", {
          action: decision.action,
          reason: decision.reason,
          targetApp: activeApp.appName,
          appType: activeApp.appType,
        });
      }
      return {
        ...result,
        blocked: true,
        policy: decision,
      };
    }

    deps.historyRepo.create({
      originalText: content.text,
      cleanedText: result.cleaned,
      htmlContent: content.html ?? null,
      contentType: detected.type,
      sourceApp: activeApp.appName,
      presetUsed: preset,
      charCount: result.cleaned.length,
      isSensitive: Boolean(result.securityAlert),
      aiMode: null,
    });

    deps.usageStatsRepo.incrementDaily({
      pasteCount: 1,
      charsCleaned: result.cleaned.length,
      tableConverts: (result.appliedTransforms ?? []).includes(
        "table-converter",
      )
        ? 1
        : 0,
    });

    // ── Auto-snippet from frequent copies (no.16) ─────────────────────────
    const dupeCount = deps.historyRepo.countRecentDuplicates(result.cleaned, 7);
    if (dupeCount >= 3) {
      const existingSnippet = deps.snippetsRepo
        .list()
        .find((s) => s.content === result.cleaned);
      if (!existingSnippet) {
        deps.snippetsRepo.create({
          name: `Auto: ${result.cleaned.slice(0, 30)}…`,
          content: result.cleaned,
          tags: ["auto"],
          category: "auto-frequent",
        });
        if (!deps.mainWindow.isDestroyed()) {
          deps.mainWindow.webContents.send("snippet:auto-created", {
            content: result.cleaned,
          });
        }
      }
    }

    if (!deps.mainWindow.isDestroyed()) {
      deps.mainWindow.webContents.send("clipboard:cleaned", {
        original: content.text,
        cleaned: result.cleaned,
        type: detected.type,
      });
      if (result.securityAlert) {
        deps.mainWindow.webContents.send(
          "security:alert",
          result.securityAlert,
        );
      }
      if (decision.action === "warn") {
        deps.mainWindow.webContents.send("security:policy", {
          action: decision.action,
          reason: decision.reason,
          targetApp: activeApp.appName,
          appType: activeApp.appType,
          autoClearAfterSeconds: decision.autoClearAfterSeconds,
        });
      }
    }
    return {
      ...result,
      policy: decision,
      targetApp: activeApp.appName,
      targetAppType: activeApp.appType,
    };
  });

  safeHandle("clipboard:detect", async (_, payload) => {
    const { text, html } = payload as { text: string; html?: string };
    return detectContentType(text, html);
  });

  safeHandle("clipboard:ghost-write", async (_, payload) => {
    const fallbackText = clipboard.readText();
    const providedText =
      typeof payload === "string"
        ? payload
        : String((payload as { text?: unknown } | null)?.text ?? fallbackText);

    const text = providedText.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
    if (!text.trim()) {
      return {
        ok: false,
        message: "Nothing to ghost-write",
        typedChars: 0,
        truncated: false,
      };
    }

    const maxGhostChars = 5000;
    const truncated = text.length > maxGhostChars;
    const textToType = truncated ? text.slice(0, maxGhostChars) : text;
    const ok = simulateTypeText(textToType);

    return {
      ok,
      message: ok
        ? `Ghost writing ${textToType.length} chars${truncated ? " (truncated)" : ""}`
        : "Ghost writing failed on this platform/session",
      typedChars: textToType.length,
      truncated,
    };
  });

  safeHandle("clipboard:redact", async (_, payload) => {
    const { text } = payload as { text: string };
    const matches = detectSensitiveData(text);
    if (matches.length === 0) {
      return { redacted: text, count: 0 };
    }
    const redacted = maskData(text, matches, "full");
    return { redacted, count: matches.length };
  });
}
