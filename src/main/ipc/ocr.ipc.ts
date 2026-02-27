import { recognizeText, OCROptions } from "../../ocr/ocr-engine";
import { IpcDependencies, SafeHandle } from "./contracts";

export function registerOcrIpc(
  safeHandle: SafeHandle,
  deps?: Pick<IpcDependencies, "usageStatsRepo">,
): void {
  safeHandle("ocr:recognize", async (_, payload) => {
    const { image, options } = payload as {
      image: Buffer | string;
      options?: Partial<OCROptions>;
    };
    if (!(typeof image === "string" || Buffer.isBuffer(image))) {
      throw new Error(
        "OCR expects image input as a file path/base64 string or Buffer",
      );
    }
    const result = await recognizeText(image, options);
    deps?.usageStatsRepo.incrementDaily({ ocrCount: 1 });
    return result;
  });
}
