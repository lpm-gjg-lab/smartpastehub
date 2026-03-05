import { stripDecorativeSymbols } from "../../symbol-stripper";
import { PipelineMiddleware } from "../types";

/**
 * symbol-stripper middleware
 *
 * Removes decorative / structural symbols (box-drawing, block elements,
 * dingbat ornaments) that commonly appear as OCR / PDF copy-paste artifacts.
 *
 * Only active for plain_text and email_text — in other types (markdown,
 * source code, etc.) these characters may carry semantic meaning.
 */

const SUPPORTED_TYPES = new Set(["plain_text", "email_text"]);

export const symbolStripperMiddleware: PipelineMiddleware = {
    id: "symbol-stripper",
    supports: (ctx) => SUPPORTED_TYPES.has(ctx.detectedType),
    run: (input) => stripDecorativeSymbols(input),
};
