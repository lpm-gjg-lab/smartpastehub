import { describe, expect, it } from "vitest";
import { timestampConverterMiddleware } from "../../../src/core/pipeline/middlewares/timestamp-converter.mw";
import {
  convertTimestamp,
  formatTimestamp,
} from "../../../src/core/timestamp-converter";
import { PipelineContext } from "../../../src/core/pipeline/types";

function ctx(detectedType: PipelineContext["detectedType"]): PipelineContext {
  return { content: { text: "" }, detectedType };
}

describe("timestamp-converter middleware", () => {
  it("is active only for date_text", () => {
    expect(timestampConverterMiddleware.supports(ctx("date_text"))).toBe(true);
    expect(timestampConverterMiddleware.supports(ctx("plain_text"))).toBe(
      false,
    );
  });

  it("converts Unix epoch seconds to ISO and human-readable date", async () => {
    const result = await timestampConverterMiddleware.run(
      "1709107200",
      ctx("date_text"),
    );
    expect(result).toContain("1709107200 -> 2024-02-28T08:00:00.000Z");
    expect(result).toContain("(Wednesday, February 28, 2024)");
  });

  it("converts ISO 8601 to epoch and human-readable date", () => {
    const result = convertTimestamp("2024-02-28T08:00:00.000Z");
    expect(result).toContain("2024-02-28T08:00:00.000Z -> 1709107200");
    expect(result).toContain("(Wednesday, February 28, 2024)");
  });

  it("parses human-readable date and converts to ISO", () => {
    const result = convertTimestamp("Wed, 28 Feb 2024 08:00:00 GMT");
    expect(result).toBe(
      "Wed, 28 Feb 2024 08:00:00 GMT -> 2024-02-28T08:00:00.000Z",
    );
  });

  it("returns invalid input as-is", () => {
    expect(convertTimestamp("not-a-date")).toBe("not-a-date");
  });

  it("handles epoch milliseconds and seconds equivalently", () => {
    const fromSeconds = convertTimestamp("1709107200");
    const fromMillis = convertTimestamp("1709107200000");

    expect(fromSeconds).toContain("2024-02-28T08:00:00.000Z");
    expect(fromMillis).toContain("2024-02-28T08:00:00.000Z");
  });

  it("formats timestamp into supported output formats", () => {
    expect(formatTimestamp(1709107200, "iso")).toBe("2024-02-28T08:00:00.000Z");
    expect(formatTimestamp(1709107200, "human")).toBe(
      "Wednesday, February 28, 2024",
    );
    expect(formatTimestamp(Number.NaN, "iso")).toBe("Invalid date");
  });
});
