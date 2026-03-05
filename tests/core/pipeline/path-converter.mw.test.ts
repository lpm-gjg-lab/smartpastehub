import { describe, expect, it } from "vitest";
import { pathConverterMiddleware } from "../../../src/core/pipeline/middlewares/path-converter.mw";
import { PipelineContext } from "../../../src/core/pipeline/types";

function ctx(detectedType: PipelineContext["detectedType"]): PipelineContext {
  return { content: { text: "" }, detectedType };
}

describe("path-converter middleware", () => {
  it("is active for path_text", () => {
    expect(pathConverterMiddleware.supports(ctx("path_text"))).toBe(true);
  });

  it("is NOT active for plain_text", () => {
    expect(pathConverterMiddleware.supports(ctx("plain_text"))).toBe(false);
  });

  it("converts Windows drive path to Unix path", async () => {
    const result = await pathConverterMiddleware.run(
      "C:\\Users\\foo\\bar",
      ctx("path_text"),
    );
    expect(result).toBe("/c/Users/foo/bar");
  });

  it("converts Unix absolute path to Windows path", async () => {
    const result = await pathConverterMiddleware.run(
      "/home/user/file.txt",
      ctx("path_text"),
    );
    expect(result).toBe("C:\\home\\user\\file.txt");
  });

  it("converts UNC path to Unix-style network path", async () => {
    const result = await pathConverterMiddleware.run(
      "\\\\server\\share\\path",
      ctx("path_text"),
    );
    expect(result).toBe("//server/share/path");
  });

  it("converts drive root path correctly", async () => {
    const result = await pathConverterMiddleware.run("D:\\", ctx("path_text"));
    expect(result).toBe("/d/");
  });

  it("normalizes double separators in Windows path", async () => {
    const result = await pathConverterMiddleware.run(
      "C:\\\\foo\\\\bar",
      ctx("path_text"),
    );
    expect(result).toBe("/c/foo/bar");
  });

  it("strips surrounding quotes before conversion", async () => {
    const result = await pathConverterMiddleware.run(
      '"C:\\Program Files\\App"',
      ctx("path_text"),
    );
    expect(result).toBe("/c/Program Files/App");
  });

  it("handles mixed separators", async () => {
    const result = await pathConverterMiddleware.run(
      "C:/Users\\foo/bar",
      ctx("path_text"),
    );
    expect(result).toBe("/c/Users/foo/bar");
  });
});
