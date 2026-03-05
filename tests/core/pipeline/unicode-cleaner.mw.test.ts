import { describe, expect, it } from "vitest";
import { unicodeCleanerMiddleware } from "../../../src/core/pipeline/middlewares/unicode-cleaner.mw";
import { PipelineContext } from "../../../src/core/pipeline/types";

function ctx(detectedType: PipelineContext["detectedType"]): PipelineContext {
  return {
    content: { text: "" },
    detectedType,
  };
}

describe("unicode-cleaner middleware", () => {
  it("supports all content types", () => {
    expect(unicodeCleanerMiddleware.supports(ctx("plain_text"))).toBe(true);
    expect(unicodeCleanerMiddleware.supports(ctx("source_code"))).toBe(true);
    expect(unicodeCleanerMiddleware.supports(ctx("email_text"))).toBe(true);
    expect(unicodeCleanerMiddleware.supports(ctx("unknown"))).toBe(true);
  });

  it("cleans code types with code-safe settings", async () => {
    const input = 'const\u00A0x\u200B = "Ã©"; let symbol = "ﬀＡ";';
    const output = await unicodeCleanerMiddleware.run(
      input,
      ctx("source_code"),
    );

    expect(output).toContain('const x = "é";');
    expect(output).toContain("ﬀA");
    expect(output.includes("\u00A0")).toBe(false);
    expect(output.includes("\u200B")).toBe(false);
  });

  it("cleans prose types with prose-safe defaults", async () => {
    const input = "hello\u00A0world\u200B ﬀ Ａ Ã©";
    const output = await unicodeCleanerMiddleware.run(input, ctx("plain_text"));

    expect(output).toContain("hello world");
    expect(output).toContain("ff");
    expect(output).toContain("Ａ");
    expect(output).toContain("é");
    expect(output.includes("\u00A0")).toBe(false);
    expect(output.includes("\u200B")).toBe(false);
  });
});
