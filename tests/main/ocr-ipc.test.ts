import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/ocr/ocr-engine", () => ({
  recognizeText: vi.fn(),
}));

import { recognizeText } from "../../src/ocr/ocr-engine";
import { registerOcrIpc } from "../../src/main/ipc/ocr.ipc";

describe("OCR IPC registration", () => {
  it("registers ocr:recognize and forwards payload to OCR engine", async () => {
    let registeredChannel: string | null = null;
    let registeredHandler: (
      event: unknown,
      payload: unknown,
    ) => Promise<unknown> = async () => {
      throw new Error("Handler not registered");
    };

    registerOcrIpc((channel, handler) => {
      registeredChannel = channel;
      registeredHandler = handler as (
        event: unknown,
        payload: unknown,
      ) => Promise<unknown>;
    });

    expect(registeredChannel).toBe("ocr:recognize");

    vi.mocked(recognizeText).mockResolvedValue({
      text: "Hello",
      confidence: 0.9,
      blocks: [{ text: "Hello", confidence: 0.9 }],
    });

    const payload = {
      image: "img-data-url",
      options: {
        languages: ["eng"],
        psm: 6,
        confidence_threshold: 0.7,
      },
    };

    const result = await registeredHandler({}, payload);

    expect(recognizeText).toHaveBeenCalledWith(payload.image, payload.options);
    expect(result).toEqual({
      text: "Hello",
      confidence: 0.9,
      blocks: [{ text: "Hello", confidence: 0.9 }],
    });
  });

  it("throws on invalid OCR payload image type", async () => {
    let handler: (
      event: unknown,
      payload: unknown,
    ) => Promise<unknown> = async () => {
      throw new Error("Handler not registered");
    };

    registerOcrIpc((_, registered) => {
      handler = registered as (
        event: unknown,
        payload: unknown,
      ) => Promise<unknown>;
    });

    await expect(
      handler({}, { image: 42 as unknown as string }),
    ).rejects.toThrowError(
      "OCR expects image input as a file path/base64 string or Buffer",
    );
  });
});
