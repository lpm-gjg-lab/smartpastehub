import { sortLines } from "../../list-sorter";
import { PipelineMiddleware } from "../types";

/**
 * list-sorter middleware
 *
 * Utility middleware that is intentionally not auto-applied by the pipeline.
 * Import and invoke sortLines directly when needed.
 */
export const listSorterMiddleware: PipelineMiddleware = {
  id: "list-sorter",
  supports: () => false,
  run: (input) => sortLines(input),
};
