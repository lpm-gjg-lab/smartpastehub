import { fixIndentation } from "../../code-indent-fixer";
import { PipelineMiddleware } from "../types";

/**
 * code-indent-fixer middleware
 *
 * Normalizes source code indentation to two-space indentation.
 */
export const codeIndentFixerMiddleware: PipelineMiddleware = {
  id: "code-indent-fixer",
  supports: (ctx) => ctx.detectedType === "source_code",
  run: (input) => fixIndentation(input, "spaces", 2),
};
