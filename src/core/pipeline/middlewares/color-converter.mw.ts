import { convertColor } from "../../color-converter";
import { PipelineMiddleware } from "../types";

/**
 * color-converter middleware
 *
 * Converts detected color values into hex, rgb(a), and hsl(a) output.
 */
export const colorConverterMiddleware: PipelineMiddleware = {
  id: "color-converter",
  supports: (ctx) => ctx.detectedType === "color_code",
  run: (input) => convertColor(input),
};
