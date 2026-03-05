import { describe, expect, it } from "vitest";
import {
  generateFileSlug,
  generateSlug,
} from "../../../src/core/slug-generator";
import { slugGeneratorMiddleware } from "../../../src/core/pipeline/middlewares/slug-generator.mw";
import { PipelineContext } from "../../../src/core/pipeline/types";

function ctx(detectedType: PipelineContext["detectedType"]): PipelineContext {
  return { content: { text: "" }, detectedType };
}

describe("slug-generator middleware", () => {
  it("is never auto-active", () => {
    expect(slugGeneratorMiddleware.supports(ctx("plain_text"))).toBe(false);
    expect(slugGeneratorMiddleware.supports(ctx("md_text"))).toBe(false);
  });

  it("can still run manually through pipeline", async () => {
    const result = await slugGeneratorMiddleware.run(
      "Hello Smart Paste Hub",
      ctx("plain_text"),
    );
    expect(result).toBe("hello-smart-paste-hub");
  });
});

describe("slug-generator core", () => {
  it("generates a basic slug", () => {
    expect(generateSlug("Hello World")).toBe("hello-world");
  });

  it("handles multiple spaces", () => {
    expect(generateSlug("Hello     World   Again")).toBe("hello-world-again");
  });

  it("removes special characters", () => {
    expect(generateSlug("hello@world!!! #2026")).toBe("hello-world-2026");
  });

  it("transliterates common diacritics", () => {
    expect(generateSlug("Crème Brulee Niño Über")).toBe(
      "creme-brulee-nino-uber",
    );
  });

  it("handles Indonesian text safely", () => {
    expect(generateSlug("Pemerintah Republik Indonesia 2026!!!")).toBe(
      "pemerintah-republik-indonesia-2026",
    );
  });

  it("supports custom separator", () => {
    expect(generateSlug("Hello World Again", ".")).toBe("hello.world.again");
  });

  it("generates file slug with underscore", () => {
    expect(generateFileSlug("Laporan Bulanan Maret 2026")).toBe(
      "laporan_bulanan_maret_2026",
    );
  });

  it("returns empty string for empty input", () => {
    expect(generateSlug("")).toBe("");
  });
});
