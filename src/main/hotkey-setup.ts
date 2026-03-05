import { BrowserWindow, clipboard, nativeImage } from "electron";
import { unregisterAllHotkeys, registerHotkey } from "./hotkey-manager";
import { getSettings, updateSettings } from "./settings-store";
import {
  DEFAULT_SETTINGS,
  RECOMMENDED_PASTE_HOTKEYS,
  RECOMMENDED_SCREENSHOT_HOTKEYS,
} from "../shared/constants";
import { showHud } from "./hud-manager";
import { captureRegion } from "../ocr/screen-capture";
import { recognizeText } from "../ocr/ocr-engine";
import { cleanContent } from "../core/cleaner";
import { updateTrayLastCleaned } from "./tray-manager";
import { performPasteWithFallback } from "./paste-fallback-engine";
import { detectActiveAppSignal } from "../security/active-app-detector";
import { pushObservabilityEvent } from "./observability";
import {
  buildPreviewResult,
  getLastPasteUndoText,
  getUsageStatsRepo,
  performClean,
  wasRecentlyCleaned,
} from "./paste-flow";
import { simulateTypeText } from "./paste-simulator";
import { dequeue, peek, size } from "../productivity/paste-queue";
import { telemetry } from "./telemetry";

let getMainWindow: () => BrowserWindow | null = () => null;
let createFloatingWindow: (
  route: string,
  width?: number,
  height?: number,
) => BrowserWindow = () => {
  throw new Error("hotkey runtime is not configured");
};

let ocrHotkeyRunning = false;
let screenshotHotkeyRunning = false;

export function configureHotkeySetup(deps: {
  getMainWindow: () => BrowserWindow | null;
  createFloatingWindow: (
    route: string,
    width?: number,
    height?: number,
  ) => BrowserWindow;
}): void {
  getMainWindow = deps.getMainWindow;
  createFloatingWindow = deps.createFloatingWindow;
}

export function registerFirstAvailableHotkey(
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
    getUsageStatsRepo()?.incrementDaily({ ocrCount: 1 });
    const mainWindow = getMainWindow();
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send("ocr:result", {
        text: extractedText,
        confidence: ocrResult.confidence,
      });
    }
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
    getUsageStatsRepo()?.incrementDaily({ ocrCount: 1 });

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

export function triggerGhostWrite(text?: string): void {
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

export async function translateClipboard(): Promise<void> {
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
    const { rewriteText } = await import("../ai/ai-rewriter");
    const translatedResult = await rewriteText(text, {
      mode: "translate",
      language: targetLang,
      translateTarget: targetLang,
      provider:
        ai.provider as import("../ai/ai-rewriter").RewriteOptions["provider"],
      apiKey: ai.apiKey,
      baseUrl: ai.baseUrl,
      model: ai.model,
    });
    const translated = translatedResult.text;
    clipboard.writeText(translated);
    showHud({ cleaned: translated, original: text, type: "clean" }, 4000);
  } catch (error) {
    showHud(
      {
        cleaned: `❌ Translation failed: ${error instanceof Error ? error.message : String(error)}`,
        original: text,
        type: "system",
      },
      4000,
    );
  }
}

export async function setupHotkeys(): Promise<void> {
  unregisterAllHotkeys();
  const settings = await getSettings();
  const resolveHotkey = (
    key: keyof typeof DEFAULT_SETTINGS.hotkeys,
  ): string => {
    const configured = settings.hotkeys[key];
    if (typeof configured === "string" && configured.trim()) {
      return configured;
    }
    return DEFAULT_SETTINGS.hotkeys[key];
  };

  const preferredPasteHotkey = resolveHotkey("pasteClean");
  const fallbackCandidates = RECOMMENDED_PASTE_HOTKEYS.filter(
    (hotkey) => hotkey !== preferredPasteHotkey,
  );
  const pasteCandidates = [preferredPasteHotkey, ...fallbackCandidates];

  const registered = registerFirstAvailableHotkey(pasteCandidates, async () => {
    const text = clipboard.readText();
    const html = clipboard.readHTML();
    if (!text.trim()) {
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
    if (wasRecentlyCleaned(text)) {
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

      const queueNext = peek();
      if (queueNext !== null) {
        const next = dequeue();
        if (next) {
          setTimeout(() => {
            clipboard.writeText(next);
            const mainWindow = getMainWindow();
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
        cleaned: `⚠️ Hotkey conflict: no available paste shortcut. Tried ${pasteCandidates.join(", ")}.`,
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
        cleaned: `⌨️ Hotkey switched to ${registered} to avoid conflict`,
        original: "",
        type: "system",
      },
      3500,
    );
  }

  const ocrCaptureHotkey = resolveHotkey("ocrCapture");
  const ocrCaptureRegistered = registerHotkey(ocrCaptureHotkey, () => {
    telemetry.track("ocr");
    void captureOcrScreenshotToClipboardText(true);
  });
  if (!ocrCaptureRegistered) {
    showHud(
      {
        cleaned: `⚠️ ${ocrCaptureHotkey} is unavailable (already used by another app)`,
        original: "",
        type: "system",
      },
      3500,
    );
  }

  const preferredScreenshotHotkey = resolveHotkey("screenshotCapture");
  const screenshotFallbackCandidates = RECOMMENDED_SCREENSHOT_HOTKEYS.filter(
    (hotkey) => hotkey !== preferredScreenshotHotkey,
  );
  const screenshotCandidates = [
    preferredScreenshotHotkey,
    ...screenshotFallbackCandidates,
  ];
  const screenshotCaptureRegistered = registerFirstAvailableHotkey(
    screenshotCandidates,
    () => {
      void captureScreenshotToClipboardImage();
    },
  );
  if (!screenshotCaptureRegistered) {
    showHud(
      {
        cleaned: `⚠️ Screenshot hotkey conflict. Tried ${screenshotCandidates.join(", ")}`,
        original: "",
        type: "system",
      },
      3500,
    );
  } else if (screenshotCaptureRegistered !== preferredScreenshotHotkey) {
    await updateSettings({
      hotkeys: {
        ...settings.hotkeys,
        screenshotCapture: screenshotCaptureRegistered,
      },
    });
    showHud(
      {
        cleaned: `⌨️ Screenshot hotkey switched to ${screenshotCaptureRegistered}`,
        original: "",
        type: "system",
      },
      3500,
    );
  }

  const presetSwitchHotkey = resolveHotkey("presetSwitch");
  const presetSwitchRegistered = registerHotkey(
    presetSwitchHotkey,
    async () => {
      const s = await getSettings();
      const aiEnabled =
        s.ai.enabled && s.ai.apiKey && s.ai.provider !== "local";
      if (aiEnabled) {
        const { AI_MODES, aiModeLabel } = await import("./ai-paste-handler");
        const currentMode = (s.ai.aiMode ??
          "auto") as (typeof AI_MODES)[number];
        const currentIdx = AI_MODES.indexOf(currentMode);
        const nextMode = AI_MODES[
          (currentIdx + 1) % AI_MODES.length
        ] as (typeof AI_MODES)[number];
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
      if (s.presets.custom.length === 0) return;
      const currentIndex = s.presets.custom.findIndex(
        (p) => p.id === s.presets.active,
      );
      const nextIndex = (currentIndex + 1) % s.presets.custom.length;
      const nextPreset = s.presets.custom[nextIndex];
      if (!nextPreset) return;
      await updateSettings({
        presets: { ...s.presets, active: nextPreset.id },
      });
      showHud(
        {
          cleaned: `🎨 Preset: ${nextPreset.name}`,
          original: "",
          type: "system",
        },
        2000,
      );
    },
  );
  if (!presetSwitchRegistered) {
    showHud(
      {
        cleaned: `⚠️ ${presetSwitchHotkey} is unavailable (already used by another app)`,
        original: "",
        type: "system",
      },
      3500,
    );
  }

  const ghostWriteHotkey = resolveHotkey("ghostWrite");
  const ghostWriteRegistered = registerHotkey(ghostWriteHotkey, () => {
    telemetry.track("ghost_write");
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

  const historyHotkey = resolveHotkey("historyOpen");
  registerHotkey(historyHotkey, () => {
    createFloatingWindow("/paste-history-ring", 500, 500);
  });

  const multiCopyHotkey = resolveHotkey("multiCopy");
  registerHotkey(multiCopyHotkey, async () => {
    telemetry.track("multi_copy");
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

  const translateClipboardHotkey = resolveHotkey("translateClipboard");
  registerHotkey(translateClipboardHotkey, () => {
    telemetry.track("translate");
    void translateClipboard();
  });

  const commandPaletteHotkey = resolveHotkey("commandPalette");
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

  const undoHotkey = resolveHotkey("undoLastPaste");
  registerHotkey(undoHotkey, async () => {
    const s = await getSettings();
    if (!(s.automation?.enableUndo ?? true)) {
      return;
    }
    const undoText = getLastPasteUndoText();
    if (!undoText) {
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
    clipboard.writeText(undoText);
    performPasteWithFallback(
      undefined,
      undoText,
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
        original: undoText,
        type: "undo",
      },
      2200,
    );
  });
}
