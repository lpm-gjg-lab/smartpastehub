import { autoConvertBase64 } from "../../base64-codec";
import { PipelineMiddleware } from "../types";

/**
 * base64-codec middleware
 *
 * Attempts to decode Base64 clipboard text when detected type is plain_text.
 */
export const base64CodecMiddleware: PipelineMiddleware = {
  id: "base64-codec",
  supports: (ctx) => ctx.detectedType === "plain_text",
  run: (input) => autoConvertBase64(input),
};
