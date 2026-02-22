const fs = require('fs');

let content = fs.readFileSync('src/ocr/ocr-engine.ts', 'utf8');

const replacement = `export async function recognizeText(
  image: Buffer | string,
  options?: OCROptions,
): Promise<OCRResult> {
  const tesseract = await import('tesseract.js');
  const langs = options?.languages?.join('+') || 'eng';

  const result = await tesseract.recognize(image, langs, {
    logger: m => console.log(m),
  });

  const blocks = result.data.blocks?.map((b: any) => ({
    text: b.text,
    confidence: b.confidence,
  })) || [];

  return { 
    text: result.data.text, 
    confidence: result.data.confidence, 
    blocks 
  };
}`;

content = content.replace(/export async function recognizeText\([\s\S]*?\} {/, replacement.replace(/\} {$/, "}"));
// Actually just replace the whole function:
const regex = /export async function recognizeText\([\s\S]*?\}$/;
content = content.replace(regex, replacement);

fs.writeFileSync('src/ocr/ocr-engine.ts', content);
