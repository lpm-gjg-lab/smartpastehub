import { describe, expect, it } from "vitest";
import { listSorterMiddleware } from "../../../src/core/pipeline/middlewares/list-sorter.mw";
import { sortLines } from "../../../src/core/list-sorter";
import { PipelineContext } from "../../../src/core/pipeline/types";

function ctx(detectedType: PipelineContext["detectedType"]): PipelineContext {
  return { content: { text: "" }, detectedType };
}

describe("list-sorter middleware", () => {
  it("is never auto-active because it is utility-only", () => {
    expect(listSorterMiddleware.supports(ctx("plain_text"))).toBe(false);
    expect(listSorterMiddleware.supports(ctx("md_text"))).toBe(false);
  });

  it("sorts lines alphabetically by default", async () => {
    const input = "banana\napple\ncherry";
    const result = await listSorterMiddleware.run(input, ctx("plain_text"));
    expect(result).toBe("apple\nbanana\ncherry");
  });

  it("sorts lines in reverse when direction is desc", () => {
    const input = "banana\napple\ncherry";
    const result = sortLines(input, { direction: "desc" });
    expect(result).toBe("cherry\nbanana\napple");
  });

  it("sorts numerically when numeric option is enabled", () => {
    const input = "10\n2\n1";
    const result = sortLines(input, { numeric: true });
    expect(result).toBe("1\n2\n10");
  });

  it("sorts markdown list items by content and preserves markers", () => {
    const input = "- banana\n* apple\n1. cherry";
    const result = sortLines(input);
    expect(result).toBe("* apple\n- banana\n1. cherry");
  });

  it("is case-insensitive by default", () => {
    const input = "banana\nApple\ncherry";
    const result = sortLines(input);
    expect(result).toBe("Apple\nbanana\ncherry");
  });

  it("returns empty input unchanged", () => {
    expect(sortLines("")).toBe("");
  });
});
