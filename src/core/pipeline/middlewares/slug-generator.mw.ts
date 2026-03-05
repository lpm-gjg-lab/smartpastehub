import { generateSlug } from "../../slug-generator";
import { PipelineMiddleware } from "../types";

/**
 * slug-generator middleware
 *
 * Utility-only middleware that does not auto-run in the default pipeline.
 */
export const slugGeneratorMiddleware: PipelineMiddleware = {
  id: "slug-generator",
  supports: () => false,
  run: (input) => generateSlug(input),
};
