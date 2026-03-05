import { describe, expect, it } from "vitest";
import {
  autoConvertBase64,
  decodeBase64,
  encodeBase64,
  isBase64,
} from "../../../src/core/base64-codec";
import { base64CodecMiddleware } from "../../../src/core/pipeline/middlewares/base64-codec.mw";
import { PipelineContext } from "../../../src/core/pipeline/types";

function ctx(detectedType: PipelineContext["detectedType"]): PipelineContext {
  return { content: { text: "" }, detectedType };
}

describe("base64-codec middleware", () => {
  it("is active for plain_text", () => {
    expect(base64CodecMiddleware.supports(ctx("plain_text"))).toBe(true);
  });

  it("is NOT active for url_text", () => {
    expect(base64CodecMiddleware.supports(ctx("url_text"))).toBe(false);
  });

  it("decodes valid Base64 text", async () => {
    const input = "SGVsbG8gU21hcnRQYXN0ZUh1YiE=";
    const result = await base64CodecMiddleware.run(input, ctx("plain_text"));
    expect(result).toBe("Hello SmartPasteHub!");
  });

  it("passes through non-Base64 text", async () => {
    const input = "this is not base64";
    const result = await base64CodecMiddleware.run(input, ctx("plain_text"));
    expect(result).toBe(input);
  });

  it("returns original for binary-like Base64", async () => {
    const binaryBase64 = "AJ+Slg==";
    const result = await base64CodecMiddleware.run(
      binaryBase64,
      ctx("plain_text"),
    );
    expect(result).toBe(binaryBase64);
  });
});

describe("base64-codec core", () => {
  it("encodes UTF-8 text to Base64", () => {
    expect(encodeBase64("hello")).toBe("aGVsbG8=");
  });

  it("supports round-trip encode/decode", () => {
    const original = "Halo dunia, SmartPasteHub";
    const encoded = encodeBase64(original);
    const decoded = decodeBase64(encoded);
    expect(decoded).toBe(original);
  });

  it("handles different valid padding variations", () => {
    expect(isBase64("U21hcnQ=")).toBe(true);
    expect(decodeBase64("U21hcnQ=")).toBe("Smart");
    expect(isBase64("U21hcnRQ")).toBe(true);
    expect(decodeBase64("U21hcnRQ")).toBe("SmartP");
  });

  it("autoConvertBase64 returns original for invalid input", () => {
    const input = "invalid+++";
    expect(autoConvertBase64(input)).toBe(input);
  });
});
