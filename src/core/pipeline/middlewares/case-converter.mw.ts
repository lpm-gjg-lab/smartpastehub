import { PipelineMiddleware } from "../types";

/**
 * case-converter middleware
 *
 * Utility middleware reserved for explicit preset/settings invocation.
 * It is disabled for automatic pipeline runs by default.
 */
export const caseConverterMiddleware: PipelineMiddleware = {
  id: "case-converter",
  supports: () => false,
  run: (input) => input,
};
