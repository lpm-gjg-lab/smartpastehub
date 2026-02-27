import React, { useEffect } from "react";
import styles from "../styles/pages/SmartPastePage.module.css";
import { SmartPasteZone } from "../components/SmartPasteZone";
import { ResultPanel } from "../components/ResultPanel";
import { Button } from "../components/Button";
import { useSmartPasteStore } from "../stores/useSmartPasteStore";
import { useToastStore } from "../stores/useToastStore";
import { invokeIPC, onIPC, hasSmartPasteBridge } from "../lib/ipc";
import { getTransformLabels } from "../lib/transform-labels";
import { getSmartActions, getAutoPreset } from "../lib/smart-actions";
import type { AppSettings, ContentType } from "../../shared/types";

type RewriteMode =
  | "summarize"
  | "fix_grammar"
  | "rephrase"
  | "formalize"
  | "translate"
  | "bullet_list"
  | "numbered_list"
  | "to_table"
  | "join_lines";

interface RewriteResult {
  rewritten: string;
  mode: RewriteMode;
  changed: boolean;
}

interface ProcessClipboardResult {
  cleaned: string;
  securityAlert: unknown | null;
  error?: unknown;
  changes?: string[];
  detectedType: ContentType;
  detectionConfidence: number;
  original: string;
}

interface MultiClipboardState {
  isCollecting: boolean;
  items: string[];
}

type TargetFormat = "json" | "yaml" | "toml";

interface SensitiveMatch {
  type: string;
  value: string;
  start: number;
  end: number;
}

interface RingItem {
  id: number;
  slotIndex: number;
  content: string;
  contentType: string;
  timestamp: number;
}

type CaseType =
  | "camelCase"
  | "PascalCase"
  | "snake_case"
  | "kebab-case"
  | "SCREAMING_SNAKE"
  | "Title Case"
  | "lowercase"
  | "UPPERCASE";
const AI_ACTIONS: { mode: RewriteMode; label: string; icon: string }[] = [
  { mode: "fix_grammar", label: "Fix Grammar", icon: "✅" },
  { mode: "rephrase", label: "Rephrase", icon: "🔄" },
  { mode: "formalize", label: "Formalize", icon: "👔" },
  { mode: "summarize", label: "Summarize", icon: "📝" },
];

const HOTKEYS = [
  { keys: "Ctrl+Alt+H", desc: "History" },
  { keys: "Ctrl+Alt+S", desc: "OCR Screenshot" },
  { keys: "Shift+PrintScreen", desc: "OCR Screenshot" },
  { keys: "Ctrl+Alt+Shift+S", desc: "Screenshot Only" },
  { keys: "PrintScreen", desc: "Screenshot Only" },
  { keys: "Ctrl+Alt+C", desc: "Multi-Copy" },
  { keys: "Ctrl+Alt+G", desc: "Ghost Write" },
  { keys: "Ctrl+Alt+T", desc: "Translate" },
];

export const SmartPastePage: React.FC = () => {
  const [isAiRewriting, setIsAiRewriting] = React.useState(false);
  const [pasteHotkey, setPasteHotkey] = React.useState("Alt+Shift+V");
  const [autoCleanEnabled, setAutoCleanEnabled] = React.useState(false);
  const [moreAiOpen, setMoreAiOpen] = React.useState(false);

  // Phase 3 — Multi-clipboard
  const [multiState, setMultiState] = React.useState<MultiClipboardState>({
    isCollecting: false,
    items: [],
  });

  // Phase 5 — Transform Lab
  const [showTransform, setShowTransform] = React.useState(false);
  const [targetFormat, setTargetFormat] = React.useState<TargetFormat>("json");
  const [showRegexLab, setShowRegexLab] = React.useState(false);
  const [showAdvancedTools, setShowAdvancedTools] = React.useState(false);
  const [regexPattern, setRegexPattern] = React.useState("");
  const [regexReplacement, setRegexReplacement] = React.useState("");
  const [regexFlags, setRegexFlags] = React.useState("g");
  const [regexError, setRegexError] = React.useState<string | null>(null);
  const [regexPreview, setRegexPreview] = React.useState<string | null>(null);

  // Phase 7 — Security Inspector
  const [securityMatches, setSecurityMatches] = React.useState<
    SensitiveMatch[]
  >([]);
  const [maskMode, setMaskMode] = React.useState<"full" | "partial" | "skip">(
    "partial",
  );
  const [showSecurity, setShowSecurity] = React.useState(false);
  const [multiAddText, setMultiAddText] = React.useState("");
  // Paste Queue
  const [queueSize, setQueueSize] = React.useState(0);
  const [queuePeek, setQueuePeek] = React.useState<string | null>(null);
  const [queueEnqueueText, setQueueEnqueueText] = React.useState("");

  // New feature states
  const [ringItems, setRingItems] = React.useState<RingItem[]>([]);
  const [translateLang, setTranslateLang] = React.useState<"id" | "en">("en");
  const [detectedTone, setDetectedTone] = React.useState<string | null>(null);
  const [snippetPopup, setSnippetPopup] = React.useState<{
    trigger: string;
    content: string;
    name: string;
  } | null>(null);
  const [selectedCase, setSelectedCase] = React.useState<CaseType>("camelCase");
  const [isTranslating, setIsTranslating] = React.useState(false);
  const [isDetectingTone, setIsDetectingTone] = React.useState(false);
  const [isRedacting, setIsRedacting] = React.useState(false);
  const [isSummarizingUrl, setIsSummarizingUrl] = React.useState(false);

  // Macro Recorder
  const [macros, setMacros] = React.useState<
    { name: string; steps: string[] }[]
  >(() => {
    try {
      return JSON.parse(localStorage.getItem("sph_macros") ?? "[]") as {
        name: string;
        steps: string[];
      }[];
    } catch {
      return [];
    }
  });
  const [isRecording, setIsRecording] = React.useState(false);
  const [recordedSteps, setRecordedSteps] = React.useState<string[]>([]);
  const [macroName, setMacroName] = React.useState("");
  const [showMacroPanel, setShowMacroPanel] = React.useState(false);

  // Clipboard Diff Viewer
  const [showDiff, setShowDiff] = React.useState(false);
  const [diffBefore, setDiffBefore] = React.useState("");
  const [diffAfter, setDiffAfter] = React.useState("");
  const store = useSmartPasteStore();
  const { addToast } = useToastStore();
  const pollFailuresRef = React.useRef({ multi: 0, queue: 0, ring: 0 });
  const pollWarnedRef = React.useRef({
    multi: false,
    queue: false,
    ring: false,
  });

  const markPollSuccess = React.useCallback(
    (key: "multi" | "queue" | "ring") => {
      const prevFailures = pollFailuresRef.current[key];
      pollFailuresRef.current[key] = 0;
      if (pollWarnedRef.current[key] && prevFailures >= 3) {
        addToast({
          title: "Connection Restored",
          message: `${key} telemetry recovered`,
          type: "info",
          duration: 1800,
        });
      }
      pollWarnedRef.current[key] = false;
    },
    [addToast],
  );

  const markPollFailure = React.useCallback(
    (key: "multi" | "queue" | "ring") => {
      pollFailuresRef.current[key] += 1;
      const failures = pollFailuresRef.current[key];
      if (failures >= 3 && !pollWarnedRef.current[key]) {
        pollWarnedRef.current[key] = true;
        addToast({
          title: "Background data delayed",
          message: `${key} status is temporarily unavailable`,
          type: "warning",
          duration: 2600,
        });
      }
    },
    [addToast],
  );

  useEffect(() => {
    localStorage.setItem("sph_macro_recording", isRecording ? "1" : "0");
    window.dispatchEvent(
      new CustomEvent("sph:macro-recording", {
        detail: { active: isRecording },
      }),
    );
  }, [isRecording]);

  useEffect(() => {
    return () => {
      localStorage.setItem("sph_macro_recording", "0");
      window.dispatchEvent(
        new CustomEvent("sph:macro-recording", {
          detail: { active: false },
        }),
      );
    };
  }, []);

  useEffect(() => {
    const loadHotkey = async () => {
      try {
        const settings = await invokeIPC<AppSettings>("settings:get");
        if (settings?.hotkeys?.pasteClean) {
          setPasteHotkey(settings.hotkeys.pasteClean);
        }
        setAutoCleanEnabled(Boolean(settings?.general?.autoCleanOnCopy));
      } catch {
        // Keep default hint
      }
    };
    void loadHotkey();

    // Listen for OCR results from main process (triggered by Ctrl+Shift+V with image in clipboard)
    const removeOcrListener = onIPC(
      "ocr:result",
      (payload: unknown) => {
        const data = payload as { text?: string; confidence?: number };
        if (data?.text) {
          store.setInput(data.text);
          addToast({
            title: `🧾 OCR selesai (${Math.round((data.confidence ?? 0) * 100)}% akurasi)`,
            message: "Teks dari gambar dimuat ke panel input",
            type: "success",
            duration: 3000,
          });
        }
      },
    );

    return () => {
      if (typeof removeOcrListener === "function") removeOcrListener();
    };

    // Poll multi-clipboard + queue state every 2s
    const multiInterval = window.setInterval(async () => {
      try {
        const ms = await invokeIPC<MultiClipboardState>("multi:state");
        setMultiState(ms);
        markPollSuccess("multi");
      } catch {
        markPollFailure("multi");
      }
      try {
        const size = await invokeIPC<number>("queue:size");
        const peek = await invokeIPC<string | null>("queue:peek");
        setQueueSize(size);
        setQueuePeek(peek);
        markPollSuccess("queue");
      } catch {
        markPollFailure("queue");
      }
      try {
        const items = await invokeIPC<RingItem[]>("ring:get-items");
        setRingItems(items ?? []);
        markPollSuccess("ring");
      } catch {
        markPollFailure("ring");
      }
    }, 2000);
    return () => window.clearInterval(multiInterval);
  }, [markPollFailure, markPollSuccess]);

  // Auto-detect type when input changes
  useEffect(() => {
    if (!store.inputText.trim()) {
      store.setResult({
        outputText: store.outputText,
        detectedType: "unknown",
        appliedTransforms: store.appliedTransforms,
      });
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const detection = await invokeIPC<{ type: ContentType }>(
          "clipboard:detect",
          {
            text: store.inputText,
          },
        );
        store.setResult({
          outputText: store.outputText,
          detectedType: detection.type,
          appliedTransforms: store.appliedTransforms,
        });
      } catch (err) {
        console.error("Detection failed", err);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [store.inputText]);

  // Snippet trigger — watch for ;; prefix in any focused input/textarea
  useEffect(() => {
    let typedBuffer = "";
    let debounceTimer: ReturnType<typeof setTimeout> | null = null;

    const handleKeydown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName !== "INPUT" && target.tagName !== "TEXTAREA") return;
      if (e.key.length === 1) typedBuffer += e.key;
      else if (e.key === "Backspace") typedBuffer = typedBuffer.slice(0, -1);
      else typedBuffer = "";

      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(async () => {
        if (
          typedBuffer.startsWith(";") &&
          typedBuffer.startsWith(";", 1) &&
          typedBuffer.length > 2
        ) {
          const trigger = typedBuffer.slice(2);
          try {
            const result = await invokeIPC<{
              content: string;
              name: string;
            } | null>("snippet:expand", { trigger });
            if (result) setSnippetPopup({ trigger, ...result });
          } catch {
            /* ignore */
          }
        }
      }, 400);
    };

    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, []);

  const isUrl = (text: string) => /^https?:\/\//i.test(text.trim());

  const handleTranslate = async () => {
    const text = (store.outputText || store.inputText).trim();
    if (!text) {
      addToast({ title: "Nothing to translate", type: "warning" });
      return;
    }
    setIsTranslating(true);
    try {
      const res = await invokeIPC<{ result: string }>("transform:translate", {
        text,
        targetLang: translateLang,
      });
      store.setResult({
        outputText: res.result,
        detectedType: store.detectedType ?? "plain_text",
        appliedTransforms: [
          ...store.appliedTransforms,
          `translate:${translateLang}`,
        ],
      });
      addToast({ title: "Translated", type: "success" });
      recordStep(`translate:${translateLang}`);
    } catch (err) {
      addToast({
        title: "Translate Failed",
        message: String(err),
        type: "error",
      });
    } finally {
      setIsTranslating(false);
    }
  };

  const handleDetectTone = async () => {
    const text = (store.outputText || store.inputText).trim();
    if (!text) {
      addToast({ title: "Nothing to analyze", type: "warning" });
      return;
    }
    setIsDetectingTone(true);
    try {
      const res = await invokeIPC<{ tone: string; suggestion: string }>(
        "ai:detect-tone",
        { text },
      );
      setDetectedTone(`${res.tone} — ${res.suggestion}`);
      addToast({ title: `Tone: ${res.tone}`, type: "info" });
    } catch (err) {
      addToast({
        title: "Tone Detection Failed",
        message: String(err),
        type: "error",
      });
    } finally {
      setIsDetectingTone(false);
    }
  };

  const handleSummarizeUrl = async () => {
    const url = store.inputText.trim();
    setIsSummarizingUrl(true);
    try {
      const res = await invokeIPC<{ summary: string }>("ai:summarize-url", {
        url,
      });
      store.setResult({
        outputText: res.summary,
        detectedType: "plain_text",
        appliedTransforms: [...store.appliedTransforms, "summarize-url"],
      });
      addToast({ title: "URL Summarized", type: "success" });
    } catch (err) {
      addToast({
        title: "Summarize Failed",
        message: String(err),
        type: "error",
      });
    } finally {
      setIsSummarizingUrl(false);
    }
  };

  const handleRedactPII = async () => {
    const text = (store.outputText || store.inputText).trim();
    if (!text) {
      addToast({ title: "Nothing to redact", type: "warning" });
      return;
    }
    setIsRedacting(true);
    try {
      const res = await invokeIPC<{ redacted: string; count: number }>(
        "clipboard:redact",
        { text },
      );
      store.setResult({
        outputText: res.redacted,
        detectedType: store.detectedType ?? "plain_text",
        appliedTransforms: [...store.appliedTransforms, `redact:${res.count}`],
      });
      addToast({ title: `Redacted ${res.count} item(s)`, type: "success" });
    } catch (err) {
      addToast({ title: "Redact Failed", message: String(err), type: "error" });
    } finally {
      setIsRedacting(false);
    }
  };

  const handleCaseConvert = async () => {
    const text = (store.outputText || store.inputText).trim();
    if (!text) {
      addToast({ title: "Nothing to convert", type: "warning" });
      return;
    }
    try {
      const res = await invokeIPC<{ result: string }>(
        "transform:case-convert",
        { text, targetCase: selectedCase },
      );
      store.setResult({
        outputText: res.result,
        detectedType: store.detectedType ?? "plain_text",
        appliedTransforms: [...store.appliedTransforms, `case:${selectedCase}`],
      });
      addToast({ title: `Converted to ${selectedCase}`, type: "success" });
      recordStep(`case:${selectedCase}`);
    } catch (err) {
      addToast({
        title: "Convert Failed",
        message: String(err),
        type: "error",
      });
    }
  };

  const handleAiRewrite = async (mode: RewriteMode) => {
    if (!store.hasResult || !store.outputText.trim()) {
      addToast({
        title: "No Result",
        message: "Generate cleaned text first",
        type: "warning",
      });
      return;
    }

    setIsAiRewriting(true);
    try {
      const rewritten = await invokeIPC<RewriteResult>("ai:rewrite", {
        text: store.outputText,
        mode,
      });

      if (rewritten.changed) {
        store.setResult({
          outputText: rewritten.rewritten,
          detectedType: store.detectedType ?? "plain_text",
          appliedTransforms: [
            ...store.appliedTransforms,
            `ai:${rewritten.mode}`,
          ],
        });

        addToast({
          title: "AI Rewrite Complete",
          message: `Applied ${rewritten.mode.replace("_", " ")}`,
          type: "success",
        });
        recordStep(`ai:${rewritten.mode}`);
      } else {
        addToast({
          title: "AI Rewrite Unchanged",
          message: "No provider output available; text stays the same",
          type: "info",
        });
      }
    } catch (err) {
      addToast({
        title: "AI Rewrite Failed",
        message: err instanceof Error ? err.message : "Unknown AI error",
        type: "error",
      });
    } finally {
      setIsAiRewriting(false);
    }
  };

  // Phase 3 handlers
  const handleMultiStart = async () => {
    try {
      await invokeIPC("multi:start");
      addToast({
        title: "Multi-Copy started",
        message: "Copy multiple items now",
        type: "info",
      });
    } catch (err) {
      addToast({
        title: "Multi-Copy Failed",
        message: String(err),
        type: "error",
      });
    }
  };

  const handleMultiMerge = async () => {
    try {
      const merged = await invokeIPC<string>("multi:merge");
      if (merged) {
        store.setInput(merged);
        addToast({
          title: "Merged",
          message: `${multiState.items.length} items merged`,
          type: "success",
        });
      }
    } catch (err) {
      addToast({ title: "Merge Failed", message: String(err), type: "error" });
    }
  };

  const handleMultiClear = async () => {
    try {
      await invokeIPC("multi:clear");
      setMultiState({ isCollecting: false, items: [] });
      addToast({
        title: "Cleared",
        message: "Multi-clipboard cleared",
        type: "info",
      });
    } catch (err) {
      addToast({ title: "Clear Failed", message: String(err), type: "error" });
    }
  };

  const handleMultiAdd = async () => {
    if (!multiAddText.trim()) return;
    try {
      await invokeIPC("multi:add", { text: multiAddText });
      setMultiAddText("");
      addToast({
        title: "Added",
        message: "Item added to multi-clipboard",
        type: "success",
      });
    } catch (err) {
      addToast({ title: "Add Failed", message: String(err), type: "error" });
    }
  };

  // Phase 5 handler
  const handleTransform = async (
    channel: string,
    label: string,
    arg?: unknown,
  ) => {
    if (!store.hasResult || !store.outputText.trim()) {
      addToast({
        title: "No Result",
        message: "Generate cleaned text first",
        type: "warning",
      });
      return;
    }
    try {
      const res = await invokeIPC<{ result: string }>(
        channel,
        arg ?? store.outputText,
      );
      store.setResult({
        outputText: res.result,
        detectedType: store.detectedType ?? "plain_text",
        appliedTransforms: [...store.appliedTransforms, label],
      });
      addToast({ title: `${label} applied`, type: "success" });
    } catch (err) {
      addToast({
        title: `${label} failed`,
        message: String(err),
        type: "error",
      });
    }
  };

  // Phase 7 handler
  const handleSecurityScan = async () => {
    const textToScan = store.outputText || store.inputText;
    if (!textToScan.trim()) {
      addToast({
        title: "Nothing to scan",
        message: "Paste or generate text first",
        type: "warning",
      });
      return;
    }
    try {
      const matches = await invokeIPC<SensitiveMatch[]>("security:scan", {
        text: textToScan,
      });
      setSecurityMatches(matches);
      setShowSecurity(true);
      addToast({
        title:
          matches.length > 0
            ? `⚠️ ${matches.length} sensitive item(s) found`
            : "✅ No sensitive data found",
        type: matches.length > 0 ? "warning" : "success",
      });
    } catch (err) {
      addToast({ title: "Scan Failed", message: String(err), type: "error" });
    }
  };

  const handleApplyMask = async () => {
    const textToMask = store.outputText || store.inputText;
    if (securityMatches.length === 0) {
      addToast({
        title: "No matches",
        message: "Run scan first",
        type: "warning",
      });
      return;
    }
    try {
      const masked = await invokeIPC<string>("security:mask", {
        mode: maskMode,
        matches: securityMatches,
        text: textToMask,
      });
      store.setResult({
        outputText: masked,
        detectedType: store.detectedType ?? "plain_text",
        appliedTransforms: [...store.appliedTransforms, `mask:${maskMode}`],
      });
      setSecurityMatches([]);
      addToast({
        title: "Masked",
        message: `Applied ${maskMode} masking`,
        type: "success",
      });
    } catch (err) {
      addToast({ title: "Mask Failed", message: String(err), type: "error" });
    }
  };

  // Paste Queue handlers
  const handleQueueEnqueue = async () => {
    const text = queueEnqueueText.trim() || store.outputText.trim();
    if (!text) {
      addToast({
        title: "Nothing to queue",
        message: "Generate or type text first",
        type: "warning",
      });
      return;
    }
    try {
      await invokeIPC("queue:enqueue", { text });
      const size = await invokeIPC<number>("queue:size");
      const peek = await invokeIPC<string | null>("queue:peek");
      setQueueSize(size);
      setQueuePeek(peek);
      setQueueEnqueueText("");
      addToast({
        title: "Queued",
        message: `Queue: ${size} item(s)`,
        type: "success",
        duration: 2000,
      });
    } catch (err) {
      addToast({
        title: "Enqueue Failed",
        message: String(err),
        type: "error",
      });
    }
  };

  const handleQueuePasteNext = async () => {
    try {
      const next = await invokeIPC<string | null>("queue:dequeue");
      if (next) {
        await navigator.clipboard.writeText(next);
        const size = await invokeIPC<number>("queue:size");
        const peek = await invokeIPC<string | null>("queue:peek");
        setQueueSize(size);
        setQueuePeek(peek);
        addToast({
          title: "Queue Pasted",
          message: "Next item dequeued to clipboard",
          type: "success",
        });
      } else {
        addToast({ title: "Queue Empty", type: "info" });
      }
    } catch (err) {
      addToast({
        title: "Dequeue Failed",
        message: String(err),
        type: "error",
      });
    }
  };

  const handleQueueClear = async () => {
    try {
      await invokeIPC("queue:clear");
      setQueueSize(0);
      setQueuePeek(null);
      addToast({ title: "Queue Cleared", type: "info" });
    } catch (err) {
      addToast({ title: "Clear Failed", message: String(err), type: "error" });
    }
  };

  const handleRegexTest = () => {
    try {
      const text = store.outputText || store.inputText;
      const rx = new RegExp(regexPattern, regexFlags);
      const result = text.replace(rx, regexReplacement);
      setRegexPreview(result.slice(0, 200));
      setRegexError(null);
    } catch (e) {
      setRegexError(e instanceof Error ? e.message : String(e));
      setRegexPreview(null);
    }
  };

  const handleRegexApply = () => {
    try {
      const text = store.outputText || store.inputText;
      const rx = new RegExp(regexPattern, regexFlags);
      const result = text.replace(rx, regexReplacement);
      store.setResult({
        outputText: result,
        detectedType: store.detectedType ?? "plain_text",
        appliedTransforms: [...store.appliedTransforms, "Regex"],
      });
      setRegexPreview(null);
      setRegexError(null);
    } catch (e) {
      setRegexError(e instanceof Error ? e.message : String(e));
    }
  };

  // Macro Recorder handlers
  const startRecording = () => {
    setRecordedSteps([]);
    setIsRecording(true);
    addToast({
      title: "Recording started",
      message: "Apply transforms — they will be captured",
      type: "info",
      duration: 2500,
    });
  };

  const stopAndSaveMacro = () => {
    if (recordedSteps.length === 0) {
      addToast({ title: "No steps recorded", type: "warning" });
      setIsRecording(false);
      return;
    }
    const name = macroName.trim() || `Macro ${macros.length + 1}`;
    const next = [...macros, { name, steps: recordedSteps }];
    setMacros(next);
    localStorage.setItem("sph_macros", JSON.stringify(next));
    setIsRecording(false);
    setMacroName("");
    setRecordedSteps([]);
    addToast({
      title: `Macro "${name}" saved`,
      message: `${recordedSteps.length} step(s)`,
      type: "success",
    });
  };

  const deleteMacro = (index: number) => {
    const next = macros.filter((_, i) => i !== index);
    setMacros(next);
    localStorage.setItem("sph_macros", JSON.stringify(next));
  };

  const recordStep = React.useCallback(
    (step: string) => {
      if (isRecording) setRecordedSteps((prev) => [...prev, step]);
    },
    [isRecording],
  );

  const runMacro = async (macro: { name: string; steps: string[] }) => {
    const text = store.outputText || store.inputText;
    if (!text.trim()) {
      addToast({ title: "Nothing to apply macro to", type: "warning" });
      return;
    }
    let current = text;
    for (const step of macro.steps) {
      try {
        if (step.startsWith("ai:")) {
          const mode = step.slice(3);
          const res = await invokeIPC<{ rewritten: string; changed: boolean }>(
            "ai:rewrite",
            { text: current, mode },
          );
          if (res?.rewritten && res.changed) current = res.rewritten;
        } else if (step.startsWith("case:")) {
          const targetCase = step.slice(5);
          const res = await invokeIPC<{ result: string }>(
            "transform:case-convert",
            { text: current, targetCase },
          );
          if (res?.result) current = res.result;
        } else if (step.startsWith("translate:")) {
          const targetLang = step.slice(10);
          const res = await invokeIPC<{ result: string }>(
            "transform:translate",
            { text: current, targetLang },
          );
          if (res?.result) current = res.result;
        } else if (step === "Regex" || step === "redact") {
          // skip stateful steps
        }
      } catch {
        // skip failed step
      }
    }
    store.setResult({
      outputText: current,
      detectedType: store.detectedType ?? "plain_text",
      appliedTransforms: [...store.appliedTransforms, `macro:${macro.name}`],
    });
    addToast({ title: `Macro "${macro.name}" applied`, type: "success" });
  };

  // Diff Viewer helpers
  const computeDiff = React.useCallback((before: string, after: string) => {
    // Word-level diff: returns array of {text, type: 'same'|'add'|'remove'}
    const wordsA = before.split(/( |\n)/);
    const wordsB = after.split(/( |\n)/);
    const dp: number[][] = Array.from({ length: wordsA.length + 1 }, () =>
      new Array(wordsB.length + 1).fill(0),
    );
    for (let i = wordsA.length - 1; i >= 0; i--) {
      for (let j = wordsB.length - 1; j >= 0; j--) {
        if (wordsA[i] === wordsB[j]) dp[i]![j] = 1 + (dp[i + 1]?.[j + 1] ?? 0);
        else dp[i]![j] = Math.max(dp[i + 1]?.[j] ?? 0, dp[i]?.[j + 1] ?? 0);
      }
    }
    const result: { text: string; kind: "same" | "add" | "remove" }[] = [];
    let i = 0,
      j = 0;
    while (i < wordsA.length || j < wordsB.length) {
      if (i < wordsA.length && j < wordsB.length && wordsA[i] === wordsB[j]) {
        result.push({ text: wordsA[i] ?? "", kind: "same" });
        i++;
        j++;
      } else if (
        j < wordsB.length &&
        (i >= wordsA.length || (dp[i]?.[j + 1] ?? 0) >= (dp[i + 1]?.[j] ?? 0))
      ) {
        result.push({ text: wordsB[j] ?? "", kind: "add" });
        j++;
      } else {
        result.push({ text: wordsA[i] ?? "", kind: "remove" });
        i++;
      }
    }
    return result;
  }, []);

  const openDiff = () => {
    const before = store.inputText;
    const after = store.outputText;
    if (!before && !after) {
      addToast({
        title: "Nothing to diff",
        message: "Paste and process text first",
        type: "warning",
      });
      return;
    }
    setDiffBefore(before);
    setDiffAfter(after);
    setShowDiff(true);
  };
  const handleClean = async (text: string) => {
    try {
      store.setProcessing(true);
      // Auto-select pipeline preset based on detected content type — no manual input needed
      const autoPreset = getAutoPreset(store.detectedType ?? "plain_text");

      const response = await invokeIPC<ProcessClipboardResult>(
        "clipboard:paste",
        {
          preset: autoPreset,
          text,
        },
      );

      if (response.error) {
        throw new Error(String(response.error));
      }

      store.setResult({
        outputText: response.cleaned,
        detectedType: response.detectedType,
        appliedTransforms: response.changes || [],
      });
    } catch (err) {
      store.setError(
        err instanceof Error ? err.message : "Failed to process content",
      );
      addToast({
        title: "Processing Failed",
        message: err instanceof Error ? err.message : "Unknown error occurred",
        type: "error",
      });
    }
  };

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast({
        title: "Copied",
        message: "Result copied to clipboard",
        type: "success",
      });
    } catch {
      addToast({
        title: "Copy Failed",
        type: "error",
      });
    }
  };

  const handleGhostWrite = async () => {
    const text = (store.outputText || store.inputText).trim();
    if (!text) {
      addToast({
        title: "Nothing to ghost-write",
        message: "Generate or paste text first",
        type: "warning",
      });
      return;
    }

    try {
      const result = await invokeIPC<{
        ok: boolean;
        message: string;
        typedChars: number;
        truncated: boolean;
      }>("clipboard:ghost-write", { text });

      addToast({
        title: result.ok ? "Ghost Write started" : "Ghost Write failed",
        message: result.message,
        type: result.ok ? "success" : "error",
      });
    } catch (err) {
      addToast({
        title: "Ghost Write failed",
        message: err instanceof Error ? err.message : String(err),
        type: "error",
      });
    }
  };

  const enableInstantMode = async () => {
    try {
      const settings = await invokeIPC<AppSettings>("settings:get");
      const updated = await invokeIPC<AppSettings>("settings:update", {
        general: { ...settings.general, autoCleanOnCopy: true },
      });
      setAutoCleanEnabled(Boolean(updated.general.autoCleanOnCopy));
      addToast({
        title: "Instant mode enabled",
        message: "Auto-clean on copy is now active",
        type: "success",
      });
    } catch (err) {
      addToast({
        title: "Failed to enable instant mode",
        message: err instanceof Error ? err.message : "Unknown error",
        type: "error",
      });
    }
  };

  const runDemoCleanup = () => {
    const demoText =
      "Halo   tim,\n\n\nini   update\tterbaru dari meeting kemarin.\n\nMohon   dicek   ya.   Terima kasih.";
    store.setInput(demoText);
    void handleClean(demoText);
  };

  // ── Smart AI action handler — dispatches based on action string ───────────
  const handleSmartAction = async (action: string) => {
    switch (action) {
      case "fix_grammar":
      case "rephrase":
      case "formalize":
      case "summarize":
      case "bullet_list":
      case "numbered_list":
      case "to_table":
      case "join_lines":
        await handleAiRewrite(action as RewriteMode);
        break;
      case "translate":
        await handleTranslate();
        break;
      case "scrape_url":
        await handleTransform(
          "transform:scrape-url",
          "Scrape URL",
          store.outputText || store.inputText,
        );
        break;
      case "summarize_url":
        await handleSummarizeUrl();
        break;
      default:
        break;
    }
  };

  // Listen for background clean events triggered by global hotkey flow
  useEffect(() => {
    const unsub = onIPC("clipboard:cleaned", (payload: any) => {
      store.setInput(payload.original || "");
      store.setResult({
        outputText: payload.cleaned,
        detectedType: payload.type || "plain_text",
        appliedTransforms: [],
      });
    });
    return unsub;
  }, [store]);

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        {!autoCleanEnabled && (
          <div className={styles.activationBanner}>
            <div className={styles.activationText}>
              Instant benefit is currently off. Enable Auto-clean on copy to
              feel the app immediately when testing.
            </div>
            <button className={styles.demoChip} onClick={runDemoCleanup}>
              ⚡ Try demo
            </button>
            <Button size="sm" variant="primary" onClick={enableInstantMode}>
              Enable Instant Mode
            </Button>
          </div>
        )}

        <SmartPasteZone
          inputText={store.inputText}
          onInputChange={store.setInput}
          onClean={handleClean}
          isProcessing={store.isProcessing}
          detectedType={store.detectedType}
          pasteHotkeyHint={pasteHotkey}
        />
      </div>

      {store.hasResult && (
        <div className={styles.resultContainer}>
          {/* ── Smart AI Action Bar ─────────────────────────────────────────── */}
          {(() => {
            const smartActions = getSmartActions(
              store.detectedType ?? "plain_text",
              (store.outputText || store.inputText).length,
            );
            const primaryActions = smartActions.filter((a) => a.isPrimary);
            const secondaryActions = smartActions.filter((a) => !a.isPrimary);
            const hasAnyActions =
              smartActions.length > 0 || secondaryActions.length > 0;

            return (
              <div className={styles.aiActions}>
                <span className={styles.aiActionLabel}>AI</span>

                {/* Primary smart suggestions — shown immediately */}
                {primaryActions.length > 0 ? (
                  primaryActions.map(({ action, label, icon }) => (
                    <button
                      key={action}
                      className={`${styles.aiChip} ${styles.aiChipPrimary}`}
                      disabled={
                        isAiRewriting || isTranslating || isSummarizingUrl
                      }
                      onClick={() => void handleSmartAction(action)}
                    >
                      {icon}{" "}
                      {isAiRewriting || isTranslating || isSummarizingUrl
                        ? "Thinking…"
                        : label}
                    </button>
                  ))
                ) : (
                  <span className={styles.aiActionHint}>
                    {store.detectedType === "source_code" ||
                      store.detectedType === "json_data"
                      ? "Use Transform Lab ↓ for data operations"
                      : "Paste text to get AI suggestions"}
                  </span>
                )}

                {/* "More AI" expandable — secondary suggestions + all utility actions */}
                <button
                  className={styles.moreAiToggle}
                  onClick={() => setMoreAiOpen((v) => !v)}
                  aria-expanded={moreAiOpen}
                >
                  {moreAiOpen ? "▲ Less" : "▾ More AI"}
                </button>

                {moreAiOpen && (
                  <>
                    {/* Secondary context suggestions */}
                    {secondaryActions.map(({ action, label, icon }) => (
                      <button
                        key={action}
                        className={styles.aiChip}
                        disabled={
                          isAiRewriting || isTranslating || isSummarizingUrl
                        }
                        onClick={() => void handleSmartAction(action)}
                      >
                        {icon} {label}
                      </button>
                    ))}

                    {/* AI text transforms */}
                    <button
                      className={styles.aiChip}
                      disabled={isAiRewriting}
                      onClick={() => void handleAiRewrite("fix_grammar")}
                    >
                      ✅ Fix Grammar
                    </button>
                    <button
                      className={styles.aiChip}
                      disabled={isAiRewriting}
                      onClick={() => void handleAiRewrite("rephrase")}
                    >
                      🔄 Rephrase
                    </button>
                    <button
                      className={styles.aiChip}
                      disabled={isAiRewriting}
                      onClick={() => void handleAiRewrite("formalize")}
                    >
                      👔 Formalize
                    </button>
                    <button
                      className={styles.aiChip}
                      disabled={isAiRewriting}
                      onClick={() => void handleAiRewrite("summarize")}
                    >
                      📝 Summarize
                    </button>
                    <button
                      className={styles.aiChip}
                      disabled={isAiRewriting}
                      onClick={() => void handleAiRewrite("bullet_list")}
                    >
                      • Bullets
                    </button>
                    <button
                      className={styles.aiChip}
                      disabled={isAiRewriting}
                      onClick={() => void handleAiRewrite("numbered_list")}
                    >
                      1. Numbered
                    </button>
                    <button
                      className={styles.aiChip}
                      disabled={isAiRewriting}
                      onClick={() => void handleAiRewrite("to_table")}
                    >
                      ⊞ Table
                    </button>
                    <button
                      className={styles.aiChip}
                      disabled={isAiRewriting}
                      onClick={() => void handleAiRewrite("join_lines")}
                    >
                      ⊞ Join Lines
                    </button>

                    {/* Utility actions */}
                    <button
                      className={styles.aiChip}
                      disabled={isTranslating}
                      onClick={() => {
                        setTranslateLang((l) => (l === "en" ? "id" : "en"));
                        void handleTranslate();
                      }}
                    >
                      🌐{" "}
                      {isTranslating
                        ? "Translating…"
                        : `Translate → ${translateLang === "en" ? "ID" : "EN"}`}
                    </button>
                    <button
                      className={styles.aiChip}
                      disabled={isDetectingTone}
                      onClick={() => void handleDetectTone()}
                    >
                      🎭 {isDetectingTone ? "Analyzing…" : "Detect Tone"}
                    </button>
                    <button
                      className={styles.aiChip}
                      disabled={isRedacting}
                      onClick={() => void handleRedactPII()}
                    >
                      🔴 {isRedacting ? "Redacting…" : "Redact PII"}
                    </button>
                    <button
                      className={styles.aiChip}
                      onClick={() => void handleGhostWrite()}
                      disabled={!store.hasResult && !store.inputText.trim()}
                    >
                      ⌨️ Ghost Write
                    </button>

                    {/* Detected tone badge */}
                    {detectedTone && (
                      <span className={styles.toneBadge}>
                        {detectedTone}
                        <button
                          style={{
                            marginLeft: 6,
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            fontSize: "0.65rem",
                          }}
                          onClick={() => setDetectedTone(null)}
                        >
                          ✕
                        </button>
                      </span>
                    )}
                  </>
                )}
              </div>
            );
          })()}
          <ResultPanel
            result={{
              input: store.inputText,
              output: store.outputText,
              detectedType: store.detectedType!,
              transforms: getTransformLabels(store.appliedTransforms),
              timestamp: Date.now(),
            }}
            onCopy={handleCopy}
            onClear={store.reset}
          />

          {/* Phase 5 — Transform Lab */}
          <div className={styles.transformPanel}>
            <button
              className={styles.transformToggle}
              onClick={() => setShowTransform((v) => !v)}
            >
              {showTransform ? "▼" : "▶"} Transform Lab
            </button>
            {showTransform && (
              <>
                <div className={styles.transformGrid}>
                  <button
                    className={styles.transformBtn}
                    onClick={() =>
                      handleTransform(
                        "transform:math",
                        "Math",
                        store.outputText,
                      )
                    }
                  >
                    🔢 Math
                  </button>
                  <button
                    className={styles.transformBtn}
                    onClick={() =>
                      handleTransform(
                        "transform:color",
                        "Color",
                        store.outputText,
                      )
                    }
                  >
                    🎨 Color
                  </button>
                  <button
                    className={styles.transformBtn}
                    onClick={() =>
                      handleTransform(
                        "transform:open-links",
                        "Open Links",
                        store.outputText,
                      )
                    }
                  >
                    🔗 Open Links
                  </button>
                  <button
                    className={styles.transformBtn}
                    onClick={() =>
                      handleTransform(
                        "transform:scrape-url",
                        "Scrape URL",
                        store.outputText,
                      )
                    }
                  >
                    🌐 Scrape URL
                  </button>
                  <button
                    className={styles.transformBtn}
                    onClick={() =>
                      handleTransform(
                        "transform:extract-file",
                        "Extract File",
                        store.outputText,
                      )
                    }
                  >
                    📁 Extract File
                  </button>
                  <button
                    className={styles.transformBtn}
                    onClick={() =>
                      handleTransform(
                        "transform:make-secret",
                        "Make Secret",
                        store.outputText,
                      )
                    }
                  >
                    🔐 Make Secret
                  </button>
                </div>
                <button
                  className={styles.transformBtn}
                  onClick={() =>
                    handleTransform(
                      "transform:md-to-rtf",
                      "MD→Text",
                      store.outputText,
                    )
                  }
                >
                  📄 MD→Text
                </button>
                <div className={styles.transformFormatRow}>
                  <span className={styles.aiActionLabel}>Convert to</span>
                  <select
                    className={styles.transformSelect}
                    value={targetFormat}
                    onChange={(e) =>
                      setTargetFormat(e.target.value as TargetFormat)
                    }
                  >
                    <option value="json">JSON</option>
                    <option value="yaml">YAML</option>
                    <option value="toml">TOML</option>
                  </select>
                  <button
                    className={styles.transformBtn}
                    onClick={() =>
                      handleTransform(
                        "transform:convert-format",
                        `Convert→${targetFormat}`,
                        { text: store.outputText, targetFormat },
                      )
                    }
                  >
                    ⚡ Convert
                  </button>
                </div>
                {/* Case Converter */}
                <div className={styles.transformFormatRow}>
                  <span className={styles.aiActionLabel}>Case</span>
                  <select
                    className={styles.transformSelect}
                    value={selectedCase}
                    onChange={(e) =>
                      setSelectedCase(e.target.value as CaseType)
                    }
                  >
                    <option value="camelCase">camelCase</option>
                    <option value="PascalCase">PascalCase</option>
                    <option value="snake_case">snake_case</option>
                    <option value="kebab-case">kebab-case</option>
                    <option value="SCREAMING_SNAKE">SCREAMING_SNAKE</option>
                    <option value="Title Case">Title Case</option>
                    <option value="lowercase">lowercase</option>
                    <option value="UPPERCASE">UPPERCASE</option>
                  </select>
                  <button
                    className={styles.transformBtn}
                    onClick={() => void handleCaseConvert()}
                  >
                    Aa Convert
                  </button>
                </div>
              </>
            )}
          </div>
          {/* Regex Lab */}
          <button
            type="button"
            className={styles.transformToggle}
            onClick={() => setShowRegexLab((v) => !v)}
          >
            {showRegexLab ? "▲" : "▼"} Regex Lab
          </button>
          {showRegexLab && (
            <div className={styles.regexLab}>
              <div className={styles.regexLabRow}>
                <label>Pattern</label>
                <input
                  className={styles.regexInput}
                  value={regexPattern}
                  onChange={(e) => setRegexPattern(e.target.value)}
                  placeholder="e.g. \s+"
                  spellCheck={false}
                />
                <label>Flags</label>
                <input
                  className={styles.regexFlagsInput}
                  value={regexFlags}
                  onChange={(e) => setRegexFlags(e.target.value)}
                  placeholder="g"
                />
              </div>
              <div className={styles.regexLabRow}>
                <label>Replace</label>
                <input
                  className={styles.regexInput}
                  value={regexReplacement}
                  onChange={(e) => setRegexReplacement(e.target.value)}
                  placeholder="replacement (use $1, $2 for groups)"
                  spellCheck={false}
                />
                <button
                  type="button"
                  onClick={handleRegexTest}
                  className={styles.aiBtn}
                >
                  Test
                </button>
                <button
                  type="button"
                  onClick={handleRegexApply}
                  className={styles.aiBtn}
                  disabled={!regexPreview}
                >
                  Apply
                </button>
              </div>
              {regexError && (
                <div className={styles.regexError}>{regexError}</div>
              )}
              {regexPreview && (
                <div className={styles.regexPreview}>
                  <span>Preview:</span> {regexPreview}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Advanced Tools (collapsed by default) ────────────────────────── */}
      <div className={styles.criticalStrip}>
        <div className={styles.criticalLabel}>Quick Controls</div>
        <div className={styles.criticalActions}>
          <button
            className={`${styles.multiBtn} ${multiState.isCollecting ? styles.criticalActiveBtn : ""}`}
            onClick={
              multiState.isCollecting ? handleMultiClear : handleMultiStart
            }
          >
            {multiState.isCollecting
              ? `■ Stop Collect (${multiState.items.length})`
              : "▶ Start Collect"}
          </button>
          <button
            className={styles.multiBtn}
            onClick={handleMultiMerge}
            disabled={multiState.items.length === 0}
          >
            ⊕ Merge Multi
          </button>
          <button
            className={styles.multiBtn}
            onClick={handleQueuePasteNext}
            disabled={queueSize === 0}
          >
            ▶ Paste Next ({queueSize})
          </button>
          <button
            className={`${styles.multiBtn} ${isRecording ? styles.criticalActiveBtn : ""}`}
            onClick={isRecording ? stopAndSaveMacro : startRecording}
          >
            {isRecording ? "⏹ Save Macro" : "⏺ Record Macro"}
          </button>
        </div>
      </div>

      <div className={styles.advancedSection}>
        <button
          className={styles.advancedToggle}
          onClick={() => setShowAdvancedTools((v) => !v)}
          aria-expanded={showAdvancedTools}
        >
          <span>{showAdvancedTools ? "▼" : "▶"} Advanced Tools</span>
          <span className={styles.advancedHint}>
            Multi-Copy · Security · Paste Queue · Clipboard Stack · Macros ·
            Diff
          </span>
        </button>

        {showAdvancedTools && (
          <div className={styles.advancedBody}>
            {/* Phase 3 — Multi-Clipboard Panel */}
            <div className={styles.multiPanel}>
              <div className={styles.multiHeader}>
                <span className={styles.multiLabel}>Multi-Copy</span>
                <span
                  className={`${styles.multiStatus} ${multiState.isCollecting ? styles.multiCollecting : ""}`}
                >
                  {multiState.isCollecting
                    ? `● Collecting (${multiState.items.length})`
                    : `${multiState.items.length} items`}
                </span>
              </div>
              <div className={styles.multiActions}>
                <button
                  className={styles.multiBtn}
                  onClick={handleMultiStart}
                  disabled={multiState.isCollecting}
                >
                  {multiState.isCollecting ? "Collecting…" : "▶ Start"}
                </button>
                <button
                  className={styles.multiBtn}
                  onClick={handleMultiMerge}
                  disabled={multiState.items.length === 0}
                >
                  ⊕ Merge into Input
                </button>
                <button
                  className={styles.multiBtn}
                  onClick={handleMultiClear}
                  disabled={
                    multiState.items.length === 0 && !multiState.isCollecting
                  }
                >
                  ✕ Clear
                </button>
                {multiState.isCollecting && (
                  <div className={styles.multiAddRow}>
                    <input
                      className={styles.multiAddInput}
                      value={multiAddText}
                      onChange={(e) => setMultiAddText(e.target.value)}
                      placeholder="Type to add manually…"
                      onKeyDown={(e) =>
                        e.key === "Enter" && void handleMultiAdd()
                      }
                    />
                    <button
                      className={styles.multiBtn}
                      onClick={handleMultiAdd}
                      disabled={!multiAddText.trim()}
                    >
                      + Add
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Phase 7 — Security Inspector */}
            <div className={styles.securityPanel}>
              <div className={styles.securityHeader}>
                <span className={styles.securityLabel}>
                  🔒 Security Inspector
                </span>
                <div className={styles.securityBody}>
                  <button
                    className={styles.securityBtn}
                    onClick={handleSecurityScan}
                  >
                    Scan
                  </button>
                  {securityMatches.length > 0 && (
                    <>
                      <div className={styles.securityMatches}>
                        {securityMatches.map((m, i) => (
                          <span key={i} className={styles.securityBadge}>
                            {m.type}
                          </span>
                        ))}
                      </div>
                      <div className={styles.securityMaskRow}>
                        <select
                          className={styles.securitySelect}
                          value={maskMode}
                          onChange={(e) =>
                            setMaskMode(
                              e.target.value as "full" | "partial" | "skip",
                            )
                          }
                        >
                          <option value="full">Full mask</option>
                          <option value="partial">Partial mask</option>
                          <option value="skip">Skip</option>
                        </select>
                        <button
                          className={styles.securityBtn}
                          onClick={handleApplyMask}
                        >
                          Apply Mask
                        </button>
                      </div>
                    </>
                  )}
                  {securityMatches.length === 0 && showSecurity && (
                    <span
                      style={{
                        fontSize: "var(--text-xs)",
                        color: "var(--accent-success)",
                      }}
                    >
                      ✅ Clean
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Paste Queue Panel */}
            <div className={styles.multiPanel}>
              <div className={styles.multiHeader}>
                <span className={styles.multiLabel}>📎 Paste Queue</span>
                <span className={styles.multiStatus}>
                  {queueSize} item{queueSize !== 1 ? "s" : ""}
                  {queuePeek && (
                    <span
                      style={{ opacity: 0.6, marginLeft: 6, fontWeight: 400 }}
                    >
                      Next: {queuePeek.slice(0, 28)}
                      {queuePeek.length > 28 ? "…" : ""}
                    </span>
                  )}
                </span>
              </div>
              <div className={styles.multiActions}>
                <button
                  className={styles.multiBtn}
                  onClick={handleQueuePasteNext}
                  disabled={queueSize === 0}
                >
                  ▶ Paste Next
                </button>
                <button
                  className={styles.multiBtn}
                  onClick={handleQueueClear}
                  disabled={queueSize === 0}
                >
                  ✕ Clear Queue
                </button>
                <div className={styles.multiAddRow}>
                  <input
                    className={styles.multiAddInput}
                    value={queueEnqueueText}
                    onChange={(e) => setQueueEnqueueText(e.target.value)}
                    placeholder={
                      store.outputText.trim()
                        ? "(uses result)"
                        : "Type to enqueue…"
                    }
                    onKeyDown={(e) =>
                      e.key === "Enter" && void handleQueueEnqueue()
                    }
                  />
                  <button
                    className={styles.multiBtn}
                    onClick={handleQueueEnqueue}
                  >
                    + Enqueue
                  </button>
                </div>
              </div>
            </div>

            {/* Clipboard Stack (Ring Buffer) */}
            <div className={styles.ringPanel}>
              <div className={styles.multiHeader}>
                <span className={styles.multiLabel}>📋 Clipboard Stack</span>
                <span className={styles.multiStatus}>
                  {ringItems.length} recent
                </span>
              </div>
              {ringItems.length > 0 && (
                <div className={styles.ringChips}>
                  {ringItems.slice(0, 5).map((item) => (
                    <button
                      key={item.id}
                      className={styles.ringChip}
                      onClick={async () => {
                        await invokeIPC("ring:select", { id: item.id });
                        store.setInput(item.content);
                        addToast({
                          title: "Loaded from stack",
                          type: "success",
                          duration: 1500,
                        });
                      }}
                      title={item.content}
                    >
                      {item.content.slice(0, 32)}
                      {item.content.length > 32 ? "…" : ""}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* ── Macro Recorder ── */}
            <div className={styles.macroPanel}>
              <div className={styles.multiHeader}>
                <span className={styles.multiLabel}>🎬 Macro Recorder</span>
                <button
                  className={styles.multiBtn}
                  onClick={() => setShowMacroPanel((v) => !v)}
                >
                  {showMacroPanel ? "Hide" : "Show"}
                </button>
              </div>
              {showMacroPanel && (
                <div className={styles.macroBody}>
                  <div className={styles.macroRecordRow}>
                    {isRecording ? (
                      <>
                        <span className={styles.macroRecordingBadge}>
                          ● REC
                        </span>
                        <span className={styles.macroStepCount}>
                          {recordedSteps.length} step(s)
                        </span>
                        <input
                          className={styles.macroNameInput}
                          placeholder="Macro name…"
                          value={macroName}
                          onChange={(e) => setMacroName(e.target.value)}
                        />
                        <button
                          className={styles.multiBtn}
                          onClick={stopAndSaveMacro}
                        >
                          ⏹ Save
                        </button>
                        <button
                          className={styles.multiBtn}
                          onClick={() => {
                            setIsRecording(false);
                            setRecordedSteps([]);
                          }}
                        >
                          ✕ Cancel
                        </button>
                      </>
                    ) : (
                      <button
                        className={styles.multiBtn}
                        onClick={startRecording}
                      >
                        ⏺ Record New Macro
                      </button>
                    )}
                  </div>
                  {macros.length > 0 && (
                    <div className={styles.macroList}>
                      {macros.map((m, idx) => (
                        <div key={idx} className={styles.macroItem}>
                          <span className={styles.macroItemName}>{m.name}</span>
                          <span className={styles.macroItemSteps}>
                            {m.steps.length} steps: {m.steps.join(" → ")}
                          </span>
                          <div className={styles.macroItemActions}>
                            <button
                              className={styles.multiBtn}
                              onClick={() => void runMacro(m)}
                            >
                              ▶ Run
                            </button>
                            <button
                              className={styles.multiBtn}
                              onClick={() => deleteMacro(idx)}
                            >
                              🗑
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {macros.length === 0 && !isRecording && (
                    <p className={styles.macroEmpty}>
                      No macros yet. Hit ⏺ to record a sequence of transforms.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* ── Diff Viewer ── */}
            <div className={styles.diffPanel}>
              <div className={styles.multiHeader}>
                <span className={styles.multiLabel}>🔍 Diff Viewer</span>
                <button className={styles.multiBtn} onClick={openDiff}>
                  Open Diff
                </button>
                {showDiff && (
                  <button
                    className={styles.multiBtn}
                    onClick={() => setShowDiff(false)}
                  >
                    ✕ Close
                  </button>
                )}
              </div>
              {showDiff && (
                <div className={styles.diffBody}>
                  <div className={styles.diffLegend}>
                    <span className={styles.diffAdd}>+ added</span>
                    <span className={styles.diffRemove}>- removed</span>
                    <span className={styles.diffSame}>unchanged</span>
                  </div>
                  <div className={styles.diffContent}>
                    {computeDiff(diffBefore, diffAfter).map((token, i) => (
                      <span
                        key={i}
                        className={
                          token.kind === "add"
                            ? styles.diffAdd
                            : token.kind === "remove"
                              ? styles.diffRemove
                              : styles.diffSame
                        }
                      >
                        {token.text}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Hotkey Guide — always visible at the bottom */}
      <div className={styles.hotkeyBar}>
        {[{ keys: pasteHotkey, desc: "Smart Paste" }, ...HOTKEYS].map(
          ({ keys, desc }) => (
            <div key={keys} className={styles.hotkeyItem}>
              <kbd className={styles.kbd}>{keys}</kbd>
              <span className={styles.hotkeyDesc}>{desc}</span>
            </div>
          ),
        )}
      </div>

      {/* Snippet Trigger Popup — fixed floating */}
      {snippetPopup && (
        <div className={styles.snippetPopup}>
          <span className={styles.snippetPopupName}>
            📎 {snippetPopup.name}
          </span>
          <span className={styles.snippetPopupPreview}>
            {snippetPopup.content.slice(0, 60)}
            {snippetPopup.content.length > 60 ? "…" : ""}
          </span>
          <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
            <button
              className={styles.multiBtn}
              onClick={() => {
                store.setInput(snippetPopup.content);
                setSnippetPopup(null);
              }}
            >
              ✓ Use
            </button>
            <button
              className={styles.multiBtn}
              onClick={() => setSnippetPopup(null)}
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
