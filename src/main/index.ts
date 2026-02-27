import fs from "fs";
import {
  app,
  BrowserWindow,
  clipboard,
  Notification,
  nativeImage,
} from "electron";
import path from "path";
import { ClipboardWatcher } from "./clipboard-watcher";
import {
  createTray,
  updateTrayLastCleaned,
  isSnoozed,
  updateTrayAutoCleanState,
  setIncognitoActive,
} from "./tray-manager";
import { registerHotkey, unregisterAllHotkeys } from "./hotkey-manager";
import { registerIpcHandlers } from "./ipc-handlers";
import { cleanContent } from "../core/cleaner";
import { Database } from "./db";
import { getSettings, updateSettings } from "./settings-store";
import { scheduleClipboardClear } from "../security/auto-clear";
import { logger } from "../shared/logger";
import { detectActiveAppSignal } from "../security/active-app-detector";
import { evaluateContextGuard } from "../security/context-guard";
import {
  connectSync,
  disconnectSync,
  isSyncTransportRuntimeAvailable,
  setSyncEventHandlers,
} from "../sync/sync-manager";
import { addItem, getMultiClipboard } from "../productivity/multi-clipboard";
import { dequeue, size, peek } from "../productivity/paste-queue";
// import { autoUpdater } from "electron-updater";
import net from "net";
import { showHud, destroyHud } from "./hud-manager";
import { rewriteText } from "../ai/ai-rewriter";
import {
  buildAiCacheKey,
  consumeAiBudget,
  estimateTokenUsage,
  getCachedAiResult,
  rollbackAiBudget,
  setCachedAiResult,
  shouldUseAiAssist,
  trimTextForAi,
} from "../ai/ai-paste-optimizer";
import { simulateEnter, simulateTypeText } from "./paste-simulator";
import { SnippetsRepository } from "./repositories/snippets.repo";
import { UsageStatsRepository } from "./repositories/usage-stats.repo";
import { ContextRulesRepository } from "./repositories/context-rules.repo";
import { getHistoryRepo } from "./history-repo-ref";
import { detectContentType } from "../core/content-detector";
import { matchContextRule, DEFAULT_RULES } from "../core/context-rules";
import { RECOMMENDED_PASTE_HOTKEYS } from "../shared/constants";
import { captureRegion } from "../ocr/screen-capture";
import { recognizeText } from "../ocr/ocr-engine";
import { ContextMenuManager } from "./utils/context-menu";
import { applyAutomationTransforms } from "../core/automation-transforms";
import {
  buildRichClipboardHtml,
  detectFormattingIntent,
} from "../core/context-awareness";
import {
  applyExplicitPasteFeedback,
  learnPasteStrategyFeedback,
  planPasteStrategy,
} from "../core/paste-intelligence";
import {
  getLearnedPasteMethods,
  performPasteWithFallback,
} from "./paste-fallback-engine";
import { pushObservabilityEvent } from "./observability";
import { pushTimelineEvent } from "./timeline-cluster";

// Allow close handler to distinguish quit vs hide
declare global {
  // eslint-disable-next-line no-var
  var appIsQuiting: boolean;
}
global.appIsQuiting = false;
// ── Incognito mode ─────────────────────────────────────────────────────────────
let incognitoMode = false;
export function isIncognito(): boolean {
  return incognitoMode;
}

// ── Duplicate detection ────────────────────────────────────────────────────────
let lastCleanedText = "";
let lastCleanedAt = 0;
let snippetsRepo: SnippetsRepository | null = null;
let usageStatsRepo: UsageStatsRepository | null = null;
let contextRulesRepo: ContextRulesRepository | null = null;

// ── Context source tracking ───────────────────────────────────────────────────
// Tracks which app was active when user pressed Ctrl+C (copy source)
let copySourceApp: string | undefined = undefined;
let sessionCleanCount = 0;
let aiKeyErrorNotified = false;
let ocrHotkeyRunning = false;
let screenshotHotkeyRunning = false;
let pendingPreview: {
  text: string;
  html: string;
  cleaned: string;
  createdAt: number;
  sourceApp?: string;
  targetApp?: string;
  stats: string[];
} | null = null;
let clearSensitiveTimer: NodeJS.Timeout | null = null;
let lastPasteUndoText: string | null = null;
const learningCounters = new Map<string, number>();
let lastPasteFeedbackContext: {
  appName: string;
  contentType: import("../shared/types").ContentType;
  cleanedText: string;
  sourceHtml: string;
  expectedIntent: "plain_text" | "rich_text";
} | null = null;

const AI_MODES = [
  "auto",
  "fix_grammar",
  "formalize",
  "rephrase",
  "summarize",
] as const;
type AiModeCycle = (typeof AI_MODES)[number];

function aiModeLabel(mode: string): string {
  const map: Record<string, string> = {
    auto: "Auto",
    fix_grammar: "Fix Grammar",
    formalize: "Formalize",
    rephrase: "Rephrase",
    summarize: "Summarize",
    translate: "Translate",
  };
  return map[mode] ?? mode;
}

function resolveTrustMode(
  settings: Awaited<ReturnType<typeof getSettings>>,
  appName?: string,
): "strict" | "balanced" | "passthrough" {
  const app = String(appName ?? "").toLowerCase();
  const appModes = settings.automation?.appTrustModes ?? [];
  const matched = appModes.find((entry) =>
    app.includes(entry.appName.toLowerCase()),
  );
  return matched?.mode ?? settings.automation?.trustModeDefault ?? "balanced";
}

function scheduleEphemeralClipboardClear(ttlSeconds: number): void {
  if (clearSensitiveTimer) {
    clearTimeout(clearSensitiveTimer);
    clearSensitiveTimer = null;
  }
  const ttl = Math.max(5, ttlSeconds);
  clearSensitiveTimer = setTimeout(() => {
    clipboard.writeText("");
    pushObservabilityEvent({
      ts: new Date().toISOString(),
      kind: "policy",
      detail: "Ephemeral sensitive clipboard TTL elapsed",
    });
  }, ttl * 1000);
}

function inferSuggestedPreset(
  contentType: import("../shared/types").ContentType,
): string {
  if (contentType === "email_text") return "emailClean";
  if (
    contentType === "source_code" ||
    contentType === "json_data" ||
    contentType === "yaml_data" ||
    contentType === "toml_data"
  ) {
    return "codePassthrough";
  }
  return "keepStructure";
}

async function buildPreviewResult(
  text: string,
  html: string,
): Promise<{
  cleaned: string;
  stats: string[];
  sourceApp?: string;
  targetApp?: string;
}> {
  const settings = await getSettings();
  const quick = await cleanContent({ text, html });
  const activeApp = await detectActiveAppSignal();
  const detected = detectContentType(quick.cleaned);
  const automation = applyAutomationTransforms({
    text: quick.cleaned,
    contentType: detected.type,
    targetApp: activeApp.appName,
    enableSmartUrlTransform:
      settings.automation?.enableSmartUrlTransform ?? true,
    enableLocaleAwareness: settings.automation?.enableLocaleAwareness ?? true,
    enableIntentFieldDetection:
      settings.automation?.enableIntentFieldDetection ?? true,
    enableHealthGuard: settings.automation?.enableHealthGuard ?? true,
    enablePrivacyFirewall: settings.privacy?.enablePrivacyFirewall ?? true,
  });

  const stats: string[] = [];
  const removed = Number(automation.metadata["trackingParamsRemoved"] ?? 0);
  if (removed > 0) {
    stats.push(`${removed} tracking links stripped`);
  }
  const blocked = Number(automation.metadata["firewallBlocked"] ?? 0);
  if (blocked > 0) {
    stats.push(`${blocked} sensitive secrets masked`);
  }
  if (automation.applied.includes("locale-awareness")) {
    stats.push("Locale formatting normalized");
  }

  return {
    cleaned: automation.text,
    stats,
    sourceApp: copySourceApp,
    targetApp: activeApp.appName,
  };
}

async function confirmPendingPreview(): Promise<boolean> {
  if (!pendingPreview) {
    return false;
  }
  const settings = await getSettings();
  clipboard.writeText(pendingPreview.cleaned);
  const fallbackResult = performPasteWithFallback(
    pendingPreview.targetApp,
    pendingPreview.cleaned,
    settings.automation?.enableUniversalFallback ? "full" : "basic",
  );
  pushObservabilityEvent(
    {
      ts: new Date().toISOString(),
      app: pendingPreview.targetApp,
      kind: "preview",
      detail: "Preview confirmed and pasted",
      metadata: {
        method: fallbackResult.method,
        tried: fallbackResult.tried,
        stats: pendingPreview.stats,
      },
    },
    settings.diagnostics?.maxEvents ?? 500,
  );
  showHud(
    {
      cleaned: "✅ Preview confirmed",
      original: pendingPreview.text,
      type: "system",
      sourceApp: pendingPreview.targetApp,
    },
    1400,
  );
  lastPasteUndoText = pendingPreview.text;
  pendingPreview = null;
  return true;
}

function cancelPendingPreview(): void {
  if (!pendingPreview) {
    return;
  }
  pushObservabilityEvent({
    ts: new Date().toISOString(),
    app: pendingPreview.targetApp,
    kind: "preview",
    detail: "Preview canceled",
  });
  pendingPreview = null;
}

async function submitPasteFeedback(payload: {
  expectedIntent: "plain_text" | "rich_text";
  applyNow?: boolean;
  weight?: number;
}): Promise<{
  appliedNow: boolean;
  expectedIntent: "plain_text" | "rich_text";
  appName?: string;
  contentType?: string;
}> {
  if (!lastPasteFeedbackContext) {
    throw new Error("No recent paste context available for feedback");
  }

  const settings = await getSettings();
  const nextRules = applyExplicitPasteFeedback(settings.autoLearnedRules, {
    appName: lastPasteFeedbackContext.appName,
    contentType: lastPasteFeedbackContext.contentType,
    expectedIntent: payload.expectedIntent,
    weight: Number(payload.weight ?? 2),
  });
  await updateSettings({ autoLearnedRules: nextRules });

  let appliedNow = false;
  if (payload.applyNow) {
    if (payload.expectedIntent === "rich_text") {
      const richHtml = buildRichClipboardHtml(
        lastPasteFeedbackContext.cleanedText,
        lastPasteFeedbackContext.sourceHtml,
      );
      if (richHtml) {
        clipboard.write({
          text: lastPasteFeedbackContext.cleanedText,
          html: richHtml,
        });
      } else {
        clipboard.writeText(lastPasteFeedbackContext.cleanedText);
      }
    } else {
      clipboard.writeText(lastPasteFeedbackContext.cleanedText);
    }

    performPasteWithFallback(
      lastPasteFeedbackContext.appName,
      lastPasteFeedbackContext.cleanedText,
      settings.automation?.enableUniversalFallback ? "full" : "basic",
    );
    showHud(
      {
        cleaned:
          payload.expectedIntent === "rich_text"
            ? "🛠 Fixed now: rich paste reapplied"
            : "🛠 Fixed now: plain paste reapplied",
        original: lastPasteFeedbackContext.cleanedText,
        type: "system",
        sourceApp: lastPasteFeedbackContext.appName,
      },
      2400,
    );
    appliedNow = true;
  }

  return {
    appliedNow,
    expectedIntent: payload.expectedIntent,
    appName: lastPasteFeedbackContext.appName,
    contentType: lastPasteFeedbackContext.contentType,
  };
}

let mainWindow: BrowserWindow | null = null;
let tray: Electron.Tray | null = null;
let db: Database | null = null;
const watcher = new ClipboardWatcher();

function resolveAppIconPath(): string | undefined {
  const candidates = [
    path.join(app.getAppPath(), "logo.png"),
    path.join(process.cwd(), "logo.png"),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return undefined;
}

function loadMainWindow(win: BrowserWindow) {
  if (process.env["NODE_ENV"] === "development") {
    win.loadURL("http://127.0.0.1:5173");
    return;
  }
  win.loadFile(path.join(__dirname, "../../renderer/index.html"));
}

function createFloatingWindow(hashRoute: string, width = 440, height = 600) {
  const iconPath = resolveAppIconPath();
  const win = new BrowserWindow({
    width,
    height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env["NODE_ENV"] === "development") {
    win.loadURL(`http://127.0.0.1:5173#${hashRoute}`);
  } else {
    win.loadURL(
      `file://${path.join(__dirname, "../../renderer/index.html")}#${hashRoute}`,
    );
  }

  return win;
}

function createMainWindow() {
  const iconPath = resolveAppIconPath();
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    icon: iconPath,
    show: false, // Start hidden — show only when user explicitly opens from tray
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  loadMainWindow(win);

  // Hide to tray instead of closing
  win.on("close", (e) => {
    if (!global.appIsQuiting) {
      e.preventDefault();
      win.hide();
    }
  });

  win.on("closed", () => {
    mainWindow = null;
  });

  return win;
}

/**
 * Core clean + show HUD logic.
 * Used by both hotkey and auto-clean-on-copy.
 * Returns true if paste should proceed, false if blocked.
 */
async function performClean(
  text: string,
  html: string,
  source: "hotkey" | "auto",
): Promise<boolean> {
  const settings = await getSettings();
  const result = await cleanContent({ text, html });
  const securityAlert = result.securityAlert;
  const activeApp = await detectActiveAppSignal();
  const trustMode = resolveTrustMode(settings, activeApp.appName);

  // ── Format-aware clean by target app (E no.2) ─────────────────────────────
  let contextCleaned = result.cleaned;
  if (activeApp.appType === "terminal") {
    // Terminal: strip extra whitespace/newlines, keep single spaces
    contextCleaned = result.cleaned.replace(/\s+/g, " ").trim();
  }
  const contextResult = { ...result, cleaned: contextCleaned };

  // ── Smart Context Rules ───────────────────────────────────────────────
  // Merge DB rules with built-in DEFAULT_RULES; DB rules take priority (higher rows first)
  const dbRules = contextRulesRepo?.list() ?? [];
  const mappedDbRules = dbRules.map((r) => ({
    id: String(r.id),
    name: r.name,
    sourceApp: r.source_app ?? undefined,
    targetApp: r.target_app ?? undefined,
    contentType: (r.content_type ?? undefined) as
      | import("../shared/types").ContentType
      | undefined,
    preset: r.preset,
    transforms: (() => {
      try {
        return JSON.parse(r.transforms) as string[];
      } catch {
        return [];
      }
    })(),
    enabled: r.enabled === 1,
  }));
  const allContextRules = [...mappedDbRules, ...DEFAULT_RULES];
  const detectedForRule = detectContentType(contextResult.cleaned);
  const matchedRule = matchContextRule(
    allContextRules,
    copySourceApp, // app where user pressed Ctrl+C
    activeApp.appName, // app where user is pasting to
    detectedForRule.type,
  );
  let activePreset = settings.presets.active;
  if (matchedRule) {
    activePreset = matchedRule.preset;
    showHud(
      {
        cleaned: `📏 ${matchedRule.name} — rule applied`,
        original: text,
        type: "system",
      },
      2500,
    );
  }

  if (
    settings.automation?.enableRecipes &&
    (settings.recipes?.length ?? 0) > 0
  ) {
    const recipe = settings.recipes?.find((entry) => {
      if (!entry.enabled) return false;
      if (
        entry.sourceApp &&
        copySourceApp &&
        !copySourceApp.toLowerCase().includes(entry.sourceApp.toLowerCase())
      ) {
        return false;
      }
      if (
        entry.targetApp &&
        !activeApp.appName.toLowerCase().includes(entry.targetApp.toLowerCase())
      ) {
        return false;
      }
      if (entry.contentType && entry.contentType !== detectedForRule.type) {
        return false;
      }
      return true;
    });
    if (recipe) {
      activePreset = recipe.preset;
      pushObservabilityEvent(
        {
          ts: new Date().toISOString(),
          app: activeApp.appName,
          kind: "recipe",
          detail: `Applied source-target recipe ${recipe.id}`,
          metadata: { sourceApp: copySourceApp, targetApp: activeApp.appName },
        },
        settings.diagnostics?.maxEvents ?? 500,
      );
    }
  }

  const automationResult = applyAutomationTransforms({
    text: contextResult.cleaned,
    contentType: detectedForRule.type,
    targetApp: activeApp.appName,
    enableSmartUrlTransform:
      settings.automation?.enableSmartUrlTransform ?? true,
    enableLocaleAwareness: settings.automation?.enableLocaleAwareness ?? true,
    enableIntentFieldDetection:
      settings.automation?.enableIntentFieldDetection ?? true,
    enableHealthGuard: settings.automation?.enableHealthGuard ?? true,
    enablePrivacyFirewall: settings.privacy?.enablePrivacyFirewall ?? true,
  });
  contextResult.cleaned = automationResult.text;
  if (automationResult.applied.length > 0) {
    contextResult.appliedTransforms = [
      ...(contextResult.appliedTransforms ?? []),
      ...automationResult.applied,
    ];
    pushObservabilityEvent(
      {
        ts: new Date().toISOString(),
        app: activeApp.appName,
        kind: "transform",
        detail: `Applied automation transforms: ${automationResult.applied.join(", ")}`,
        metadata: automationResult.metadata,
      },
      settings.diagnostics?.maxEvents ?? 500,
    );
  }

  if (trustMode === "strict") {
    contextResult.cleaned = contextResult.cleaned
      .replace(/\n{3,}/g, "\n\n")
      .trim();
  } else if (trustMode === "passthrough") {
    contextResult.cleaned = text;
    contextResult.appliedTransforms = ["trust-mode-passthrough"];
  }

  const decision = evaluateContextGuard({
    hasSensitiveData: Boolean(result.securityAlert),
    activeApp,
    autoClearEnabled: settings.security.autoClear,
    defaultAutoClearSeconds: settings.security.clearTimerSeconds,
    unknownContextAction: settings.security.unknownContextAction,
  });

  if (decision.action === "block") {
    showHud(
      {
        cleaned: `🚫 Paste blocked — sensitive data detected in ${activeApp.appName}`,
        original: text,
        type: "system",
        sourceApp: activeApp.appName,
      },
      4000,
    );
    // Also send to mainWindow if open
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("security:policy", {
        action: "block",
        reason: decision.reason,
        targetApp: activeApp.appName,
        appType: activeApp.appType,
      });
    }
    return false;
  }

  // ── Sensitive data warning (no.9) ────────────────────────────────────────
  // Show warning HUD before proceeding; user can choose "Show anyway" or "Keep masked"
  if (result.securityAlert) {
    const sensitiveTypes = [
      ...new Set(result.securityAlert.matches.map((m) => m.type as string)),
    ];
    showHud(
      {
        cleaned: contextResult.cleaned,
        original: text,
        type: "sensitive_warning",
        sensitiveCount: result.securityAlert.matches.length,
        sensitiveTypes,
        sourceApp: activeApp.appName,
      },
      8000,
    );
    // Write masked version to clipboard, update tray, update dup tracker
    clipboard.writeText(contextResult.cleaned);
    updateTrayLastCleaned(contextResult.cleaned);
    lastCleanedText = text;
    lastCleanedAt = Date.now();
    sessionCleanCount += 1;
    // ── #3 Security alert — emit to mainWindow (✔ auto)
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("security:alert", {
        matches: result.securityAlert?.matches ?? [],
      });
    }
    // ── #1 Save to history (✔ auto)
    const shouldPersistSensitive = !(
      settings.privacy?.neverPersistSensitive ?? true
    );
    if (
      getHistoryRepo() &&
      settings.history.enabled &&
      shouldPersistSensitive
    ) {
      const contentType = detectContentType(contextResult.cleaned);
      getHistoryRepo()!.create({
        originalText: text,
        cleanedText: contextResult.cleaned,
        htmlContent: null,
        contentType: contentType.type,
        sourceApp: activeApp.appName,
        presetUsed: activePreset,
        charCount: contextResult.cleaned.length,
        isSensitive: true,
        aiMode: null,
      });
    }

    if (settings.privacy?.enableEphemeralSensitiveClips ?? true) {
      const allowlisted = (settings.privacy?.sensitiveAllowlistApps ?? []).some(
        (entry) =>
          activeApp.appName.toLowerCase().includes(entry.toLowerCase()),
      );
      if (!allowlisted) {
        scheduleEphemeralClipboardClear(
          settings.privacy?.sensitiveTtlSeconds ?? 90,
        );
      }
    }

    usageStatsRepo?.incrementDaily({
      pasteCount: 1,
      charsCleaned: contextResult.cleaned.length,
      tableConverts: (contextResult.appliedTransforms ?? []).includes(
        "table-converter",
      )
        ? 1
        : 0,
    });
    return true;
  }
  const preAiDetection = detectContentType(contextResult.cleaned);
  const preAiBaselineIntent = detectFormattingIntent({
    detectedType: preAiDetection.type,
    cleanedText: contextResult.cleaned,
    sourceHtml: html,
    targetAppType: activeApp.appType,
    targetAppName: activeApp.appName,
    aiRewritten: false,
  });
  const preAiStrategy = planPasteStrategy({
    detectedType: preAiDetection.type,
    cleanedText: contextResult.cleaned,
    sourceHtml: html,
    sourceAppName: copySourceApp,
    targetAppType: activeApp.appType,
    targetAppName: activeApp.appName,
    fieldIntent: String(automationResult.metadata["fieldIntent"] ?? ""),
    aiRewritten: false,
    baselineIntent: preAiBaselineIntent,
    autoLearnedRules: settings.autoLearnedRules,
  });

  // ── AI rewrite (optional + budget aware) ───────────────────────────────
  let finalCleaned = contextResult.cleaned;
  if (
    settings.ai.enabled &&
    settings.ai.apiKey &&
    settings.ai.provider !== "local"
  ) {
    let reservedTokens = 0;
    try {
      // ── Context-aware AI preset (D no.8) ────────────────────────────
      const configuredMode = settings.ai.aiMode ?? "auto";
      let chosenMode: import("../ai/ai-rewriter").RewriteMode = "fix_grammar";
      if (configuredMode === "auto") {
        const detected = detectContentType(result.cleaned);
        if (detected.type === "email_text") {
          chosenMode = "formalize";
        } else if (detected.type === "source_code") {
          chosenMode = "fix_grammar";
        } else if (
          detected.type === "plain_text" &&
          result.cleaned.length > 500
        ) {
          chosenMode = "summarize";
        }
      } else if (
        configuredMode === "fix_grammar" ||
        configuredMode === "summarize" ||
        configuredMode === "formalize" ||
        configuredMode === "rephrase"
      ) {
        chosenMode = configuredMode;
      }
      const aiGate = shouldUseAiAssist({
        aiEnabled: settings.ai.enabled,
        provider: settings.ai.provider,
        hasApiKey: Boolean(settings.ai.apiKey),
        strategyConfidence: preAiStrategy.confidence,
        detectedType: preAiDetection.type,
        textLength: contextResult.cleaned.length,
        aiMode: settings.ai.aiMode,
      });

      if (aiGate.allowed) {
        const trimmed = trimTextForAi(contextResult.cleaned);
        const cacheKey = buildAiCacheKey({
          text: trimmed.text,
          provider: settings.ai.provider,
          model: settings.ai.model,
          mode: chosenMode,
          sourceApp: copySourceApp,
          targetApp: activeApp.appName,
          contentType: preAiDetection.type,
        });
        const cached = getCachedAiResult(cacheKey);

        if (cached) {
          finalCleaned = cached;
        } else {
          const estimatedTokens = estimateTokenUsage(trimmed.text);
          const budget = consumeAiBudget(estimatedTokens);

          if (budget.ok) {
            reservedTokens = estimatedTokens;
            // ── AI processing indicator (show immediately while AI is working)
            showHud(
              {
                cleaned: `⏳ AI: ${aiModeLabel(chosenMode)}…`,
                original: contextResult.cleaned,
                type: "ai_processing",
              },
              15000,
            );
            finalCleaned = await rewriteText(trimmed.text, {
              mode: chosenMode,
              provider: settings.ai.provider,
              apiKey: settings.ai.apiKey,
              baseUrl: settings.ai.baseUrl,
              model: settings.ai.model,
              language: settings.general.language,
            });
            setCachedAiResult(cacheKey, finalCleaned);
            usageStatsRepo?.incrementDaily({ aiRewrites: 1 });
          } else {
            pushObservabilityEvent(
              {
                ts: new Date().toISOString(),
                app: activeApp.appName,
                kind: "policy",
                detail: `AI skipped due to budget: ${budget.reason}`,
              },
              settings.diagnostics?.maxEvents ?? 500,
            );
          }
        }
      } else {
        pushObservabilityEvent(
          {
            ts: new Date().toISOString(),
            app: activeApp.appName,
            kind: "policy",
            detail: `AI skipped by gate: ${aiGate.reason}`,
          },
          settings.diagnostics?.maxEvents ?? 500,
        );
      }
      // ── Summarize fallback (no.8): if result is < 20% of original, it's too aggressively
      // truncated — fall back to rule-cleaned version
      if (
        chosenMode === "summarize" &&
        finalCleaned.length < result.cleaned.length * 0.2
      ) {
        finalCleaned = contextResult.cleaned;
      }
    } catch (e) {
      if (reservedTokens > 0) {
        rollbackAiBudget(reservedTokens);
      }
      finalCleaned = contextResult.cleaned; // AI failed — fall back
      const msg = e instanceof Error ? e.message : String(e);
      const isKeyError =
        msg.includes("API_KEY_INVALID") ||
        msg.includes("API key expired") ||
        msg.includes("401") ||
        (msg.includes("400") && msg.includes("key"));
      const isUrlError =
        msg.includes("non-JSON response") ||
        msg.includes("check your Base URL");
      if (isKeyError) {
        if (!aiKeyErrorNotified) {
          aiKeyErrorNotified = true;
          showHud(
            {
              cleaned:
                "\u26a0\ufe0f AI rewrite skipped: your API key is expired or invalid. Please update it in Settings.",
              original: "",
              type: "system",
            },
            8000,
          );
        }
      } else if (isUrlError) {
        if (!aiKeyErrorNotified) {
          aiKeyErrorNotified = true;
          showHud(
            {
              cleaned:
                "\u26a0\ufe0f AI rewrite skipped: the API endpoint returned an unexpected response. Please check your Base URL in AI Settings.",
              original: "",
              type: "system",
            },
            8000,
          );
        }
      } else {
        console.error("AI Rewrite failed:", e);
      }
    } // end catch
  } // end if (settings.ai.enabled)
  // Replace clipboard with context-aware output format
  const sourceDetection = detectContentType(text, html);
  const baselineIntent = detectFormattingIntent({
    detectedType: sourceDetection.type,
    cleanedText: finalCleaned,
    sourceHtml: html,
    targetAppType: activeApp.appType,
    targetAppName: activeApp.appName,
    aiRewritten: finalCleaned !== contextResult.cleaned,
  });
  const strategy = planPasteStrategy({
    detectedType: sourceDetection.type,
    cleanedText: finalCleaned,
    sourceHtml: html,
    sourceAppName: copySourceApp,
    targetAppType: activeApp.appType,
    targetAppName: activeApp.appName,
    fieldIntent: String(automationResult.metadata["fieldIntent"] ?? ""),
    aiRewritten: finalCleaned !== contextResult.cleaned,
    baselineIntent,
    autoLearnedRules: settings.autoLearnedRules,
  });
  const formattingIntent = strategy.intent;

  if (formattingIntent === "rich_text") {
    const richHtml = buildRichClipboardHtml(finalCleaned, html);
    if (richHtml) {
      clipboard.write({
        text: finalCleaned,
        html: richHtml,
      });
    } else {
      clipboard.writeText(finalCleaned);
    }
  } else {
    clipboard.writeText(finalCleaned);
  }

  updateTrayLastCleaned(finalCleaned);
  pushObservabilityEvent(
    {
      ts: new Date().toISOString(),
      app: activeApp.appName,
      kind: "transform",
      detail: `Paste strategy: ${strategy.policyPack} -> ${strategy.intent}`,
      metadata: {
        confidence: strategy.confidence,
        reason: strategy.reason,
      },
    },
    settings.diagnostics?.maxEvents ?? 500,
  );

  // ── Update duplicate tracker (no.10)
  lastCleanedText = text;
  lastCleanedAt = Date.now();

  // ── #1+#2 Save to history automatically (✔ auto-clean + AI rewrite)
  const contentType = detectContentType(finalCleaned);
  if (getHistoryRepo() && settings.history.enabled) {
    const persistAllowed = !(
      Boolean(result.securityAlert) &&
      (settings.privacy?.neverPersistSensitive ?? true)
    );
    if (!persistAllowed) {
      pushObservabilityEvent(
        {
          ts: new Date().toISOString(),
          app: activeApp.appName,
          kind: "policy",
          detail: "Skipped history persistence for sensitive content",
        },
        settings.diagnostics?.maxEvents ?? 500,
      );
    }
    if (persistAllowed) {
      getHistoryRepo()!.create({
        originalText: text,
        cleanedText: finalCleaned,
        htmlContent: null,
        contentType: contentType.type,
        sourceApp: activeApp.appName,
        presetUsed: activePreset,
        charCount: finalCleaned.length,
        isSensitive: Boolean(result.securityAlert),
        aiMode: settings.ai.enabled ? (settings.ai.aiMode ?? null) : null,
      });
    }
  }

  usageStatsRepo?.incrementDaily({
    pasteCount: 1,
    charsCleaned: finalCleaned.length,
    tableConverts: (contextResult.appliedTransforms ?? []).includes(
      "table-converter",
    )
      ? 1
      : 0,
  });

  // Show HUD — works whether mainWindow is open or not
  showHud(
    {
      cleaned: finalCleaned,
      original: text,
      changes: contextResult.appliedTransforms,
      type: source === "hotkey" ? "paste_clean" : "auto_clean",
      contentType: contentType.type,
      strategyIntent: strategy.intent,
      securityAlert: result.securityAlert ?? undefined,
      sourceApp: activeApp.appName,
      fieldIntent: automationResult.metadata["fieldIntent"] as
        | string
        | undefined,
      preview: source === "hotkey" ? finalCleaned.slice(0, 600) : undefined,
    },
    source === "auto" ? 3500 : 5000,
  );

  // Also notify mainWindow if it happens to be open
  if (mainWindow && !mainWindow.isDestroyed()) {
    // ── #5 Emit content_type for realtime badge in UI (✔ auto)
    mainWindow.webContents.send("clipboard:cleaned", {
      original: text,
      cleaned: finalCleaned,
      type: contentType.type,
      sourceApp: activeApp.appName,
    });
    if (decision.action === "warn") {
      mainWindow.webContents.send("security:policy", {
        action: "warn",
        reason: decision.reason,
        targetApp: activeApp.appName,
        appType: activeApp.appType,
        autoClearAfterSeconds: decision.autoClearAfterSeconds,
      });
    }
    // ── #3 Security alert — emit to mainWindow if sensitive
    if (securityAlert) {
      mainWindow.webContents.send("security:alert", {
        matches: securityAlert?.matches ?? [],
      });
    }
  }

  if (decision.autoClearAfterSeconds) {
    scheduleClipboardClear(decision.autoClearAfterSeconds, () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("clipboard:auto-cleared", {
          seconds: decision.autoClearAfterSeconds,
        });
      }
    });
  }

  pushTimelineEvent({
    ts: Date.now(),
    sourceApp: activeApp.appName,
    contentType: contentType.type,
    chars: finalCleaned.length,
  });

  const learnKey = `${activeApp.appName.toLowerCase()}::${contentType.type}`;
  const learnCount = (learningCounters.get(learnKey) ?? 0) + 1;
  learningCounters.set(learnKey, learnCount);
  if ((settings.automation?.enableAutoLearning ?? true) && learnCount >= 3) {
    const suggestedPreset = inferSuggestedPreset(contentType.type);
    const currentRules = settings.autoLearnedRules ?? [];
    const existingIndex = currentRules.findIndex(
      (rule) =>
        rule.appName.toLowerCase() === activeApp.appName.toLowerCase() &&
        rule.contentType === contentType.type,
    );
    const nextRule = {
      id: `learn-${activeApp.appName}-${contentType.type}`.replace(
        /[^a-zA-Z0-9-_]/g,
        "_",
      ),
      appName: activeApp.appName,
      contentType: contentType.type,
      suggestedPreset,
      confidence: Math.min(0.95, 0.5 + learnCount / 10),
      count: learnCount,
      updatedAt: new Date().toISOString(),
    };
    if (existingIndex >= 0) {
      currentRules[existingIndex] = nextRule;
    } else {
      currentRules.push(nextRule);
    }
    const withPresetLearning = currentRules;
    const withFormatLearning = learnPasteStrategyFeedback(withPresetLearning, {
      appName: activeApp.appName,
      contentType: contentType.type,
      selectedIntent: strategy.intent,
      confidence: strategy.confidence,
    });
    await updateSettings({ autoLearnedRules: withFormatLearning });
    pushObservabilityEvent(
      {
        ts: new Date().toISOString(),
        app: activeApp.appName,
        kind: "learn",
        detail: `Learned suggestion: ${suggestedPreset} for ${contentType.type}`,
        metadata: { count: learnCount },
      },
      settings.diagnostics?.maxEvents ?? 500,
    );
  }

  lastPasteFeedbackContext = {
    appName: activeApp.appName,
    contentType: contentType.type,
    cleanedText: finalCleaned,
    sourceHtml: html,
    expectedIntent: strategy.intent,
  };

  // ── Reset copy source after successful paste (prevents bleed into next paste)
  copySourceApp = undefined;
  sessionCleanCount += 1;
  lastPasteUndoText = text;
  return true;
}

function registerFirstAvailableHotkey(
  candidates: readonly string[],
  handler: () => void,
): string | null {
  for (const candidate of candidates) {
    if (registerHotkey(candidate, handler)) {
      return candidate;
    }
  }
  return null;
}

async function captureScreenshotToClipboardImage(): Promise<void> {
  if (screenshotHotkeyRunning) {
    showHud(
      {
        cleaned: "📸 Screenshot capture is already running",
        original: "",
        type: "system",
      },
      1800,
    );
    return;
  }

  screenshotHotkeyRunning = true;
  try {
    showHud(
      {
        cleaned: "📸 Capturing screenshot...",
        original: "",
        type: "system",
      },
      1800,
    );

    const screenshot = await captureRegion();
    const image = nativeImage.createFromBuffer(screenshot);
    if (image.isEmpty()) {
      throw new Error("Captured screenshot is empty");
    }

    clipboard.writeImage(image);
    showHud(
      {
        cleaned: "📸 Screenshot copied — press Ctrl/Cmd+V",
        original: "",
        type: "system",
      },
      3200,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showHud(
      {
        cleaned: "⚠️ Screenshot capture failed",
        original: message,
        type: "system",
      },
      4500,
    );
  } finally {
    screenshotHotkeyRunning = false;
  }
}

/**
 * OCR an image already sitting in the clipboard (e.g. after PrintScreen).
 * Replaces the clipboard image with the extracted text, ready to Ctrl+V.
 */
async function captureOcrFromClipboardImage(): Promise<void> {
  if (ocrHotkeyRunning) {
    showHud(
      {
        cleaned: "🧾 OCR is already running",
        original: "",
        type: "system",
      },
      1800,
    );
    return;
  }
  ocrHotkeyRunning = true;
  try {
    const img = clipboard.readImage();
    if (img.isEmpty()) {
      showHud(
        { cleaned: "🧾 No image in clipboard", original: "", type: "system" },
        2000,
      );
      return;
    }
    showHud(
      {
        cleaned: "🧾 Running OCR on clipboard image…",
        original: "",
        type: "system",
      },
      1800,
    );
    const latestSettings = await getSettings();
    const ocrResult = await recognizeText(img.toPNG(), {
      languages: latestSettings.ocr.languages,
      psm: 3,
      confidence_threshold: 0.5,
    });
    let extractedText = ocrResult.text.trim();
    if (!extractedText) {
      showHud(
        {
          cleaned: "🧾 OCR done, but no text detected",
          original: "",
          type: "system",
        },
        2600,
      );
      return;
    }
    if (latestSettings.ocr.autoClean) {
      const cleaned = await cleanContent({ text: extractedText, html: "" });
      extractedText = cleaned.cleaned;
    }
    clipboard.writeText(extractedText);
    updateTrayLastCleaned(extractedText);
    usageStatsRepo?.incrementDaily({ ocrCount: 1 });
    // Send OCR result to main window so UI can display it
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("ocr:result", {
        text: extractedText,
        confidence: ocrResult.confidence,
      });
    }
    // Auto-paste into active app — user pressed Ctrl+Shift+V with image in clipboard
    setTimeout(() => {
      performPasteWithFallback(undefined, extractedText);
    }, 120);
    showHud(
      {
        cleaned: `🧾 OCR done (${Math.round(ocrResult.confidence * 100)}%) — pasting text…`,
        original: extractedText.slice(0, 240),
        type: "system",
      },
      3000,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showHud(
      {
        cleaned: "⚠️ OCR from image failed",
        original: message,
        type: "system",
      },
      4500,
    );
  } finally {
    ocrHotkeyRunning = false;
  }
}

async function captureOcrScreenshotToClipboardText(
  openOcrWindowOnFailure = false,
): Promise<void> {
  if (ocrHotkeyRunning) {
    showHud(
      {
        cleaned: "🧾 OCR capture is already running",
        original: "",
        type: "system",
      },
      1800,
    );
    return;
  }

  ocrHotkeyRunning = true;
  try {
    const latestSettings = await getSettings();
    showHud(
      {
        cleaned: "🧾 Capturing screenshot for OCR...",
        original: "",
        type: "system",
      },
      1800,
    );

    const screenshot = await captureRegion();
    const ocrResult = await recognizeText(screenshot, {
      languages: latestSettings.ocr.languages,
      psm: 3,
      confidence_threshold: 0.5,
    });

    let extractedText = ocrResult.text.trim();
    if (!extractedText) {
      showHud(
        {
          cleaned: "🧾 OCR done, but no text detected",
          original: "",
          type: "system",
        },
        2600,
      );
      return;
    }

    if (latestSettings.ocr.autoClean) {
      const cleaned = await cleanContent({ text: extractedText, html: "" });
      extractedText = cleaned.cleaned;
    }

    clipboard.writeText(extractedText);
    updateTrayLastCleaned(extractedText);
    usageStatsRepo?.incrementDaily({ ocrCount: 1 });

    showHud(
      {
        cleaned: `🧾 OCR copied (${Math.round(ocrResult.confidence * 100)}%) — press Ctrl/Cmd+V`,
        original: extractedText.slice(0, 240),
        type: "system",
      },
      3500,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    showHud(
      {
        cleaned: "⚠️ OCR screenshot failed",
        original: message,
        type: "system",
      },
      4500,
    );
    if (openOcrWindowOnFailure) {
      createFloatingWindow("/ocr", 500, 420);
    }
  } finally {
    ocrHotkeyRunning = false;
  }
}

function triggerGhostWrite(text?: string): void {
  const sourceText =
    typeof text === "string" && text.length > 0 ? text : clipboard.readText();
  if (!sourceText.trim()) {
    showHud(
      {
        cleaned: "⌨️ Ghost Write: clipboard is empty",
        original: "",
        type: "system",
      },
      2200,
    );
    return;
  }

  const maxGhostChars = 5000;
  const truncated = sourceText.length > maxGhostChars;
  const textToType = truncated
    ? sourceText.slice(0, maxGhostChars)
    : sourceText;
  const typed = simulateTypeText(textToType);

  showHud(
    {
      cleaned: typed
        ? `⌨️ Ghost writing ${textToType.length} chars${truncated ? " (truncated)" : ""}`
        : "⚠️ Ghost write unavailable on this system",
      original: "",
      type: "system",
    },
    typed ? 2200 : 3200,
  );
}

async function setupHotkeys() {
  unregisterAllHotkeys();
  const settings = await getSettings();
  const preferredPasteHotkey = settings.hotkeys.pasteClean;
  const fallbackCandidates = RECOMMENDED_PASTE_HOTKEYS.filter(
    (hotkey) => hotkey !== preferredPasteHotkey,
  );
  const pasteCandidates = [preferredPasteHotkey, ...fallbackCandidates];

  // Main hotkey: clean clipboard + show HUD
  const registered = registerFirstAvailableHotkey(pasteCandidates, async () => {
    const text = clipboard.readText();
    const html = clipboard.readHTML();
    if (!text.trim()) {
      // Clipboard has no text — check if it has an image (e.g. after PrintScreen)
      // Use clipboard.readImage() which is more reliable than availableFormats() on Windows
      const img = clipboard.readImage();
      if (!img.isEmpty()) {
        void captureOcrFromClipboardImage();
      } else {
        showHud(
          {
            cleaned: "📋 Clipboard is empty — nothing to paste",
            original: "",
            type: "system",
          },
          2000,
        );
      }
      return;
    }
    // ── Size guard (no.11) ─────────────────────────────────────────────────
    const hotkeyKb = Math.round(text.length / 1024);
    if (hotkeyKb > 50) {
      showHud(
        {
          cleaned: `⚠️ Large clipboard (${hotkeyKb}KB) — press hotkey again to force clean`,
          original: text,
          type: "size_warning",
          sizeKb: hotkeyKb,
        },
        6000,
      );
      return;
    }
    // ── Duplicate detection (no.10) ────────────────────────────────────────────
    if (
      text === lastCleanedText &&
      Date.now() - lastCleanedAt < 5 * 60 * 1000
    ) {
      showHud(
        {
          cleaned: "📋 Already cleaned recently",
          original: text,
          type: "system",
        },
        1500,
      );
      return;
    }
    const previewEnabled = settings.automation?.enablePastePreview ?? true;
    const previewMaxAgeMs =
      Math.max(250, settings.automation?.previewHoldMs ?? 250) + 2250;
    if (previewEnabled) {
      const preview = await buildPreviewResult(text, html);
      const changed = text !== preview.cleaned;
      showHud(
        {
          cleaned: changed
            ? "Preview generated - applying Smart Paste now"
            : "No changes needed - applying Smart Paste now",
          original: text,
          type: "paste_preview",
          preview: preview.cleaned.slice(0, 600),
          previewRequired: false,
          previewOriginal: text.slice(0, 600),
          previewCleaned: preview.cleaned.slice(0, 600),
          previewStats: preview.stats,
        },
        2200,
      );
      pushObservabilityEvent(
        {
          ts: new Date().toISOString(),
          kind: "preview",
          detail: "Paste preview shown in non-blocking mode",
        },
        settings.diagnostics?.maxEvents ?? 500,
      );
      pendingPreview = null;
    }

    const cleaned = await performClean(text, html, "hotkey");
    if (cleaned) {
      const activeApp = await detectActiveAppSignal();
      const fallbackMode = settings.automation?.enableUniversalFallback
        ? "full"
        : "basic";
      const fallbackResult = performPasteWithFallback(
        activeApp.appName,
        clipboard.readText(),
        fallbackMode,
      );
      pushObservabilityEvent(
        {
          ts: new Date().toISOString(),
          app: activeApp.appName,
          kind: "fallback",
          detail: `Paste method used: ${fallbackResult.method}`,
          metadata: {
            tried: fallbackResult.tried,
            succeeded: fallbackResult.succeeded,
          },
        },
        settings.diagnostics?.maxEvents ?? 500,
      );
      // ── #6 Queue auto-advance — setelah paste, load item queue berikutnya (✔ auto)
      const queueNext = peek();
      if (queueNext !== null) {
        const next = dequeue();
        if (next) {
          setTimeout(() => {
            clipboard.writeText(next);
            if (mainWindow && !mainWindow.isDestroyed()) {
              mainWindow.webContents.send("clipboard:content", {
                text: next,
                type: "paste_queue",
                mergedCount: size(),
              });
            }
            showHud(
              {
                cleaned: `⏭️ Queue: loaded next item (${size()} remaining)`,
                original: "",
                type: "system",
              },
              2000,
            );
          }, 500);
        }
      }
    }
  });

  if (!registered) {
    showHud(
      {
        cleaned: `\u26A0\uFE0F Hotkey conflict: no available paste shortcut. Tried ${pasteCandidates.join(", ")}.`,
        original: "",
        type: "system",
      },
      7000,
    );
  } else if (registered !== preferredPasteHotkey) {
    await updateSettings({
      hotkeys: { ...settings.hotkeys, pasteClean: registered },
    });
    showHud(
      {
        cleaned: `\u2328\uFE0F Hotkey switched to ${registered} to avoid conflict`,
        original: "",
        type: "system",
      },
      3500,
    );
  }

  // ── no.13: Quick-switch preset via Ctrl+Alt+P ──────────────────────────────
  const presetSwitchRegistered = registerHotkey("Ctrl+Alt+P", async () => {
    const s = await getSettings();
    const aiEnabled = s.ai.enabled && s.ai.apiKey && s.ai.provider !== "local";
    if (aiEnabled) {
      // Cycle AI mode
      const currentMode = (s.ai.aiMode ?? "auto") as AiModeCycle;
      const currentIdx = AI_MODES.indexOf(currentMode);
      const nextMode = AI_MODES[
        (currentIdx + 1) % AI_MODES.length
      ] as AiModeCycle;
      await updateSettings({ ai: { ...s.ai, aiMode: nextMode } });
      showHud(
        {
          cleaned: `🤖 AI mode: ${aiModeLabel(nextMode)}`,
          original: "",
          type: "system",
        },
        2000,
      );
      return;
    }
    // Fallback: cycle presets if AI not configured
    if (s.presets.custom.length === 0) return;
    const currentIndex = s.presets.custom.findIndex(
      (p) => p.id === s.presets.active,
    );
    const nextIndex = (currentIndex + 1) % s.presets.custom.length;
    const nextPreset = s.presets.custom[nextIndex];
    if (!nextPreset) return;
    await updateSettings({ presets: { ...s.presets, active: nextPreset.id } });
    showHud(
      {
        cleaned: `🎨 Preset: ${nextPreset.name}`,
        original: "",
        type: "system",
      },
      2000,
    );
  });
  if (!presetSwitchRegistered) {
    showHud(
      {
        cleaned: "⚠️ Ctrl+Alt+P is unavailable (already used by another app)",
        original: "",
        type: "system",
      },
      3500,
    );
  }

  // Ghost Write mode (type characters instead of paste) via Ctrl+Alt+G
  const ghostWriteHotkey = "Ctrl+Alt+G";
  const ghostWriteRegistered = registerHotkey(ghostWriteHotkey, () => {
    triggerGhostWrite();
  });
  if (!ghostWriteRegistered) {
    showHud(
      {
        cleaned: `⚠️ ${ghostWriteHotkey} is unavailable (already used by another app)`,
        original: "",
        type: "system",
      },
      3500,
    );
  }

  // ── History Ring (Ctrl+Alt+H) ──────────────────────────────────────────────
  const historyHotkey = settings.hotkeys.historyOpen || "CmdOrCtrl+Alt+H";
  registerHotkey(historyHotkey, () => {
    createFloatingWindow("/paste-history-ring", 500, 500);
  });

  // ── Multi-Copy toggle (Ctrl+Alt+C) ─────────────────────────────────────────
  const multiCopyHotkey = settings.hotkeys.multiCopy || "CmdOrCtrl+Alt+C";
  registerHotkey(multiCopyHotkey, async () => {
    const {
      startCollecting: startMulti,
      mergeAndPaste: mergeMulti,
      getMultiClipboard: getMulti,
    } = await import("../productivity/multi-clipboard");
    const state = getMulti();
    if (!state.isCollecting) {
      startMulti();
      showHud(
        {
          cleaned: "📋 Multi-copy started — copy items one by one",
          original: "",
          type: "system",
        },
        2500,
      );
    } else {
      const merged = mergeMulti();
      if (merged.trim()) {
        clipboard.writeText(merged);
        showHud(
          {
            cleaned: `📋 Merged ${state.items.length} items — pasting`,
            original: "",
            type: "system",
          },
          2500,
        );
        performPasteWithFallback(
          undefined,
          merged,
          settings.automation?.enableUniversalFallback ? "full" : "basic",
        );
      } else {
        showHud(
          {
            cleaned: "📋 Multi-copy: nothing collected",
            original: "",
            type: "system",
          },
          2000,
        );
      }
    }
  });

  // ── Translate Clipboard (Ctrl+Alt+T) ──────────────────────────────────────
  registerHotkey("Ctrl+Alt+T", async () => {
    const text = clipboard.readText().trim();
    if (!text) {
      showHud(
        {
          cleaned: "📋 Clipboard is empty — nothing to translate",
          original: "",
          type: "system",
        },
        2000,
      );
      return;
    }
    const currentSettings = await getSettings();
    const ai = currentSettings.ai;
    if (!ai.apiKey || ai.provider === "local") {
      showHud(
        {
          cleaned: "⚠️ AI provider not configured — set API key in Settings",
          original: "",
          type: "system",
        },
        3000,
      );
      return;
    }
    const currentLang = currentSettings.general?.language ?? "id";
    const targetLang = currentLang === "id" ? "en" : "id";
    showHud(
      {
        cleaned: `⏳ Translating to ${targetLang === "en" ? "English" : "Indonesian"}…`,
        original: text,
        type: "ai_processing",
      },
      3000,
    );
    try {
      const { rewriteText: rwText } = await import("../ai/ai-rewriter");
      const translated = await rwText(text, {
        mode: "translate",
        language: targetLang,
        translateTarget: targetLang,
        provider:
          ai.provider as import("../ai/ai-rewriter").RewriteOptions["provider"],
        apiKey: ai.apiKey,
        baseUrl: ai.baseUrl,
        model: ai.model,
      });
      clipboard.writeText(translated);
      showHud({ cleaned: translated, original: text, type: "clean" }, 4000);
    } catch (e) {
      showHud(
        {
          cleaned: `❌ Translation failed: ${e instanceof Error ? e.message : String(e)}`,
          original: text,
          type: "system",
        },
        4000,
      );
    }
  });

  const commandPaletteHotkey =
    settings.hotkeys.commandPalette || "CmdOrCtrl+Alt+K";
  registerHotkey(commandPaletteHotkey, async () => {
    const s = await getSettings();
    if (!(s.automation?.enableCommandPalette ?? true)) {
      return;
    }
    const builtinPresets = ["keepStructure", "codePassthrough", "emailClean"];
    const customIds = s.presets.custom.map((preset) => preset.id);
    const activeApp = await detectActiveAppSignal();
    const options = [...new Set([...builtinPresets, ...customIds])];
    const favoriteEntry = (s.automation?.paletteFavorites ?? []).find((entry) =>
      activeApp.appName.toLowerCase().includes(entry.appName.toLowerCase()),
    );
    const ranked = favoriteEntry
      ? [
          ...favoriteEntry.presets.filter((preset) => options.includes(preset)),
          ...options.filter(
            (preset) => !favoriteEntry.presets.includes(preset),
          ),
        ]
      : options;
    if (ranked.length === 0) {
      return;
    }
    showHud(
      {
        cleaned: "⌘ Command Palette: choose preset",
        original: "",
        type: "command_palette",
        paletteOptions: ranked,
        paletteSelected: s.presets.active,
        sourceApp: activeApp.appName,
      },
      7000,
    );
  });

  const undoHotkey = settings.hotkeys.undoLastPaste || "CmdOrCtrl+Alt+Z";
  registerHotkey(undoHotkey, async () => {
    const s = await getSettings();
    if (!(s.automation?.enableUndo ?? true)) {
      return;
    }
    if (!lastPasteUndoText) {
      showHud(
        {
          cleaned: "↩ Nothing to undo yet",
          original: "",
          type: "undo",
        },
        1800,
      );
      return;
    }
    clipboard.writeText(lastPasteUndoText);
    performPasteWithFallback(
      undefined,
      lastPasteUndoText,
      s.automation?.enableUniversalFallback ? "full" : "basic",
    );
    pushObservabilityEvent(
      {
        ts: new Date().toISOString(),
        kind: "undo",
        detail: "Undo last paste triggered",
      },
      s.diagnostics?.maxEvents ?? 500,
    );
    showHud(
      {
        cleaned: "↩ Last paste restored",
        original: lastPasteUndoText,
        type: "undo",
      },
      2200,
    );
  });
}

/**
 * Clipboard watcher — handles both:
 * 1. Multi-clipboard collection mode (sends to mainWindow)
 * 2. Auto-clean on copy (if enabled in settings)
 * 3. Forwarding raw content to mainWindow if open
 */
function wireClipboardWatcher() {
  watcher.start();
  watcher.on("change", async (payload) => {
    // ── Incognito guard (no.18) ────────────────────────────────────────────────
    if (incognitoMode) return;
    const settings = await getSettings();

    // ── App whitelist/blacklist guard (E no.19) ──────────────────────────────
    const appSignal = await detectActiveAppSignal();
    // ── Track copy source app (for matchContextRule) ─────────────────────────────
    if (appSignal.detected) copySourceApp = appSignal.appName;
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

    // ── Snippet trigger/expand (no.17) ───────────────────────────────────────
    if (payload.text.startsWith(";") && snippetsRepo) {
      const trigger = payload.text.split(/\s/)[0].slice(1).toLowerCase();
      if (trigger) {
        const snippets = snippetsRepo.list();
        const found = snippets.find(
          (s) =>
            s.name.toLowerCase().startsWith(trigger) ||
            (s.tags && s.tags.toLowerCase().includes(trigger)),
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

    // Auto-clean on copy — replace clipboard silently, show brief HUD
    // Skip if snoozed
    if (settings.general.autoCleanOnCopy && !isSnoozed()) {
      // ── Size guard (no.11)
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
      // ── Duplicate detection (no.10)
      if (
        payload.text === lastCleanedText &&
        Date.now() - lastCleanedAt < 5 * 60 * 1000
      ) {
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

    // ── #4 AutoChart — disabled auto-trigger (too noisy; accessible from main window only)

    // ── #5 + #8 Forward content ke mainWindow dengan content_type (✔ auto)
    if (mainWindow && !mainWindow.isDestroyed()) {
      const detected = detectContentType(payload.text);
      mainWindow.webContents.send("clipboard:content", {
        ...payload,
        content_type: detected.type,
      });
    }
  });
}

function setupAutoUpdater() {
  // autoUpdater.logger = logger;
  // autoUpdater.checkForUpdatesAndNotify();
  try {
    logger.info("Auto-updater scaffold initialized");
  } catch {
    /* logger not ready */
  }
}

function setupExtensionServer() {
  const SOCKET_PATH =
    process.platform === "win32"
      ? "\\\\.\\pipe\\smartpastehub-ext"
      : "/tmp/smartpastehub-ext.sock";

  const server = net.createServer((stream) => {
    stream.on("data", async (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "clean_paste") {
          const result = await cleanContent({ text: msg.text });
          stream.write(
            JSON.stringify({
              type: "clean_paste_result",
              text: result.cleaned,
            }),
          );
        }
      } catch (e) {
        try {
          logger.error("Ext Server Error", { error: e });
        } catch {
          /* logger not ready */
        }
      }
    });
  });

  server.listen(SOCKET_PATH, () => {
    try {
      logger.info("Extension IPC server listening");
    } catch {
      /* logger not ready */
    }
  });

  // Clean up socket file on unix
  if (process.platform !== "win32") {
    app.on("will-quit", () => {
      if (fs.existsSync(SOCKET_PATH)) fs.unlinkSync(SOCKET_PATH);
    });
  }
}

async function setupSyncRuntime(win: BrowserWindow): Promise<void> {
  const settings = await getSettings();
  if (!settings.sync.enabled) {
    try {
      logger.info("Sync disabled by settings");
    } catch {
      /* logger not ready */
    }
    return;
  }

  const relayUrl = process.env["SMARTPASTE_SYNC_RELAY_URL"];
  const roomId = process.env["SMARTPASTE_SYNC_ROOM_ID"];
  const relayAuthToken = process.env["SMARTPASTE_SYNC_AUTH_TOKEN"];
  const secretKeyHex = process.env["SMARTPASTE_SYNC_SECRET_KEY"];

  if (!relayUrl || !roomId || !relayAuthToken || !secretKeyHex) {
    try {
      logger.warn("Sync enabled but missing required sync env vars");
    } catch {
      /* logger not ready */
    }
    win.webContents.send("sync:disconnected", {
      roomId: roomId ?? "",
      deviceId: settings.sync.deviceId || "desktop-local",
    });
    return;
  }

  if (!/^[0-9a-fA-F]+$/.test(secretKeyHex) || secretKeyHex.length % 2 !== 0) {
    try {
      logger.warn("Sync secret key is not valid hex");
    } catch {
      /* logger not ready */
    }
    win.webContents.send("sync:disconnected", {
      roomId,
      deviceId: settings.sync.deviceId || "desktop-local",
    });
    return;
  }

  if (!isSyncTransportRuntimeAvailable()) {
    try {
      logger.warn(
        "Sync enabled but WebSocket runtime is unavailable (no global WebSocket and no ws fallback)",
      );
    } catch {
      // logger not ready
    }
    win.webContents.send("sync:disconnected", {
      roomId,
      deviceId: settings.sync.deviceId || "desktop-local",
    });
    return;
  }

  connectSync(relayUrl, secretKeyHex, {
    roomId,
    relayAuthToken,
    deviceId: settings.sync.deviceId || undefined,
    onIncomingClipboard(text) {
      clipboard.writeText(text);
    },
  });
}

async function initializeApp() {
  db = new Database();
  snippetsRepo = new SnippetsRepository(db);
  usageStatsRepo = new UsageStatsRepository(db);
  contextRulesRepo = new ContextRulesRepository(db);
  mainWindow = createMainWindow();
  registerIpcHandlers(
    mainWindow,
    db,
    setupHotkeys,
    createFloatingWindow,
    async () => confirmPendingPreview(),
    () => cancelPendingPreview(),
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
      // ── Incognito toggle callback (no.18)
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
        // Reuse the Ctrl+Alt+T handler by dispatching a fake hotkey trigger
        // The simplest approach: fire the registered hotkey action directly
        const text = clipboard.readText().trim();
        if (text) {
          // Trigger the translate action via the main process handler
          void (async () => {
            const currentSettings = await getSettings();
            const ai = currentSettings.ai;
            if (!ai.apiKey || ai.provider === "local") return;
            const currentLang = currentSettings.general?.language ?? "id";
            const targetLang = currentLang === "id" ? "en" : "id";
            try {
              const { rewriteText: rwText } = await import("../ai/ai-rewriter");
              const translated = await rwText(text, {
                mode: "translate",
                language: targetLang,
                translateTarget: targetLang,
                provider:
                  ai.provider as import("../ai/ai-rewriter").RewriteOptions["provider"],
                apiKey: ai.apiKey,
                baseUrl: ai.baseUrl,
                model: ai.model,
              });
              clipboard.writeText(translated);
              showHud(
                { cleaned: translated, original: text, type: "clean" },
                4000,
              );
            } catch {
              /* silent */
            }
          })();
        }
      },
    },
  );
  wireClipboardWatcher();
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

  // Respect startHidden setting — show main window on first launch if disabled
  const settings = await getSettings();

  // Setup Context Menu based on setting
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

  // First-launch onboarding notification
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

  // Sync tray badge with current autoClean setting
  updateTrayAutoCleanState(settings.general.autoCleanOnCopy);

  // Apply launch-at-startup setting
  app.setLoginItemSettings({
    openAtLogin: settings.general.startOnBoot ?? false,
  });

  // Tray tooltip: show clipboard preview on hover
  watcher.on("change", (payload) => {
    if (tray && !tray.isDestroyed()) {
      const preview = payload.text.trim().slice(0, 30);
      tray.setToolTip(
        `SmartPasteHub${incognitoMode ? " \uD83D\uDD75\uFE0F" : ""}\n\uD83D\uDCCB ${preview || "..."}\n\u2728 ${sessionCleanCount} cleans this session`,
      );
    }
  });
}

// ── Single-instance lock ──────────────────────────────────────────────────────
const gotSingleInstanceLock = app.requestSingleInstanceLock();

async function handleContextMenuArgs(argv: string[]) {
  const pasteDirIndex = argv.indexOf("--smart-paste-dir");
  const cleanFileIndex = argv.indexOf("--smart-clean-file");

  if (pasteDirIndex !== -1 && pasteDirIndex + 1 < argv.length) {
    const targetDir = argv[pasteDirIndex + 1]!;
    try {
      const text = clipboard.readText();
      if (!text.trim()) return;

      const { cleaned } = await cleanContent({ text, html: "" });
      // Generate filename based on content type
      const detected = detectContentType(cleaned);
      let ext = "txt";
      if (detected.type.includes("json")) ext = "json";
      else if (detected.type.includes("csv")) ext = "csv";
      else if (detected.type.includes("code")) ext = "js";
      else if (detected.type.includes("md")) ext = "md";

      const filename = `smartpaste_${Date.now()}.${ext}`;
      const filepath = path.join(targetDir, filename);

      fs.writeFileSync(filepath, cleaned, "utf-8");

      if (Notification.isSupported()) {
        new Notification({
          title: "SmartPasteHub",
          body: `File created: ${filename}`,
          icon: resolveAppIconPath(),
        }).show();
      }
    } catch (err) {
      console.error("Failed to paste as new file:", err);
    }
    return true; // Handled
  }

  if (cleanFileIndex !== -1 && cleanFileIndex + 1 < argv.length) {
    const targetFile = argv[cleanFileIndex + 1]!;
    try {
      const content = fs.readFileSync(targetFile, "utf-8");
      const { cleaned } = await cleanContent({ text: content, html: "" });
      clipboard.writeText(cleaned);

      if (Notification.isSupported()) {
        new Notification({
          title: "SmartPasteHub",
          body: `Cleaned content copied to clipboard`,
          icon: resolveAppIconPath(),
        }).show();
      }
    } catch (err) {
      console.error("Failed to clean file to clipboard:", err);
    }
    return true; // Handled
  }

  return false;
}

if (!gotSingleInstanceLock) {
  // Another instance is already running — focus it and exit this one
  app.quit();
} else {
  app.on("second-instance", async (event, commandLine) => {
    // If it's a context menu action, process it in background, otherwise show window
    const handled = await handleContextMenuArgs(commandLine);
    if (!handled) {
      // User tried to open a second instance — show/focus the main window
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
      }
    }
  });
}

// Intercept first-launch arguments before setting up full UI
app.whenReady().then(async () => {
  const handled = await handleContextMenuArgs(process.argv);
  // If it was a context menu action that requires background processing ONLY,
  // we could optionally NOT show the GUI. But for now we initialize normally
  // to ensure systray appears.
  await initializeApp();
});

process.on("uncaughtException", (error) => {
  console.error("[uncaughtException]", error);
  try {
    logger.fatal("Uncaught exception", { error });
  } catch {
    // logger not ready — already logged to stderr above
  }
});
process.on("unhandledRejection", (reason) => {
  console.error("[unhandledRejection]", reason);
  try {
    logger.error("Unhandled rejection", { reason });
  } catch {
    // logger not ready — already logged to stderr above
  }
});

app.on("window-all-closed", () => {
  // Keep running in background — do not quit when all windows closed
  return;
});

app.on("before-quit", () => {
  global.appIsQuiting = true;
});

app.on("will-quit", () => {
  disconnectSync();
  unregisterAllHotkeys();
  watcher.stop();
  destroyHud();
  tray?.destroy();
});
