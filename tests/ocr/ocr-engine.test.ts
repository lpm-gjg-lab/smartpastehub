import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("tesseract.js", () => ({
  recognize: vi.fn(),
}));

import { recognize } from "tesseract.js";
import { recognizeText } from "../../src/ocr/ocr-engine";

describe("OCR engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("maps tesseract output into normalized OCR result", async () => {
    vi.mocked(recognize).mockResolvedValue({
      data: {
        text: "Hello OCR",
        confidence: 87,
        blocks: [
          {
            paragraphs: [
              {
                lines: [
                  {
                    words: [
                      { text: "Hello", confidence: 90 },
                      { text: "low", confidence: 40 },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    } as never);

    const result = await recognizeText(Buffer.from("img"), {
      languages: ["eng", "ind"],
      confidence_threshold: 0.5,
    });

    expect(recognize).toHaveBeenCalledWith(expect.any(Buffer), "eng+ind");
    expect(result).toEqual({
      text: "Hello OCR",
      confidence: 0.87,
      blocks: [{ text: "Hello", confidence: 0.9 }],
    });
  });

  it("supports percent threshold input and string image paths", async () => {
    vi.mocked(recognize).mockResolvedValue({
      data: {
        text: "Doc",
        confidence: 100,
        blocks: [
          {
            paragraphs: [
              {
                lines: [
                  {
                    words: [
                      { text: "Keep", confidence: 81 },
                      { text: "Drop", confidence: 79 },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    } as never);

    const result = await recognizeText("/tmp/image.png", {
      confidence_threshold: 80,
      psm: 6,
    });

    expect(recognize).toHaveBeenCalledWith("/tmp/image.png", "eng");
    expect(result.blocks).toEqual([{ text: "Keep", confidence: 0.81 }]);
  });

  it("throws for unsupported OCR image input", async () => {
    await expect(recognizeText({} as unknown as Buffer)).rejects.toThrowError(
      "Unsupported OCR image input",
    );
  });

  it("falls back to english model when multi-language OCR fails", async () => {
    vi.mocked(recognize)
      .mockRejectedValueOnce(new Error("lang model missing"))
      .mockResolvedValueOnce({
        data: {
          text: "Fallback text",
          confidence: 80,
          blocks: [],
        },
      } as never);

    const result = await recognizeText(Buffer.from("img"), {
      languages: ["jpn", "eng"],
      confidence_threshold: 0.5,
    });

    expect(vi.mocked(recognize)).toHaveBeenNthCalledWith(
      1,
      expect.any(Buffer),
      "jpn+eng",
    );
    expect(vi.mocked(recognize)).toHaveBeenNthCalledWith(
      2,
      expect.any(Buffer),
      "eng",
    );
    expect(result.warning).toBe("OCR fallback used: English model only");
  });
});
