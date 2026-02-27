import { afterEach, describe, expect, it } from "vitest";
import {
  buildAiCacheKey,
  consumeAiBudget,
  estimateTokenUsage,
  getAiBudgetSnapshot,
  getCachedAiResult,
  resetAiAssistStateForTests,
  setCachedAiResult,
  shouldUseAiAssist,
  trimTextForAi,
} from "../../src/ai/ai-paste-optimizer";

describe("ai paste optimizer", () => {
  afterEach(() => {
    resetAiAssistStateForTests();
  });

  it("skips ai for always-plain content types", () => {
    const gate = shouldUseAiAssist({
      aiEnabled: true,
      provider: "openai",
      hasApiKey: true,
      strategyConfidence: 0.1,
      detectedType: "source_code",
      textLength: 300,
      aiMode: "auto",
    });

    expect(gate.allowed).toBe(false);
    expect(gate.reason).toBe("plain-type");
  });

  it("allows ai when confidence is low", () => {
    const gate = shouldUseAiAssist({
      aiEnabled: true,
      provider: "openai",
      hasApiKey: true,
      strategyConfidence: 0.2,
      detectedType: "plain_text",
      textLength: 250,
      aiMode: "auto",
    });

    expect(gate.allowed).toBe(true);
    expect(gate.reason).toBe("low-confidence");
  });

  it("trims large text while preserving head and tail", () => {
    const text = "A".repeat(4000) + "TAIL";
    const result = trimTextForAi(text, 1000);

    expect(result.trimmed).toBe(true);
    expect(result.text.length).toBeLessThanOrEqual(1100);
    expect(result.text.includes("[truncated for budget]")).toBe(true);
    expect(result.text.endsWith("TAIL")).toBe(true);
  });

  it("tracks ai budget usage", () => {
    const first = consumeAiBudget(200);
    const second = consumeAiBudget(300);
    const snapshot = getAiBudgetSnapshot();

    expect(first.ok).toBe(true);
    expect(second.ok).toBe(true);
    expect(snapshot.tokensUsed).toBe(500);
    expect(snapshot.callsUsed).toBe(2);
  });

  it("caches ai responses by stable key", () => {
    const key = buildAiCacheKey({
      text: "hello world",
      provider: "openai",
      model: "gpt-4o-mini",
      mode: "fix_grammar",
      sourceApp: "notion.exe",
      targetApp: "slack.exe",
      contentType: "plain_text",
    });

    setCachedAiResult(key, "hello, world");
    const cached = getCachedAiResult(key);

    expect(cached).toBe("hello, world");
  });

  it("estimates tokens deterministically", () => {
    const tokens = estimateTokenUsage("abcd".repeat(100));
    expect(tokens).toBe(100);
  });
});
