import QRCode from "qrcode";
import { SafeHandle } from "./contracts";

interface QRPayload {
  text: string;
  options?: {
    errorCorrection?: "L" | "M" | "Q" | "H";
    size?: number;
  };
}

function splitChunks(text: string, maxChunkLength = 900): string[] {
  if (text.length <= maxChunkLength) {
    return [text];
  }

  const chunks: string[] = [];
  for (let i = 0; i < text.length; i += maxChunkLength) {
    chunks.push(text.slice(i, i + maxChunkLength));
  }
  return chunks;
}

export function registerQrIpc(safeHandle: SafeHandle): void {
  safeHandle("qr:generate", async (_, payload) => {
    const { text, options } = payload as QRPayload;
    const rawText = String(text ?? "");

    if (!rawText.trim()) {
      return { dataUrls: [], chunks: 0 };
    }

    const chunks = splitChunks(rawText);
    const errorCorrectionLevel = options?.errorCorrection ?? "M";
    const width = options?.size ?? 256;

    const dataUrls = await Promise.all(
      chunks.map((chunk, index) =>
        QRCode.toDataURL(
          chunks.length > 1
            ? `[${index + 1}/${chunks.length}] ${chunk}`
            : chunk,
          {
            errorCorrectionLevel,
            width,
            margin: 1,
          },
        ),
      ),
    );

    return { dataUrls, chunks: dataUrls.length };
  });
}
