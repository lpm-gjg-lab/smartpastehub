import { evaluateAndAppend } from "../../math-evaluator";
import { PipelineMiddleware } from "../types";

/**
 * math-evaluator middleware
 *
 * Evaluates simple math expressions and appends the result.
 * Uses Opsi A (non-destructive): "2 + 3" → "2 + 3 = 5"
 *
 * Only active for math_expression content type (detected by content-detector).
 * Uses a safe recursive descent parser — no eval().
 */

export const mathEvaluatorMiddleware: PipelineMiddleware = {
  id: "math-evaluator",
  supports: (ctx) => ctx.detectedType === "math_expression",
  run: (input) => evaluateAndAppend(input),
};
