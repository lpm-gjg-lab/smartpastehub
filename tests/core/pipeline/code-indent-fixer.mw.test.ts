import { describe, expect, it } from "vitest";
import { fixIndentation } from "../../../src/core/code-indent-fixer";
import { codeIndentFixerMiddleware } from "../../../src/core/pipeline/middlewares/code-indent-fixer.mw";
import { PipelineContext } from "../../../src/core/pipeline/types";

function ctx(detectedType: PipelineContext["detectedType"]): PipelineContext {
  return { content: { text: "" }, detectedType };
}

describe("code-indent-fixer middleware", () => {
  it("is active for source_code", () => {
    expect(codeIndentFixerMiddleware.supports(ctx("source_code"))).toBe(true);
  });

  it("is NOT active for plain_text", () => {
    expect(codeIndentFixerMiddleware.supports(ctx("plain_text"))).toBe(false);
  });

  it("normalizes mixed tabs and spaces to spaces", async () => {
    const input = [
      "\tfunction run() {",
      "\t\tconst value = 1;",
      "    \treturn value;",
      "\t}",
    ].join("\n");

    const result = await codeIndentFixerMiddleware.run(
      input,
      ctx("source_code"),
    );
    expect(result).toBe(
      [
        "function run() {",
        "    const value = 1;",
        "    return value;",
        "}",
      ].join("\n"),
    );
  });
});

describe("code-indent-fixer core", () => {
  it("strips common leading whitespace across non-empty lines", () => {
    const input = ["    if (ready) {", "      execute();", "    }"].join("\n");

    expect(fixIndentation(input, "spaces", 2)).toBe(
      ["if (ready) {", "  execute();", "}"].join("\n"),
    );
  });

  it("preserves empty lines while normalizing indentation", () => {
    const input = [
      "    function test() {",
      "",
      "      return 1;",
      "    }",
    ].join("\n");

    expect(fixIndentation(input, "spaces", 2)).toBe(
      ["function test() {", "", "  return 1;", "}"].join("\n"),
    );
  });
});
