import { ToastData } from "../../hooks/useToastData";
import { isIPCResponseEnvelope } from "../../../shared/ipc-response";

type ToastBridge = {
  invoke?: (channel: string, payload?: unknown) => Promise<unknown>;
  send?: (channel: string, payload?: unknown) => void;
};

function getToastBridge(): ToastBridge {
  const w = window as unknown as {
    floatingAPI?: ToastBridge;
    smartpaste?: ToastBridge;
  };
  return w.floatingAPI ?? w.smartpaste ?? {};
}

export async function runToastAction(
  action: string,
  data: ToastData,
  setData: (data: ToastData) => void,
  setIsAiLoading: (loading: boolean) => void,
  setCopied: (copied: boolean) => void,
  scheduleClose: (delay: number) => void,
  clearDismissTimers: () => void,
) {
  let newText = data.cleaned;
  const original = data.original;

  const api = getToastBridge();
  const invoke = async <T>(
    channel: string,
    payload?: unknown,
  ): Promise<T | undefined> => {
    if (!api.invoke) {
      return undefined;
    }
    const response = await api.invoke(channel, payload);
    if (isIPCResponseEnvelope<T>(response)) {
      if (!response.ok) {
        throw new Error(response.error.message);
      }
      return response.data;
    }
    return response as T;
  };

  if (["summarize", "fix_grammar", "rephrase", "formalize"].includes(action)) {
    clearDismissTimers();
    setIsAiLoading(true);
    try {
      const res = await invoke<{ rewritten?: string }>("ai:rewrite", {
        text: data.cleaned,
        mode: action,
      });

      if (res?.rewritten) {
        newText = res.rewritten;
        setData({ ...data, cleaned: newText });
      }
    } catch (err) {
      console.error("AI Summarize failed", err);
    }
    setIsAiLoading(false);
  } else if (action === "save_snippet") {
    try {
      await invoke("snippet:create", {
        name: `Quick Save ${new Date().toLocaleTimeString()}`,
        content: data.original,
        category: "quick-save",
        tags: [data.type],
      });
      setData({ ...data, cleaned: "Saved as Snippet." });
    } catch (err) {
      console.error("Save snippet failed", err);
      setData({ ...data, cleaned: "Failed to save snippet." });
    }
    setCopied(true);
    scheduleClose(1500);
    return;
  } else if (action === "convert_csv") {
    // Best-effort HTML table → CSV using regex (no new package)
    try {
      const rows = original.match(/<tr[^>]*>([\s\S]*?)<\/tr>/gi) ?? [];
      const csv = rows
        .map((row) => {
          const cells = row.match(/<t[dh][^>]*>([\s\S]*?)<\/t[dh]>/gi) ?? [];
          return cells
            .map((cell) => JSON.stringify(cell.replace(/<[^>]+>/g, "").trim()))
            .join(",");
        })
        .join("\n");
      newText = csv || original;
      setData({ ...data, cleaned: newText, type: "csv_table" });
    } catch (err) {
      console.error("CSV conversion failed", err);
    }
  } else if (
    action === "convert_yaml" ||
    action === "convert_json" ||
    action === "convert_toml"
  ) {
    const targetFormat = action.replace("convert_", "");
    try {
      const res = await invoke<{ result?: string }>(
        "transform:convert-format",
        {
          text: data.original,
          targetFormat,
        },
      );
      if (res?.result) {
        newText = res.result;
        setData({ ...data, cleaned: newText, type: `${targetFormat}_data` });
      }
    } catch (err) {
      console.error("Format conversion failed", err);
    }
  } else if (action === "calculate") {
    try {
      const res = await invoke<{ result?: string }>("transform:math", original);
      if (res?.result) {
        newText = res.result;
        setData({ ...data, cleaned: newText });
      }
    } catch (err) {
      console.error(err);
    }
  } else if (action === "convert_color") {
    try {
      const res = await invoke<{ result?: string }>(
        "transform:color",
        original,
      );
      if (res?.result) {
        newText = res.result;
        setData({ ...data, cleaned: newText });
      }
    } catch (err) {
      console.error(err);
    }
  } else if (action === "convert_md") {
    try {
      const res = await invoke<{ result?: string }>(
        "transform:md-to-rtf",
        original,
      );
      if (res?.result) {
        newText = "Markdown Converted to Rich Text! Ready to paste.";
        setData({ ...data, cleaned: newText, type: "rich_text" });
        setCopied(true);
      }
    } catch (err) {
      console.error(err);
    }
  } else if (action === "open_links") {
    try {
      const res = await invoke<{ result?: string }>(
        "transform:open-links",
        original,
      );
      if (res?.result) {
        newText = res.result;
        setData({ ...data, cleaned: newText });
      }
    } catch (err) {
      console.error(err);
    }
  } else if (action === "extract_file") {
    try {
      const res = await invoke<{ result?: string | null }>(
        "transform:extract-file",
        original,
      );
      if (res?.result) {
        newText = res.result;
        setData({ ...data, cleaned: newText, type: "source_code" });
      } else {
        setData({
          ...data,
          cleaned: "Error: Cannot read file or file too large.",
        });
        return;
      }
    } catch (err) {
      console.error(err);
    }
  } else if (action === "scrape_url") {
    setIsAiLoading(true);
    clearDismissTimers();
    try {
      const res = await invoke<{ result?: string }>(
        "transform:scrape-url",
        original,
      );
      if (res?.result) {
        newText = res.result;
        setData({ ...data, cleaned: newText, type: "markdown" });
      } else {
        setData({
          ...data,
          cleaned: "Error: Could not extract article from URL.",
        });
        setIsAiLoading(false);
        return;
      }
    } catch (err) {
      console.error(err);
    }
    setIsAiLoading(false);
  } else if (action === "make_secret") {
    setIsAiLoading(true);
    clearDismissTimers();
    try {
      const res = await invoke<{ result?: string }>(
        "transform:make-secret",
        original,
      );
      if (res?.result) {
        newText = res.result;
        setData({ ...data, cleaned: newText, type: "secret_link" });
      } else {
        setData({ ...data, cleaned: "Error: Failed to create secret link." });
        setIsAiLoading(false);
        return;
      }
    } catch (err) {
      console.error(err);
    }
    setIsAiLoading(false);
  } else if (action === "dismiss") {
    // Dismiss: immediately close the HUD without clipboard changes
    if (data.type === "paste_preview") {
      await invoke("automation:cancel-preview");
    }
    scheduleClose(0);
    return;
  } else if (action === "confirm_preview") {
    await invoke("automation:confirm-preview");
    scheduleClose(0);
    return;
  } else if (action === "cancel_preview") {
    await invoke("automation:cancel-preview");
    scheduleClose(0);
    return;
  } else if (action.startsWith("palette_select:")) {
    const presetId = action.slice("palette_select:".length);
    await invoke("automation:set-active-preset", {
      presetId,
      appName: data.sourceApp,
    });
    setData({
      ...data,
      cleaned: `Preset selected: ${presetId}`,
      paletteSelected: presetId,
    });
    scheduleClose(900);
    return;
  } else if (action === "feedback_good") {
    if (data.strategyIntent && data.contentType && data.sourceApp) {
      await invoke("automation:paste-feedback", {
        appName: data.sourceApp,
        contentType: data.contentType,
        expectedIntent: data.strategyIntent,
        weight: 2,
      });
      setData({
        ...data,
        cleaned:
          "👍 Feedback saved. Strategy reinforced for next similar paste.",
      });
      scheduleClose(1200);
      return;
    }
  } else if (action.startsWith("feedback_learn:")) {
    const expectedIntent = action.slice("feedback_learn:".length);
    if (
      (expectedIntent === "plain_text" || expectedIntent === "rich_text") &&
      data.contentType &&
      data.sourceApp
    ) {
      await invoke("automation:paste-feedback", {
        appName: data.sourceApp,
        contentType: data.contentType,
        expectedIntent,
        weight: 3,
      });
      setData({
        ...data,
        cleaned: "🧠 Learned for next paste. Current paste left unchanged.",
      });
      scheduleClose(1300);
      return;
    }
  } else if (action.startsWith("feedback_fix_now:")) {
    const expectedIntent = action.slice("feedback_fix_now:".length);
    if (expectedIntent === "plain_text" || expectedIntent === "rich_text") {
      const res = await invoke<{
        appliedNow: boolean;
        expectedIntent: "plain_text" | "rich_text";
      }>("automation:feedback-action", {
        expectedIntent,
        applyNow: true,
        weight: 3,
      });
      setData({
        ...data,
        cleaned: res?.appliedNow
          ? "🛠 Fixed now and reapplied. Learned for future pastes."
          : "🧠 Learned for future pastes.",
      });
      scheduleClose(1400);
      return;
    }
  } else if (action === "copy") {
    // Copy: write cleaned text as-is (no transform)
    newText = data.cleaned;
  } else if (action === "undo") {
    // Undo: restore original (pre-clean) text to clipboard
    newText = data.original;
    setData({ ...data, cleaned: newText });
  } else if (action === "UPPERCASE") {
    newText = data.cleaned.toUpperCase();
  } else if (action === "lowercase") {
    newText = data.cleaned.toLowerCase();
  } else if (action === "invert") {
    newText = data.cleaned
      .split("")
      .map((char) => {
        if (char === char.toUpperCase()) return char.toLowerCase();
        if (char === char.toLowerCase()) return char.toUpperCase();
        return char;
      })
      .join("");
  }

  // Force write directly to clipboard
  await invoke("clipboard:write", { text: newText });
  setCopied(true);
  scheduleClose(1000);
}
