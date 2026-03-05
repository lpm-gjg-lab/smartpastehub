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

    expect(result.text).toBe(text);
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

    expect(result.text).toBe("Rewritten text");
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

  it("strips HTML tags from error body on 504", async () => {
    const htmlBody =
      "<!DOCTYPE html><html><head><title>504: Gateway time-out</title></head><body><h1>Gateway time-out</h1><div>Visit cloudflare.com</div></body></html>";
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 504,
      statusText: "Gateway Timeout",
      text: async () => htmlBody,
      headers: { get: () => "text/html" },
    } as unknown as Response);

    await expect(
      rewriteText("hello", {
        mode: "summarize",
        language: "en",
        provider: "openai",
        apiKey: "k",
      }),
    ).rejects.toSatisfy((err: unknown) => {
      const msg = err instanceof Error ? err.message : "";
      // Must NOT contain raw HTML angle brackets
      return !msg.includes("<") && msg.includes("504");
    });
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

    expect(result.text).toBe("Gemini output");
  });
});
