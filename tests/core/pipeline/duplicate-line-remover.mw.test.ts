import { describe, expect, it } from "vitest";
import { removeDuplicateLines } from "../../../src/core/duplicate-line-remover";
import { duplicateLineRemoverMiddleware } from "../../../src/core/pipeline/middlewares/duplicate-line-remover.mw";
import { PipelineContext } from "../../../src/core/pipeline/types";

function ctx(detectedType: PipelineContext["detectedType"]): PipelineContext {
  return { content: { text: "" }, detectedType };
}

describe("duplicate-line-remover middleware", () => {
  it("is active for plain_text, email_text, and pdf_text", () => {
    expect(duplicateLineRemoverMiddleware.supports(ctx("plain_text"))).toBe(
      true,
    );
    expect(duplicateLineRemoverMiddleware.supports(ctx("email_text"))).toBe(
      true,
    );
    expect(duplicateLineRemoverMiddleware.supports(ctx("pdf_text"))).toBe(true);
  });

  it("is NOT active for source_code", () => {
    expect(duplicateLineRemoverMiddleware.supports(ctx("source_code"))).toBe(
      false,
    );
  });

  it("removes duplicate lines while preserving order", async () => {
    const input = ["alpha", "beta", "alpha", "gamma", "beta"].join("\n");
    const result = await duplicateLineRemoverMiddleware.run(
      input,
      ctx("plain_text"),
    );

    expect(result).toBe(["alpha", "beta", "gamma"].join("\n"));
  });
});

describe("duplicate-line-remover core", () => {
  it("supports case-insensitive deduplication", () => {
    const input = ["Alpha", "alpha", "BETA", "beta"].join("\n");
    expect(removeDuplicateLines(input, { ignoreCase: true })).toBe(
      ["Alpha", "BETA"].join("\n"),
    );
  });

  it("preserves blank lines by default", () => {
    const input = ["section-1", "", "section-1", "", "section-2"].join("\n");
    expect(removeDuplicateLines(input)).toBe(
      ["section-1", "", "", "section-2"].join("\n"),
    );
  });

  it("leaves a single line unchanged", () => {
    expect(removeDuplicateLines("just one line")).toBe("just one line");
  });
});
