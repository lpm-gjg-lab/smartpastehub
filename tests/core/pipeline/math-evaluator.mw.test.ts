import { describe, expect, it } from "vitest";
import { mathEvaluatorMiddleware } from "../../../src/core/pipeline/middlewares/math-evaluator.mw";
import {
  evaluateExpression,
  evaluateAndAppend,
  formatResult,
} from "../../../src/core/math-evaluator";
import { PipelineContext } from "../../../src/core/pipeline/types";

function ctx(detectedType: PipelineContext["detectedType"]): PipelineContext {
  return { content: { text: "" }, detectedType };
}

describe("math-evaluator core", () => {
  // ── evaluateExpression ─────────────────────────────────────────────────
  it("evaluates addition", () => {
    expect(evaluateExpression("2 + 3")).toBe(5);
  });

  it("evaluates subtraction", () => {
    expect(evaluateExpression("10 - 4")).toBe(6);
  });

  it("evaluates multiplication", () => {
    expect(evaluateExpression("3 * 7")).toBe(21);
  });

  it("evaluates division", () => {
    expect(evaluateExpression("20 / 4")).toBe(5);
  });

  it("respects operator precedence", () => {
    expect(evaluateExpression("2 + 3 * 4")).toBe(14);
  });

  it("handles parentheses", () => {
    expect(evaluateExpression("(2 + 3) * 4")).toBe(20);
  });

  it("handles nested parentheses", () => {
    expect(evaluateExpression("((2 + 3) * (4 - 1))")).toBe(15);
  });

  it("handles exponentiation", () => {
    expect(evaluateExpression("2 ^ 10")).toBe(1024);
  });

  it("handles modulo", () => {
    expect(evaluateExpression("17 % 5")).toBe(2);
  });

  it("handles decimals", () => {
    expect(evaluateExpression("3.14 * 2")).toBeCloseTo(6.28);
  });

  it("handles negative numbers", () => {
    expect(evaluateExpression("-5 + 3")).toBe(-2);
  });

  it("handles unary plus", () => {
    expect(evaluateExpression("+5 + 3")).toBe(8);
  });

  it("handles complex expression", () => {
    expect(evaluateExpression("(15 * 3.5) + (200 / 4) - 10")).toBe(92.5);
  });

  it("returns null for empty string", () => {
    expect(evaluateExpression("")).toBeNull();
  });

  it("returns null for invalid expression", () => {
    expect(evaluateExpression("hello world")).toBeNull();
  });

  it("returns null for division by zero", () => {
    expect(evaluateExpression("5 / 0")).toBeNull();
  });

  it("handles right-associative exponentiation", () => {
    // 2^3^2 should be 2^(3^2) = 2^9 = 512
    expect(evaluateExpression("2 ^ 3 ^ 2")).toBe(512);
  });

  // ── formatResult ───────────────────────────────────────────────────────
  it("formats integer without decimals", () => {
    expect(formatResult(14)).toBe("14");
  });

  it("formats decimal cleanly", () => {
    expect(formatResult(3.14)).toBe("3.14");
  });

  it("formats zero", () => {
    expect(formatResult(0)).toBe("0");
  });

  it("formats negative number", () => {
    expect(formatResult(-42)).toBe("-42");
  });

  // ── evaluateAndAppend (Opsi A) ─────────────────────────────────────────
  it("appends result to expression", () => {
    expect(evaluateAndAppend("2 + 3")).toBe("2 + 3 = 5");
  });

  it("appends result with precedence", () => {
    expect(evaluateAndAppend("2 + 3 * 4")).toBe("2 + 3 * 4 = 14");
  });

  it("appends decimal result", () => {
    expect(evaluateAndAppend("10 / 3")).toMatch(/^10 \/ 3 = 3\.333/);
  });

  it("returns input unchanged if already has =", () => {
    expect(evaluateAndAppend("2 + 3 = 5")).toBe("2 + 3 = 5");
  });

  it("returns input unchanged for non-math text", () => {
    expect(evaluateAndAppend("hello world")).toBe("hello world");
  });

  it("handles complex expression", () => {
    expect(evaluateAndAppend("(15 * 3.5) + (200 / 4) - 10")).toBe(
      "(15 * 3.5) + (200 / 4) - 10 = 92.5",
    );
  });
});

describe("math-evaluator middleware", () => {
  it("is active for math_expression", () => {
    expect(mathEvaluatorMiddleware.supports(ctx("math_expression"))).toBe(true);
  });

  it("is NOT active for plain_text", () => {
    expect(mathEvaluatorMiddleware.supports(ctx("plain_text"))).toBe(false);
  });

  it("is NOT active for source_code", () => {
    expect(mathEvaluatorMiddleware.supports(ctx("source_code"))).toBe(false);
  });

  it("evaluates and appends result", async () => {
    const result = await mathEvaluatorMiddleware.run(
      "2 + 3 * 4",
      ctx("math_expression"),
    );
    expect(result).toBe("2 + 3 * 4 = 14");
  });

  it("returns input unchanged for non-math", async () => {
    const result = await mathEvaluatorMiddleware.run(
      "not math",
      ctx("math_expression"),
    );
    expect(result).toBe("not math");
  });
});
