import { describe, expect, it } from "vitest";
import { numberFormatterMiddleware } from "../../../src/core/pipeline/middlewares/number-formatter.mw";
import { formatNumber, parseNumber } from "../../../src/core/number-formatter";
import { PipelineContext } from "../../../src/core/pipeline/types";

function ctx(
  detectedType: PipelineContext["detectedType"],
  text = "",
): PipelineContext {
  return { content: { text }, detectedType };
}

describe("number-formatter middleware", () => {
  it("supports plain_text with unformatted large numbers", () => {
    expect(
      numberFormatterMiddleware.supports(ctx("plain_text", "1000000")),
    ).toBe(true);
    expect(
      numberFormatterMiddleware.supports(ctx("plain_text", "1.000.000")),
    ).toBe(false);
    expect(
      numberFormatterMiddleware.supports(ctx("date_text", "1000000")),
    ).toBe(false);
  });

  it("formats basic unformatted numbers with Indonesian separators by default", async () => {
    const result = await numberFormatterMiddleware.run(
      "1000000",
      ctx("plain_text"),
    );
    expect(result).toBe("1.000.000");
  });

  it("formats IDR values with Indonesian locale", () => {
    expect(formatNumber("Rp 1000000")).toBe("Rp 1.000.000");
    expect(formatNumber("IDR 2500000")).toBe("IDR 2.500.000");
  });

  it("formats USD values with US locale", () => {
    expect(formatNumber("$1000000")).toBe("$1,000,000");
    expect(formatNumber("USD 2500000")).toBe("USD 2,500,000");
  });

  it("formats numbers inside mixed text while preserving surrounding text", () => {
    const input = "Budget 1000000 and revenue 2500000 this month";
    const result = formatNumber(input);
    expect(result).toBe("Budget 1.000.000 and revenue 2.500.000 this month");
  });

  it("keeps already formatted numbers unchanged", () => {
    expect(formatNumber("Rp 1.000.000")).toBe("Rp 1.000.000");
    expect(formatNumber("$1,000,000")).toBe("$1,000,000");
  });

  it("keeps small numbers unchanged", () => {
    expect(formatNumber("Total 999 items and 123 units")).toBe(
      "Total 999 items and 123 units",
    );
  });

  it("parses formatted numbers back to raw digits", () => {
    expect(parseNumber("Rp 1.000.000")).toBe("1000000");
    expect(parseNumber("$1,000,000")).toBe("1000000");
  });
});
