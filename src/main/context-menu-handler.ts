import fs from "fs";
import { clipboard, Notification } from "electron";
import path from "path";
import { cleanContent } from "../core/cleaner";
import { detectContentType } from "../core/content-detector";
import { rewriteText } from "../ai/ai-rewriter";
import { getSettings } from "./settings-store";
import { resolveAppIconPath } from "./utils/icon-resolver";

export async function saveClipboardToFile(
  targetDir: string,
  transformType: "clean" | "ai-fix" | "translate",
): Promise<void> {
  try {
    const text = clipboard.readText();
    if (!text.trim()) return;

    let finalContent = "";
    if (transformType === "clean") {
      const { cleaned } = await cleanContent({ text, html: "" });
      finalContent = cleaned;
    } else {
      const settings = await getSettings();
      if (!settings.ai.enabled || !settings.ai.apiKey) {
        if (Notification.isSupported()) {
          new Notification({
            title: "SmartPasteHub",
            body: "AI is not configured. Please add an API key in Settings.",
          }).show();
        }
        return;
      }

      const mode = transformType === "ai-fix" ? "fix_grammar" : "translate";
      const aiResult = await rewriteText(text, {
        mode,
        provider: settings.ai.provider,
        apiKey: settings.ai.apiKey,
        baseUrl: settings.ai.baseUrl,
        model: settings.ai.model,
        language: settings.general.language,
        translateTarget: "en",
      });
      finalContent = aiResult.text;
    }

    const detected = detectContentType(finalContent);
    let ext = "txt";
    if (detected.type.includes("json")) ext = "json";
    else if (detected.type.includes("csv")) ext = "csv";
    else if (detected.type.includes("code")) ext = "js";
    else if (detected.type.includes("md")) ext = "md";

    const filename = `smartpaste_${Date.now()}.${ext}`;
    const filepath = path.join(targetDir, filename);

    fs.writeFileSync(filepath, finalContent, "utf-8");

    if (Notification.isSupported()) {
      new Notification({
        title: "SmartPasteHub",
        body: `File created: ${filename}`,
        icon: resolveAppIconPath(),
      }).show();
    }
  } catch (err) {
    console.error(`Failed to paste as new file (${transformType}):`, err);
  }
}

export async function processFileToClipboard(
  targetFile: string,
  transformType: "clean" | "summarize" | "translate",
): Promise<void> {
  try {
    const content = fs.readFileSync(targetFile, "utf-8");

    let finalContent = "";
    if (transformType === "clean") {
      const { cleaned } = await cleanContent({ text: content, html: "" });
      finalContent = cleaned;
    } else {
      const settings = await getSettings();
      if (!settings.ai.enabled || !settings.ai.apiKey) {
        if (Notification.isSupported()) {
          new Notification({
            title: "SmartPasteHub",
            body: "AI is not configured. Please add an API key in Settings.",
          }).show();
        }
        return;
      }

      const aiResult = await rewriteText(content, {
        mode: transformType,
        provider: settings.ai.provider,
        apiKey: settings.ai.apiKey,
        baseUrl: settings.ai.baseUrl,
        model: settings.ai.model,
        language: settings.general.language,
        translateTarget: "en",
      });
      finalContent = aiResult.text;
    }

    clipboard.writeText(finalContent);

    if (Notification.isSupported()) {
      new Notification({
        title: "SmartPasteHub",
        body: "Result copied to clipboard",
        icon: resolveAppIconPath(),
      }).show();
    }
  } catch (err) {
    console.error(`Failed to process file (${transformType}):`, err);
  }
}

export async function handleContextMenuArgs(argv: string[]): Promise<boolean> {
  const pasteDirIndex = argv.indexOf("--smart-paste-dir");
  const pasteAiFixIndex = argv.indexOf("--smart-paste-ai-fix");
  const pasteTranslateIndex = argv.indexOf("--smart-paste-translate");
  const cleanFileIndex = argv.indexOf("--smart-clean-file");
  const summarizeFileIndex = argv.indexOf("--smart-summarize-file");
  const translateFileIndex = argv.indexOf("--smart-translate-file");

  if (pasteDirIndex !== -1 && pasteDirIndex + 1 < argv.length) {
    await saveClipboardToFile(argv[pasteDirIndex + 1]!, "clean");
    return true;
  }

  if (pasteAiFixIndex !== -1 && pasteAiFixIndex + 1 < argv.length) {
    await saveClipboardToFile(argv[pasteAiFixIndex + 1]!, "ai-fix");
    return true;
  }

  if (pasteTranslateIndex !== -1 && pasteTranslateIndex + 1 < argv.length) {
    await saveClipboardToFile(argv[pasteTranslateIndex + 1]!, "translate");
    return true;
  }

  if (cleanFileIndex !== -1 && cleanFileIndex + 1 < argv.length) {
    await processFileToClipboard(argv[cleanFileIndex + 1]!, "clean");
    return true;
  }

  if (summarizeFileIndex !== -1 && summarizeFileIndex + 1 < argv.length) {
    await processFileToClipboard(argv[summarizeFileIndex + 1]!, "summarize");
    return true;
  }

  if (translateFileIndex !== -1 && translateFileIndex + 1 < argv.length) {
    await processFileToClipboard(argv[translateFileIndex + 1]!, "translate");
    return true;
  }

  return false;
}
