import { formatNumber } from "../../number-formatter";
import { PipelineMiddleware } from "../types";

const LOOKS_UNFORMATTED_LARGE_NUMBER = /(^|[^\d.,])\d{6,}($|[^\d.,])/;

/**
 * number-formatter middleware
 *
 * Formats large unformatted numbers in plain text with locale-aware grouping.
 */
export const numberFormatterMiddleware: PipelineMiddleware = {
  id: "number-formatter",
  supports: (ctx) =>
    ctx.detectedType === "plain_text" &&
    LOOKS_UNFORMATTED_LARGE_NUMBER.test(ctx.content.text),
  run: (input) => formatNumber(input),
};
