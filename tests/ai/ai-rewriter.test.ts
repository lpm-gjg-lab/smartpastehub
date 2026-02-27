import { beforeEach, describe, expect, it, vi } from "vitest";
import { rewriteText } from "../../src/ai/ai-rewriter";

describe("ai rewriter", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns original text for local provider", async () => {
    const text = "Hello world";
    const result = await rewriteText(text, {
      mode: "fix_grammar",
      language: "en",
      provider: "local",
    });

    expect(result).toBe(text);
  });

  it("uses OpenAI-compatible endpoint and returns rewritten content", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({
        choices: [{ message: { content: "Rewritten text" } }],
      }),
    } as unknown as Response);

    const result = await rewriteText("old", {
      mode: "rephrase",
      language: "en",
      provider: "openai",
      apiKey: "test-key",
      model: "gpt-4o-mini",
    });

    expect(result).toBe("Rewritten text");
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("throws on OpenAI non-ok response", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 401,
      statusText: "Unauthorized",
      text: async () => "bad key",
      headers: { get: () => "application/json" },
    } as unknown as Response);

    await expect(
      rewriteText("old", {
        mode: "formalize",
        language: "en",
        provider: "openai",
        apiKey: "wrong",
      }),
    ).rejects.toThrowError(/AI API error: 401 Unauthorized/);
  });

  it("uses Gemini endpoint and returns generated text", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      headers: { get: () => "application/json" },
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "Gemini output" }] } }],
      }),
    } as unknown as Response);

    const result = await rewriteText("old", {
      mode: "summarize",
      language: "en",
      provider: "gemini",
      apiKey: "g-key",
      model: "gemini-2.5-flash",
    });

    expect(result).toBe("Gemini output");
  });
});
