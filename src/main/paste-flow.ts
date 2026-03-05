import { BrowserWindow, clipboard } from "electron";
import { cleanContent } from "../core/cleaner";
import { detectActiveAppSignal } from "../security/active-app-detector";
import { evaluateContextGuard } from "../security/context-guard";
import { getSettings, updateSettings } from "./settings-store";
import { showHud } from "./hud-manager";
import { updateTrayLastCleaned } from "./tray-manager";
import { scheduleClipboardClear } from "../security/auto-clear";
import { getHistoryRepo } from "./history-repo-ref";
import { detectContentType } from "../core/content-detector";
import { matchContextRule, DEFAULT_RULES } from "../core/context-rules";
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
import { performPasteWithFallback } from "./paste-fallback-engine";
import { pushObservabilityEvent } from "./observability";
import { pushTimelineEvent } from "./timeline-cluster";
import { ContextRulesRepository } from "./repositories/context-rules.repo";
import { SnippetsRepository } from "./repositories/snippets.repo";
import { UsageStatsRepository } from "./repositories/usage-stats.repo";
import { AppSettings, ContentType } from "../shared/types";
import { runAiRewrite } from "./ai-paste-handler";
import { telemetry } from "./telemetry";
import { resolvePrivacyRedactionMode } from "./privacy-redaction-policy";

let lastCleanedText = "";
let lastCleanedAt = 0;
let snippetsRepo: SnippetsRepository | null = null;
let usageStatsRepo: UsageStatsRepository | null = null;
let contextRulesRepo: ContextRulesRepository | null = null;
let copySourceApp: string | undefined = undefined;
let sessionCleanCount = 0;
let clearSensitiveTimer: NodeJS.Timeout | null = null;
let lastPasteUndoText: string | null = null;
const learningCounters = new Map<string, number>();
let lastPasteFeedbackContext: {
  appName: string;
  contentType: ContentType;
  fieldIntent?: string;
  cleanedText: string;
  sourceHtml: string;
  expectedIntent: "plain_text" | "rich_text";
} | null = null;

let getMainWindow: () => BrowserWindow | null = () => null;

export function configurePasteFlowRuntime(deps: {
  getMainWindow: () => BrowserWindow | null;
}): void {
  getMainWindow = deps.getMainWindow;
}

export function setPasteFlowRepositories(repos: {
  snippetsRepo: SnippetsRepository | null;
  usageStatsRepo: UsageStatsRepository | null;
  contextRulesRepo: ContextRulesRepository | null;
}): void {
  snippetsRepo = repos.snippetsRepo;
  usageStatsRepo = repos.usageStatsRepo;
  contextRulesRepo = repos.contextRulesRepo;
}

export function getSnippetsRepo(): SnippetsRepository | null {
  return snippetsRepo;
}

export function getUsageStatsRepo(): UsageStatsRepository | null {
  return usageStatsRepo;
}

export function setCopySourceApp(appName: string | undefined): void {
  copySourceApp = appName;
}

export function getSessionCleanCount(): number {
  return sessionCleanCount;
}

export function getLastPasteUndoText(): string | null {
  return lastPasteUndoText;
}

export function wasRecentlyCleaned(text: string): boolean {
  return text === lastCleanedText && Date.now() - lastCleanedAt < 5 * 60 * 1000;
}

function resolveTrustMode(
  settings: AppSettings,
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

function inferSuggestedPreset(contentType: ContentType): string {
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

export async function buildPreviewResult(
  text: string,
  html: string,
): Promise<{
  cleaned: string;
  stats: string[];
  sourceApp?: string;
  targetApp?: string;
}> {
  const settings = await getSettings();
  const quick = await cleanContent(
    { text, html },
    { skipSensitiveScan: !(settings.security?.detectSensitive ?? true) },
  );
  const activeApp = await detectActiveAppSignal();
  const privacyRedactionMode = resolvePrivacyRedactionMode(
    settings,
    activeApp.appName,
  );
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
    privacyRedactionMode,
  });

  const stats: string[] = [];
  const removed = Number(automation.metadata["trackingParamsRemoved"] ?? 0);
  if (removed > 0) {
    stats.push(`${removed} tracking links stripped`);
  }
  const blocked = Number(automation.metadata["secretsRedacted"] ?? 0);
  if (blocked > 0) {
    stats.push(`${blocked} sensitive secrets masked`);
  }
  if (automation.applied.includes("locale-awareness")) {
    stats.push("Locale formatting normalized");
  }

  return {
    cleaned: automation.displayText ?? automation.text,
    stats,
    sourceApp: copySourceApp,
    targetApp: activeApp.appName,
  };
}

export async function submitPasteFeedback(payload: {
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
    fieldIntent: lastPasteFeedbackContext.fieldIntent,
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

export async function performClean(
  text: string,
  html: string,
  source: "hotkey" | "auto",
): Promise<boolean> {
  const settings = await getSettings();
  const result = await cleanContent(
    { text, html },
    { skipSensitiveScan: !(settings.security?.detectSensitive ?? true) },
  );
  const securityAlert = result.securityAlert;
  const activeApp = await detectActiveAppSignal();
  const privacyRedactionMode = resolvePrivacyRedactionMode(
    settings,
    activeApp.appName,
  );
  const trustMode = resolveTrustMode(settings, activeApp.appName);
  const mainWindow = getMainWindow();

  let contextCleaned = result.cleaned;
  if (activeApp.appType === "terminal") {
    contextCleaned = result.cleaned.replace(/\s+/g, " ").trim();
  }
  const contextResult = { ...result, cleaned: contextCleaned };

  const dbRules = contextRulesRepo?.list() ?? [];
  const mappedDbRules = dbRules.map((r) => ({
    id: String(r.id),
    name: r.name,
    sourceApp: r.source_app ?? undefined,
    targetApp: r.target_app ?? undefined,
    contentType: (r.content_type ?? undefined) as ContentType | undefined,
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
    copySourceApp,
    activeApp.appName,
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
    privacyRedactionMode,
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

  if (result.securityAlert) {
    const sensitiveTypes = [
      ...new Set(result.securityAlert.matches.map((m) => m.type as string)),
    ];
    const visibleSensitiveText =
      automationResult.displayText ?? contextResult.cleaned;
    showHud(
      {
        cleaned: visibleSensitiveText,
        original: text,
        type: "sensitive_warning",
        sensitiveCount: result.securityAlert.matches.length,
        sensitiveTypes,
        sourceApp: activeApp.appName,
        securityAlert: {
          matches: result.securityAlert.matches,
          text: result.securityAlert.text,
        },
      },
      8000,
    );
    clipboard.writeText(contextResult.cleaned);
    updateTrayLastCleaned(visibleSensitiveText);
    lastCleanedText = text;
    lastCleanedAt = Date.now();
    sessionCleanCount += 1;
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("security:alert", {
        matches: result.securityAlert?.matches ?? [],
      });
    }
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
        cleanedText: visibleSensitiveText,
        htmlContent: null,
        contentType: contentType.type,
        sourceApp: activeApp.appName,
        presetUsed: activePreset,
        charCount: visibleSensitiveText.length,
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
    telemetry.track("paste", {
      chars_cleaned: contextResult.cleaned.length,
      content_type: detectedForRule.type,
      has_table: (contextResult.appliedTransforms ?? []).includes(
        "table-converter",
      ),
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

  const finalCleaned = await runAiRewrite({
    settings,
    preAiStrategyConfidence: preAiStrategy.confidence,
    preAiDetectionType: preAiDetection.type,
    contextCleaned: contextResult.cleaned,
    baselineCleaned: result.cleaned,
    copySourceApp,
    activeAppName: activeApp.appName,
    diagnosticsMaxEvents: settings.diagnostics?.maxEvents ?? 500,
    pushPolicyEvent: (detail) => {
      pushObservabilityEvent(
        {
          ts: new Date().toISOString(),
          app: activeApp.appName,
          kind: "policy",
          detail,
        },
        settings.diagnostics?.maxEvents ?? 500,
      );
    },
    incrementAiRewriteStat: () => {
      usageStatsRepo?.incrementDaily({ aiRewrites: 1 });
      telemetry.track("ai_rewrite", { mode: settings.ai.aiMode });
    },
  });

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

  if (strategy.intent === "rich_text") {
    const richHtml = buildRichClipboardHtml(finalCleaned, html);
    if (richHtml) {
      clipboard.write({ text: finalCleaned, html: richHtml });
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

  lastCleanedText = text;
  lastCleanedAt = Date.now();

  const contentType = detectContentType(finalCleaned);

  // We save the masked version for display/history if privacy firewall triggered it,
  // but the raw OS clipboard gets the unmasked finalCleaned text.
  const textForHistory = automationResult.displayText || finalCleaned;

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
        cleanedText: textForHistory,
        htmlContent: null,
        contentType: contentType.type,
        sourceApp: activeApp.appName,
        presetUsed: activePreset,
        charCount: textForHistory.length,
        isSensitive: Boolean(result.securityAlert),
        aiMode: settings.ai.enabled ? (settings.ai.aiMode ?? null) : null,
      });
    }

    // Prune old history entries based on settings
    const maxItems = settings.history.maxItems ?? 1000;
    const retentionDays = settings.history.retentionDays ?? 30;
    getHistoryRepo()!.prune(maxItems, retentionDays);
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
  telemetry.track("paste", {
    chars_cleaned: finalCleaned.length,
    content_type: sourceDetection.type,
    preset: activePreset,
    has_table: (contextResult.appliedTransforms ?? []).includes(
      "table-converter",
    ),
    ai_mode: settings.ai.enabled ? settings.ai.aiMode : null,
  });

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

  if (mainWindow && !mainWindow.isDestroyed()) {
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
    if (securityAlert) {
      mainWindow.webContents.send("security:alert", {
        matches: securityAlert?.matches ?? [],
      });
    }
  }

  if (decision.autoClearAfterSeconds) {
    scheduleClipboardClear(decision.autoClearAfterSeconds, () => {
      const win = getMainWindow();
      if (win && !win.isDestroyed()) {
        win.webContents.send("clipboard:auto-cleared", {
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
      fieldIntent: String(automationResult.metadata["fieldIntent"] ?? ""),
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
    fieldIntent: String(automationResult.metadata["fieldIntent"] ?? ""),
    cleanedText: finalCleaned,
    sourceHtml: html,
    expectedIntent: strategy.intent,
  };

  copySourceApp = undefined;
  sessionCleanCount += 1;
  lastPasteUndoText = text;

  return true;
}
