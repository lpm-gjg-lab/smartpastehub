import { convertTimestamp } from "../../timestamp-converter";
import { PipelineMiddleware } from "../types";

/**
 * timestamp-converter middleware
 *
 * Converts Unix epoch values and date strings into readable timestamp forms.
 */
export const timestampConverterMiddleware: PipelineMiddleware = {
  id: "timestamp-converter",
  supports: (ctx) => ctx.detectedType === "date_text",
  run: (input) => convertTimestamp(input),
};
