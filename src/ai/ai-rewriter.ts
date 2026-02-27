export type RewriteMode =
  | "fix_grammar"
  | "rephrase"
  | "summarize"
  | "formalize"
  | "translate"
  | "bullet_list"
  | "numbered_list"
  | "to_table"
  | "join_lines"
  | "detect_tone";

export interface RewriteOptions {
  mode: RewriteMode;
  language: "id" | "en";
  provider: "local" | "openai" | "gemini" | "anthropic" | "deepseek" | "xai" | "custom";
  apiKey?: string;
  baseUrl?: string;
  model?: string;
  translateTarget?: "id" | "en";
}

const SYSTEM_PROMPTS: Record<RewriteMode, string> = {
  fix_grammar:
    "Fix any grammar or spelling mistakes in the following text, keeping the original meaning.",
  rephrase: "Rephrase the following text to flow better and sound natural.",
  summarize: "Summarize the following text concisely.",
  formalize: "Rewrite the following text in a professional, formal tone.",
  translate: "Translate the following text. Respond ONLY with the translation, no explanation.",
  bullet_list: "Convert the following text into a bullet-point list using • as prefix. Output ONLY the list.",
  numbered_list: "Convert the following text into a numbered list. Output ONLY the list.",
  to_table: "Convert the following text into a markdown table. Output ONLY the table.",
  join_lines: "Join all lines into a single flowing paragraph, removing unnecessary line breaks. Output ONLY the paragraph.",
  detect_tone: "Classify the tone of this text in one word (formal/informal/aggressive/friendly/neutral/professional). Then in one sentence explain why. Format exactly as: TONE: <word>\nWHY: <sentence>",
};

function langInstruction(language: "id" | "en"): string {
  return language === "id" ? " Respond in Indonesian." : " Respond in English.";
}

export async function rewriteText(
  text: string,
  options: RewriteOptions,
): Promise<string> {
  // Build system prompt — translate mode uses target language directly
  let systemPrompt = SYSTEM_PROMPTS[options.mode];
  if (options.mode === "translate" && options.translateTarget) {
    const lang = options.translateTarget === "id" ? "Indonesian" : "English";
    systemPrompt = `Translate the following text to ${lang}. Respond ONLY with the translation, no explanation.`;
  } else if (options.mode !== "bullet_list" && options.mode !== "numbered_list" &&
             options.mode !== "to_table" && options.mode !== "join_lines" &&
             options.mode !== "detect_tone") {
    systemPrompt += langInstruction(options.language);
  }
  // ── OpenAI-compatible (openai + deepseek + xai + custom) ───────────────────
  if (
    (options.provider === "openai" ||
      options.provider === "deepseek" ||
      options.provider === "xai" ||
      options.provider === "custom") &&
    options.apiKey
  ) {
    try {
      const defaultBase =
        options.provider === "deepseek"
          ? "https://api.deepseek.com/v1"
          : options.provider === "xai"
          ? "https://api.x.ai/v1"
          : "https://api.openai.com/v1";
      const baseUrl = options.baseUrl?.trim()
        ? options.baseUrl.replace(/\/$/, "")
        : defaultBase;

      const model =
        options.model?.trim() ||
        (options.provider === "deepseek"
          ? "deepseek-chat"
          : options.provider === "xai"
          ? "grok-3-mini"
          : "gpt-4o-mini");

      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${options.apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: text },
          ],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(
          `AI API error: ${response.status} ${response.statusText}${body ? ` — ${body}` : ""}`,
        );
      }

      const contentType = response.headers.get("content-type") ?? "";
      if (!contentType.includes("application/json") && !contentType.includes("text/plain")) {
        const preview = await response.text().catch(() => "");
        throw new Error(
          `AI API returned non-JSON response (${contentType || "unknown content-type"}) — ` +
          `check your Base URL setting. Preview: ${preview.slice(0, 120)}`,
        );
      }

      const data = await response.json();
      if (!data?.choices?.[0]?.message?.content) {
        throw new Error(`AI API returned unexpected response shape: ${JSON.stringify(data).slice(0, 200)}`);
      }
      return (data.choices[0].message.content as string) ?? text;
    } catch (e) {
      console.error("OpenAI/Custom Rewrite failed:", e);
      throw e;
    }
  }

  // ── Google Gemini ──────────────────────────────────────────────────────────
  if (options.provider === "gemini" && options.apiKey) {
    try {
      const model = options.model?.trim() || "gemini-2.5-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${options.apiKey}`;

      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: systemPrompt }] },
          contents: [{ parts: [{ text }] }],
          generationConfig: { temperature: 0.7 },
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(
          `Gemini API error: ${response.status} ${response.statusText}${body ? ` — ${body}` : ""}`,
        );
      }

      const ct1 = response.headers.get("content-type") ?? "";
      if (!ct1.includes("application/json") && !ct1.includes("text/plain")) {
        const preview = await response.text().catch(() => "");
        throw new Error(
          `Gemini API returned non-JSON response (${ct1 || "unknown content-type"}) — ` +
          `check your API key and model. Preview: ${preview.slice(0, 120)}`,
        );
      }
      const data = await response.json();
      const content = data?.candidates?.[0]?.content?.parts?.[0]?.text as
        | string
        | undefined;
      if (!content) throw new Error("Gemini returned empty response");
      return content;
    } catch (e) {
      console.error("Gemini Rewrite failed:", e);
      throw e;
    }
  }

  // ── Anthropic Claude ───────────────────────────────────────────────────────
  if (options.provider === "anthropic" && options.apiKey) {
    try {
      const baseUrl = options.baseUrl?.trim()
        ? options.baseUrl.replace(/\/$/, "")
        : "https://api.anthropic.com/v1";

      const model = options.model?.trim() || "claude-3-5-haiku-20241022";

      const response = await fetch(`${baseUrl}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": options.apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model,
          max_tokens: 4096,
          system: systemPrompt,
          messages: [{ role: "user", content: text }],
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(
          `Anthropic API error: ${response.status} ${response.statusText}${body ? ` — ${body}` : ""}`,
        );
      }

      const ct2 = response.headers.get("content-type") ?? "";
      if (!ct2.includes("application/json") && !ct2.includes("text/plain")) {
        const preview = await response.text().catch(() => "");
        throw new Error(
          `Anthropic API returned non-JSON response (${ct2 || "unknown content-type"}) — ` +
          `check your Base URL setting. Preview: ${preview.slice(0, 120)}`,
        );
      }
      const data = await response.json();
      const content = data?.content?.[0]?.text as string | undefined;
      if (!content) throw new Error("Anthropic returned empty response");
      return content;
    } catch (e) {
      console.error("Anthropic Rewrite failed:", e);
      throw e;
    }
  }

  // Fallback — local / no API key
  return text;
}
