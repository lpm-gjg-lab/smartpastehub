import { PipelineRunner } from "./pipeline-runner";
import { aiRewriterMiddleware } from "./middlewares/ai-rewriter.mw";
import { emailCleanerMiddleware } from "./middlewares/email-cleaner.mw";
import { htmlStripperMiddleware } from "./middlewares/html-stripper.mw";
import { lineBreakFixerMiddleware } from "./middlewares/line-break-fixer.mw";
import { regexTransformerMiddleware } from "./middlewares/regex-transformer.mw";
import { tableConverterMiddleware } from "./middlewares/table-converter.mw";
import { unicodeCleanerMiddleware } from "./middlewares/unicode-cleaner.mw";
import { whitespaceNormalizerMiddleware } from "./middlewares/whitespace-normalizer.mw";
import { PipelineMiddleware } from "./types";

export function getDefaultMiddlewares(): PipelineMiddleware[] {
  return [
    unicodeCleanerMiddleware,   // always first — safety net for all types
    htmlStripperMiddleware,
    lineBreakFixerMiddleware,
    tableConverterMiddleware,
    emailCleanerMiddleware,
    whitespaceNormalizerMiddleware,
    regexTransformerMiddleware,
    aiRewriterMiddleware,
  ];
}

export function createDefaultPipelineRunner(
  pluginMiddlewares: PipelineMiddleware[] = [],
): PipelineRunner {
  return new PipelineRunner([...getDefaultMiddlewares(), ...pluginMiddlewares]);
}
