import { normalizeWhitespace } from "../../whitespace-normalizer";
import { PipelineMiddleware } from "../types";

const transformedTypes = new Set([
  "styled_html",
  "structured_html",
  "pdf_text",
  "html_table",
  "csv_table",
  "tsv_table",
  "md_text",
  // Passthrough types — must not be touched by whitespace normalization
  "source_code",
  "json_data",
  "yaml_data",
  "toml_data",
]);

export const whitespaceNormalizerMiddleware: PipelineMiddleware = {
  id: "whitespace-normalizer",
  supports: (ctx) => !transformedTypes.has(ctx.detectedType),
  run: (input) => normalizeWhitespace(input),
};
