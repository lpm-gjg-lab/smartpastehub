import { recognize } from "tesseract.js";

export interface OCROptions {
  languages: string[];
  psm: number;
  confidence_threshold: number;
}

export interface OCRBlock {
  text: string;
  confidence: number;
}

export interface OCRResult {
  text: string;
  confidence: number;
  blocks: OCRBlock[];
  warning?: string;
}

const DEFAULT_OPTIONS: OCROptions = {
  languages: ["eng"],
  psm: 3,
  confidence_threshold: 0.5,
};

function normalizeThreshold(value: number): number {
  if (!Number.isFinite(value)) {
    return DEFAULT_OPTIONS.confidence_threshold;
  }
  if (value > 1) {
    return Math.max(0, Math.min(1, value / 100));
  }
  return Math.max(0, Math.min(1, value));
}

function clamp01(value: number): number {
  if (!Number.isFinite(value)) {
    return 0;
  }
  return Math.max(0, Math.min(1, value));
}

function toImageInput(image: Buffer | string): string | Buffer {
  if (typeof image === "string") {
    return image;
  }
  if (Buffer.isBuffer(image)) {
    return image;
  }
  throw new Error("Unsupported OCR image input");
}

function tryDecodeDataUrl(input: string): Buffer | string {
  const match = input.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
  if (!match) {
    return input;
  }
  const payload = match[1];
  if (!payload) {
    throw new Error("OCR image data URL payload is empty");
  }
  return Buffer.from(payload, "base64");
}

export async function recognizeText(
  image: Buffer | string,
  options?: Partial<OCROptions>,
): Promise<OCRResult> {
  const resolved = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const languages =
    resolved.languages && resolved.languages.length > 0
      ? resolved.languages.join("+")
      : "eng";
  const threshold = normalizeThreshold(resolved.confidence_threshold);
  const rawImageInput = toImageInput(image);
  const imageInput =
    typeof rawImageInput === "string"
      ? tryDecodeDataUrl(rawImageInput)
      : rawImageInput;

  let result: Awaited<ReturnType<typeof recognize>>;
  let warning: string | undefined;
  try {
    result = await recognize(imageInput, languages);
  } catch (error) {
    const requestedLanguages = resolved.languages ?? DEFAULT_OPTIONS.languages;
    const hasFallbackCandidate = requestedLanguages.some(
      (lang) => lang !== "eng",
    );
    if (!hasFallbackCandidate) {
      throw error;
    }
    result = await recognize(imageInput, "eng");
    warning = "OCR fallback used: English model only";
  }

  const text = result.data.text ?? "";
  const confidence = clamp01((result.data.confidence ?? 0) / 100);

  const blocks = (result.data.blocks ?? [])
    .flatMap((block) => block.paragraphs)
    .flatMap((paragraph) => paragraph.lines)
    .flatMap((line) => line.words)
    .map((word) => ({
      text: String(word.text ?? "").trim(),
      confidence: clamp01((Number(word.confidence) || 0) / 100),
    }))
    .filter((word) => word.text.length > 0 && word.confidence >= threshold);

  const normalized: OCRResult = {
    text,
    confidence,
    blocks,
  };
  if (warning) {
    normalized.warning = warning;
  }
  return normalized;
}
