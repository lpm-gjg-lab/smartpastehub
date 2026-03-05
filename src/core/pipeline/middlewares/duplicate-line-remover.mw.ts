import { removeDuplicateLines } from "../../duplicate-line-remover";
import { PipelineMiddleware } from "../types";

const SUPPORTED_TYPES = new Set(["plain_text", "email_text", "pdf_text"]);

/**
 * duplicate-line-remover middleware
 *
 * Removes repeated lines from general text content while preserving order.
 */
export const duplicateLineRemoverMiddleware: PipelineMiddleware = {
  id: "duplicate-line-remover",
  supports: (ctx) => SUPPORTED_TYPES.has(ctx.detectedType),
  run: (input) => removeDuplicateLines(input),
};
