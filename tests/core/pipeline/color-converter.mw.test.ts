import { describe, expect, it } from "vitest";
import { convertColor } from "../../../src/core/color-converter";
import { colorConverterMiddleware } from "../../../src/core/pipeline/middlewares/color-converter.mw";
import { PipelineContext } from "../../../src/core/pipeline/types";

function ctx(detectedType: PipelineContext["detectedType"]): PipelineContext {
  return { content: { text: "" }, detectedType };
}

describe("color-converter middleware", () => {
  it("is active for color_code", () => {
    expect(colorConverterMiddleware.supports(ctx("color_code"))).toBe(true);
  });

  it("is NOT active for plain_text", () => {
    expect(colorConverterMiddleware.supports(ctx("plain_text"))).toBe(false);
  });

  it("converts 6-digit hex into all formats", async () => {
    const result = await colorConverterMiddleware.run(
      "#FF5733",
      ctx("color_code"),
    );
    expect(result).toBe("#FF5733 | rgb(255, 87, 51) | hsl(11, 100%, 60%)");
  });

  it("converts rgb() into all formats", async () => {
    const result = await colorConverterMiddleware.run(
      "rgb(255, 87, 51)",
      ctx("color_code"),
    );
    expect(result).toBe("#FF5733 | rgb(255, 87, 51) | hsl(11, 100%, 60%)");
  });

  it("converts hsl() into all formats", async () => {
    const result = await colorConverterMiddleware.run(
      "hsl(11, 100%, 60%)",
      ctx("color_code"),
    );
    expect(result).toBe("#FF5833 | rgb(255, 88, 51) | hsl(11, 100%, 60%)");
  });

  it("supports 3-digit hex", async () => {
    const result = await colorConverterMiddleware.run(
      "#F53",
      ctx("color_code"),
    );
    expect(result).toContain("#FF5533");
    expect(result).toContain("rgb(255, 85, 51)");
  });

  it("supports 8-digit hex with alpha", async () => {
    const result = await colorConverterMiddleware.run(
      "#FF553380",
      ctx("color_code"),
    );
    expect(result).toContain("#FF553380");
    expect(result).toContain("rgba(255, 85, 51, 0.502)");
    expect(result).toContain("hsla(");
  });

  it("supports rgba() input", async () => {
    const result = await colorConverterMiddleware.run(
      "rgba(255, 87, 51, 0.5)",
      ctx("color_code"),
    );
    expect(result).toContain("#FF573380");
    expect(result).toContain("rgba(255, 87, 51, 0.5)");
    expect(result).toContain("hsla(11, 100%, 60%, 0.5)");
  });

  it("supports hsla() input", async () => {
    const result = await colorConverterMiddleware.run(
      "hsla(11, 100%, 60%, 0.5)",
      ctx("color_code"),
    );
    expect(result).toContain("#FF583380");
    expect(result).toContain("rgba(255, 88, 51, 0.5)");
    expect(result).toContain("hsla(11, 100%, 60%, 0.5)");
  });

  it("returns original input for invalid color", async () => {
    const input = "definitely-not-a-color";
    const result = await colorConverterMiddleware.run(input, ctx("color_code"));
    expect(result).toBe(input);
  });
});

describe("convertColor", () => {
  it("returns original for unparsable text", () => {
    expect(convertColor("12345")).toBe("12345");
  });
});
