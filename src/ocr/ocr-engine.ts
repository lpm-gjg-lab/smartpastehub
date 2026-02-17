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
}

export async function recognizeText(
  image: Buffer | string,
  options?: OCROptions,
): Promise<OCRResult> {
  void image;
  void options;
  return { text: '', confidence: 0, blocks: [] };
}
