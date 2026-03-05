import { PipelineRunner } from "./pipeline-runner";
import { aiRewriterMiddleware } from "./middlewares/ai-rewriter.mw";
import { base64CodecMiddleware } from "./middlewares/base64-codec.mw";
import { codeIndentFixerMiddleware } from "./middlewares/code-indent-fixer.mw";
import { colorConverterMiddleware } from "./middlewares/color-converter.mw";
import { duplicateLineRemoverMiddleware } from "./middlewares/duplicate-line-remover.mw";
import { emailCleanerMiddleware } from "./middlewares/email-cleaner.mw";
import { htmlStripperMiddleware } from "./middlewares/html-stripper.mw";
import { jsonFormatterMiddleware } from "./middlewares/json-formatter.mw";
import { lineBreakFixerMiddleware } from "./middlewares/line-break-fixer.mw";
import { markdownCleanerMiddleware } from "./middlewares/markdown-cleaner.mw";
import { mathEvaluatorMiddleware } from "./middlewares/math-evaluator.mw";
import { pathConverterMiddleware } from "./middlewares/path-converter.mw";
import { phoneNormalizerMiddleware } from "./middlewares/phone-normalizer.mw";
import { regexTransformerMiddleware } from "./middlewares/regex-transformer.mw";
import { symbolStripperMiddleware } from "./middlewares/symbol-stripper.mw";
import { tableConverterMiddleware } from "./middlewares/table-converter.mw";
import { timestampConverterMiddleware } from "./middlewares/timestamp-converter.mw";
import { unicodeCleanerMiddleware } from "./middlewares/unicode-cleaner.mw";
import { urlCleanerMiddleware } from "./middlewares/url-cleaner.mw";
import { whitespaceNormalizerMiddleware } from "./middlewares/whitespace-normalizer.mw";
import { PipelineMiddleware } from "./types";

export function getDefaultMiddlewares(): PipelineMiddleware[] {
  return [
    unicodeCleanerMiddleware, // always first — safety net for all types
    htmlStripperMiddleware, // styled_html, structured_html
    lineBreakFixerMiddleware, // pdf_text
    codeIndentFixerMiddleware, // source_code — fix mixed indentation
    tableConverterMiddleware, // html_table, csv_table, tsv_table
    jsonFormatterMiddleware, // json_data, yaml_data, toml_data — pretty-print
    emailCleanerMiddleware, // email_text
    urlCleanerMiddleware, // url_text, text_with_links
    phoneNormalizerMiddleware, // phone_number
    timestampConverterMiddleware, // date_text — convert timestamps
    pathConverterMiddleware, // path_text — Win↔Unix path conversion
    colorConverterMiddleware, // color_code — output all color formats
    mathEvaluatorMiddleware, // math_expression — append = result
    markdownCleanerMiddleware, // md_text
    base64CodecMiddleware, // plain_text — decode base64 content
    duplicateLineRemoverMiddleware, // plain_text, email_text, pdf_text
    whitespaceNormalizerMiddleware, // prose types (skips code/data)
    symbolStripperMiddleware, // plain_text, email_text
    regexTransformerMiddleware, // user-defined regex rules
    aiRewriterMiddleware, // AI features (last)
  ];
}

export function createDefaultPipelineRunner(
  pluginMiddlewares: PipelineMiddleware[] = [],
): PipelineRunner {
  return new PipelineRunner([...getDefaultMiddlewares(), ...pluginMiddlewares]);
}
