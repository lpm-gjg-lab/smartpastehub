import { rewriteText, RewriteOptions } from "../../ai/ai-rewriter";
import { SafeHandle } from "./contracts";
import { getSettings } from "../settings-store";
import { IpcDependencies } from "./contracts";

/** fetch with a 10 s hard timeout */
async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

async function testAiConnection(
  provider: string,
  apiKey: string,
  baseUrl: string,
  model: string,
): Promise<{ ok: boolean; message: string }> {
  if (!apiKey.trim()) {
    return { ok: false, message: "API key is empty" };
  }

  // ── Google Gemini ──────────────────────────────────────────────────────────
  if (provider === "gemini") {
    const m = model.trim() || "gemini-2.5-flash";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${m}:generateContent?key=${apiKey}`;
    const res = await fetchWithTimeout(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents: [{ parts: [{ text: "ping" }] }] }),
    });
    if (res.ok) return { ok: true, message: `Connected (${m})` };
    const body = await res.text().catch(() => "");
    let hint = "";
    try {
      const parsed = JSON.parse(body) as { error?: { message?: string } };
      hint = parsed.error?.message ?? "";
    } catch (e) {
      void e;
    }
    return { ok: false, message: hint || `Error ${res.status}` };
  }

  // ── Anthropic Claude ───────────────────────────────────────────────────────
  if (provider === "anthropic") {
    const base = baseUrl.trim()
      ? baseUrl.replace(/\/$/, "")
      : "https://api.anthropic.com/v1";
    const m = model.trim() || "claude-3-5-haiku-20241022";
    const res = await fetchWithTimeout(`${base}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: m,
        max_tokens: 1,
        messages: [{ role: "user", content: "ping" }],
      }),
    });
    if (res.ok) return { ok: true, message: `Connected (${m})` };
    const body = await res.text().catch(() => "");
    let hint = "";
    try {
      const parsed = JSON.parse(body) as { error?: { message?: string } };
      hint = parsed.error?.message ?? "";
    } catch (e) {
      void e;
    }
    return { ok: false, message: hint || `Error ${res.status}` };
  }

  // ── OpenAI-compatible (openai + deepseek + xai + custom) ────────────────
  const defaultBase =
    provider === "deepseek"
      ? "https://api.deepseek.com/v1"
      : provider === "xai"
      ? "https://api.x.ai/v1"
      : "https://api.openai.com/v1";
  const base = baseUrl.trim() ? baseUrl.replace(/\/$/, "") : defaultBase;
  const m =
    model.trim() ||
    (provider === "deepseek"
      ? "deepseek-chat"
      : provider === "xai"
      ? "grok-3-mini"
      : "gpt-4o-mini");
  const res = await fetchWithTimeout(`${base}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: m,
      messages: [{ role: "user", content: "ping" }],
      max_tokens: 1,
    }),
  });
  if (res.ok) return { ok: true, message: `Connected (${m})` };
  const body = await res.text().catch(() => "");
  let hint = "";
  try {
    const parsed = JSON.parse(body) as { error?: { message?: string } };
    hint = parsed.error?.message ?? "";
  } catch (e) {
    void e;
  }
  return { ok: false, message: hint || `Error ${res.status}` };
}

export function registerAiIpc(
  safeHandle: SafeHandle,
  deps?: Pick<IpcDependencies, "usageStatsRepo">,
): void {
  safeHandle("ai:rewrite", async (_, payload) => {
    const { text, options, mode } = payload as {
      text: string;
      options?: RewriteOptions;
      mode?: RewriteOptions["mode"];
    };

    // Read stored settings to get baseUrl, model, apiKey
    const settings = await getSettings();
    const aiSettings = settings.ai;

    const resolvedOptions: RewriteOptions = options ?? {
      mode: mode ?? "summarize",
      language: (settings.general?.language as "id" | "en") ?? "id",
      provider: (aiSettings.provider ?? "local") as RewriteOptions["provider"],
      apiKey: aiSettings.apiKey,
      baseUrl: aiSettings.baseUrl,
      model: aiSettings.model,
    };

    // Always merge stored baseUrl/model/apiKey if not explicitly overridden
    if (!resolvedOptions.baseUrl) resolvedOptions.baseUrl = aiSettings.baseUrl;
    if (!resolvedOptions.model) resolvedOptions.model = aiSettings.model;
    if (!resolvedOptions.apiKey) resolvedOptions.apiKey = aiSettings.apiKey;

    const rewritten = await rewriteText(text, resolvedOptions);
    deps?.usageStatsRepo.incrementDaily({ aiRewrites: 1 });
    return {
      rewritten,
      mode: resolvedOptions.mode,
      changed: rewritten !== text,
    };
  });

  safeHandle("ai:test-connection", async () => {
    const settings = await getSettings();
    const { provider, apiKey, baseUrl, model } = settings.ai;
    if (provider === "local")
      return { ok: false, message: "Provider is set to local (no AI)" };
    return testAiConnection(provider, apiKey ?? "", baseUrl ?? "", model ?? "");
  });

  safeHandle("ai:detect-tone", async (_, payload) => {
    const { text } = payload as { text: string };
    const settings = await getSettings();
    const ai = settings.ai;
    const raw = await rewriteText(text, {
      mode: "detect_tone",
      language: (settings.general?.language as "id" | "en") ?? "en",
      provider: (ai.provider ?? "local") as RewriteOptions["provider"],
      apiKey: ai.apiKey,
      baseUrl: ai.baseUrl,
      model: ai.model,
    });
    const toneMatch = raw.match(/TONE:\s*(\S+)/i);
    const whyMatch = raw.match(/WHY:\s*(.+)/i);
    return {
      tone: toneMatch?.[1] ?? "unknown",
      suggestion: whyMatch?.[1] ?? raw,
    };
  });

  safeHandle("ai:summarize-url", async (_, payload) => {
    const { url } = payload as { url: string };
    // Fetch URL content then summarize via AI
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    let markdown = url;
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (res.ok) {
        const html = await res.text();
        // Simple HTML-to-text strip
        markdown = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 4000);
      }
    } finally {
      clearTimeout(timer);
    }
    const settings = await getSettings();
    const ai = settings.ai;
    const summary = await rewriteText(markdown, {
      mode: "summarize",
      language: (settings.general?.language as "id" | "en") ?? "id",
      provider: (ai.provider ?? "local") as RewriteOptions["provider"],
      apiKey: ai.apiKey,
      baseUrl: ai.baseUrl,
      model: ai.model,
    });
    return { summary };
  });
}
