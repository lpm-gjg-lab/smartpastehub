import { fixLineBreaks } from "../../line-break-fixer";
import { PipelineMiddleware } from "../types";

export const lineBreakFixerMiddleware: PipelineMiddleware = {
  id: "line-break-fixer",
  supports: (ctx) => ctx.detectedType === "pdf_text",
  run: (input) => fixLineBreaks(input),
};
