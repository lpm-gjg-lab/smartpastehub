import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/main/settings-store", () => ({
  getSettings: vi.fn(),
}));

vi.mock("../../src/ai/ai-rewriter", () => ({
  rewriteText: vi.fn(),
}));

import { rewriteText } from "../../src/ai/ai-rewriter";
import { getSettings } from "../../src/main/settings-store";
import { registerAiIpc } from "../../src/main/ipc/ai.ipc";

describe("AI IPC registration", () => {
  it("registers ai:rewrite and uses stored settings", async () => {
    const handlers = new Map<
      string,
      (event: unknown, payload: unknown) => Promise<unknown> | unknown
    >();

    registerAiIpc((channel, handler) => {
      handlers.set(
        channel,
        handler as (event: unknown, payload: unknown) => Promise<unknown>,
      );
    });

    vi.mocked(getSettings).mockResolvedValue({
      general: { language: "en" },
      ai: {
        provider: "openai",
        apiKey: "k",
        baseUrl: "https://api.openai.com/v1",
        model: "gpt-4o-mini",
      },
    } as never);

    vi.mocked(rewriteText).mockResolvedValue("rewritten");

    const rewriteHandler = handlers.get("ai:rewrite");
    if (!rewriteHandler) {
      throw new Error("ai:rewrite handler not registered");
    }

    const result = await rewriteHandler(
      {},
      { text: "old text", mode: "rephrase" },
    );

    expect(rewriteText).toHaveBeenCalledWith(
      "old text",
      expect.objectContaining({
        mode: "rephrase",
        provider: "openai",
        apiKey: "k",
      }),
    );
    expect(result).toEqual({
      rewritten: "rewritten",
      mode: "rephrase",
      changed: true,
    });
  });

  it("registers ai:test-connection and handles local provider", async () => {
    const handlers = new Map<
      string,
      (event: unknown, payload: unknown) => Promise<unknown> | unknown
    >();

    registerAiIpc((channel, handler) => {
      handlers.set(
        channel,
        handler as (event: unknown, payload: unknown) => Promise<unknown>,
      );
    });

    vi.mocked(getSettings).mockResolvedValue({
      ai: {
        provider: "local",
        apiKey: "",
        baseUrl: "",
        model: "",
      },
    } as never);

    const testHandler = handlers.get("ai:test-connection");
    if (!testHandler) {
      throw new Error("ai:test-connection handler not registered");
    }

    const result = await testHandler({}, undefined);
    expect(result).toEqual({
      ok: false,
      message: "Provider is set to local (no AI)",
    });
  });
});
