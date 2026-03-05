import { describe, expect, it } from "vitest";
import { sensitiveMaskerMiddleware } from "../../../src/core/pipeline/middlewares/sensitive-masker.mw";
import { PipelineContext } from "../../../src/core/pipeline/types";

function ctx(detectedType: PipelineContext["detectedType"]): PipelineContext {
  return { content: { text: "" }, detectedType };
}

describe("sensitive-masker middleware", () => {
  // ── supports ───────────────────────────────────────────────────────────────
  it("is active for plain_text", () => {
    expect(sensitiveMaskerMiddleware.supports(ctx("plain_text"))).toBe(false);
  });

  it("is active for email_text", () => {
    expect(sensitiveMaskerMiddleware.supports(ctx("email_text"))).toBe(false);
  });

  it("is active for source_code", () => {
    expect(sensitiveMaskerMiddleware.supports(ctx("source_code"))).toBe(false);
  });

  // ── masking behavior ──────────────────────────────────────────────────────
  it("masks email addresses", async () => {
    const input = "Contact me at user@example.com for details";
    const result = await sensitiveMaskerMiddleware.run(
      input,
      ctx("plain_text"),
    );
    expect(result).not.toContain("user@example.com");
    expect(result).toContain("Contact me at");
    expect(result).toContain("for details");
    // Partial mask should keep some chars visible
    expect(result).toMatch(/@/);
  });

  it("masks Indonesian phone numbers", async () => {
    const input = "Hubungi 081234567890 untuk info";
    const result = await sensitiveMaskerMiddleware.run(
      input,
      ctx("plain_text"),
    );
    expect(result).not.toContain("081234567890");
    expect(result).toContain("Hubungi");
  });

  it("masks credit card numbers", async () => {
    const input = "Card: 4111111111111111";
    const result = await sensitiveMaskerMiddleware.run(
      input,
      ctx("plain_text"),
    );
    expect(result).not.toContain("4111111111111111");
    expect(result).toContain("Card:");
  });

  it("masks AWS keys", async () => {
    const input = "key = AKIAIOSFODNN7EXAMPLE";
    const result = await sensitiveMaskerMiddleware.run(
      input,
      ctx("source_code"),
    );
    expect(result).not.toContain("AKIAIOSFODNN7EXAMPLE");
  });

  it("returns text unchanged when no PII found", async () => {
    const input = "Hello world, this is a normal text.";
    const result = await sensitiveMaskerMiddleware.run(
      input,
      ctx("plain_text"),
    );
    expect(result).toBe(input);
  });

  it("masks multiple PII occurrences", async () => {
    const input = "Email: admin@test.com Phone: 08123456789";
    const result = await sensitiveMaskerMiddleware.run(
      input,
      ctx("plain_text"),
    );
    expect(result).not.toContain("admin@test.com");
    expect(result).not.toContain("08123456789");
  });
});
