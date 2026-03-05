import { describe, expect, it } from "vitest";
import { emailCleanerMiddleware } from "../../../src/core/pipeline/middlewares/email-cleaner.mw";
import { PipelineContext } from "../../../src/core/pipeline/types";

function ctx(detectedType: PipelineContext["detectedType"]): PipelineContext {
  return {
    content: { text: "" },
    detectedType,
  };
}

describe("email-cleaner middleware", () => {
  it("supports only email_text content type", () => {
    expect(emailCleanerMiddleware.supports(ctx("email_text"))).toBe(true);
    expect(emailCleanerMiddleware.supports(ctx("plain_text"))).toBe(false);
    expect(emailCleanerMiddleware.supports(ctx("source_code"))).toBe(false);
  });

  it("strips quoted reply headers and quoted lines", async () => {
    const input = [
      "Hello team,",
      "",
      "Please review the attached report.",
      "",
      "On Fri, 10 Jan 2025 at 09:30, John Doe <john@example.com> wrote:",
      "> Previous quoted line one",
      "> Previous quoted line two",
    ].join("\n");

    const output = await emailCleanerMiddleware.run(input, ctx("email_text"));

    expect(output).toContain("Hello team,");
    expect(output).toContain("Please review the attached report.");
    expect(output).not.toContain("On Fri, 10 Jan 2025");
    expect(output).not.toContain("> Previous quoted line one");
  });

  it("removes common trailing footer junk", async () => {
    const input = [
      "Weekly updates are ready.",
      "",
      "Read more",
      "unsubscribe from this list",
      "Sent from my iPhone",
    ].join("\n");

    const output = await emailCleanerMiddleware.run(input, ctx("email_text"));

    expect(output).toBe("Weekly updates are ready.");
  });
});
