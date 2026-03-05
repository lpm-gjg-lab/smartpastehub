import { convertPath } from "../../path-converter";
import { PipelineMiddleware } from "../types";

/**
 * path-converter middleware
 *
 * Converts clipboard paths between Windows and Unix-like formats.
 * Active only for path_text content.
 */
export const pathConverterMiddleware: PipelineMiddleware = {
  id: "path-converter",
  supports: (ctx) => ctx.detectedType === "path_text",
  run: (input) => convertPath(input, "auto"),
};
