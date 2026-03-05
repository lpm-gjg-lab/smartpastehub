import { rewriteText, RewriteOptions } from "../../ai/ai-rewriter";
import { SafeHandle } from "./contracts";
import { getSettings } from "../settings-store";
import { IpcDependencies } from "./contracts";
import {
  recordAiUsage,
  getAiUsageSummary,
  clearAiUsage,
} from "../ai-usage-store";
import { validateFetchUrl } from "../utils/url-validator";

/** fetch with a 10 s hard timeout */
async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  validateFetchUrl(url);
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

    if (!resolvedOptions.baseUrl) resolvedOptions.baseUrl = aiSettings.baseUrl;
    if (!resolvedOptions.model) resolvedOptions.model = aiSettings.model;
    if (!resolvedOptions.apiKey) resolvedOptions.apiKey = aiSettings.apiKey;

    const result = await rewriteText(text, resolvedOptions);
    deps?.usageStatsRepo.incrementDaily({ aiRewrites: 1 });

    void recordAiUsage({
      provider: resolvedOptions.provider,
      model: resolvedOptions.model ?? aiSettings.model ?? "unknown",
      mode: resolvedOptions.mode,
      promptTokens: result.usage.promptTokens,
      completionTokens: result.usage.completionTokens,
      totalTokens: result.usage.totalTokens,
    });

    return {
      rewritten: result.text,
      mode: resolvedOptions.mode,
      changed: result.text !== text,
      usage: result.usage,
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

    // Short-circuit when no AI provider is configured
    if (!ai.apiKey?.trim() || (ai.provider ?? "local") === "local") {
      return {
        tone: "unavailable",
        suggestion: "Configure an AI provider in Settings to detect tone.",
      };
    }

    const result = await rewriteText(text, {
      mode: "detect_tone",
      language: (settings.general?.language as "id" | "en") ?? "en",
      provider: ai.provider as RewriteOptions["provider"],
      apiKey: ai.apiKey,
      baseUrl: ai.baseUrl,
      model: ai.model,
    });
    const raw = result.text;
    const toneMatch = raw.match(/TONE:\s*(\S+)/i);
    const whyMatch = raw.match(/WHY:\s*(.+)/i);
    return {
      tone: toneMatch?.[1] ?? "unknown",
      suggestion: whyMatch?.[1] ?? raw,
    };
  });

  safeHandle("ai:summarize-url", async (_, payload) => {
    const { url } = payload as { url: string };
    validateFetchUrl(url);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15_000);
    let markdown = url;
    try {
      const res = await fetch(url, { signal: controller.signal });
      if (res.ok) {
        const html = await res.text();
        markdown = html
          .replace(/<[^>]+>/g, " ")
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 4000);
      }
    } finally {
      clearTimeout(timer);
    }
    const settings = await getSettings();
    const ai = settings.ai;
    const result = await rewriteText(markdown, {
      mode: "summarize",
      language: (settings.general?.language as "id" | "en") ?? "id",
      provider: (ai.provider ?? "local") as RewriteOptions["provider"],
      apiKey: ai.apiKey,
      baseUrl: ai.baseUrl,
      model: ai.model,
    });
    return { summary: result.text };
  });

  // ── AI Usage Stats ───────────────────────────────────────────────────────
  safeHandle("ai:usage-stats", async () => {
    return getAiUsageSummary();
  });

  safeHandle("ai:clear-usage", async () => {
    await clearAiUsage();
    return { ok: true };
  });
}
