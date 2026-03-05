import { describe, expect, it } from "vitest";
import { htmlStripperMiddleware } from "../../../src/core/pipeline/middlewares/html-stripper.mw";
import { PipelineContext } from "../../../src/core/pipeline/types";

function ctx(
  detectedType: PipelineContext["detectedType"],
  text: string,
  html?: string,
): PipelineContext {
  return {
    content: { text, html },
    detectedType,
  };
}

describe("html-stripper middleware", () => {
  it("supports styled_html and structured_html only", () => {
    expect(
      htmlStripperMiddleware.supports(ctx("styled_html", "fallback")),
    ).toBe(true);
    expect(
      htmlStripperMiddleware.supports(ctx("structured_html", "fallback")),
    ).toBe(true);
    expect(htmlStripperMiddleware.supports(ctx("plain_text", "fallback"))).toBe(
      false,
    );
    expect(
      htmlStripperMiddleware.supports(ctx("source_code", "fallback")),
    ).toBe(false);
  });

  it("converts HTML into readable markdown-like plain text", async () => {
    const html = [
      "<h2>Report</h2>",
      "<p><strong>Important</strong> <em>details</em> are listed.</p>",
      "<ul><li>First</li><li>Second</li></ul>",
      '<p><a href="https://example.com">Open link</a></p>',
    ].join("");

    const output = await htmlStripperMiddleware.run(
      "",
      ctx("styled_html", "fallback", html),
    );

    expect(output).toContain("## Report");
    expect(output).toContain("**Important**");
    expect(output).toContain("_details_");
    expect(output).toContain("-   First");
    expect(output).toContain("[Open link](https://example.com)");
  });

  it("falls back to content.text when html payload is absent", async () => {
    const output = await htmlStripperMiddleware.run(
      "",
      ctx("structured_html", "<b>Bold from text field</b>"),
    );

    expect(output).toContain("**Bold from text field**");
  });
});
