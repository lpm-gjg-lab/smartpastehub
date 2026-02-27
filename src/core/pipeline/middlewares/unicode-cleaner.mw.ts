import { cleanUnicode, cleanUnicodeForCode } from "../../unicode-cleaner";
import { PipelineMiddleware } from "../types";

/**
 * unicode-cleaner middleware
 *
 * Runs on ALL content types as a first-pass sanitizer:
 *   - source_code / json / yaml / toml  → cleanUnicodeForCode (no ligature expansion,
 *     fullwidth normalization enabled, smart quotes straightened)
 *   - everything else                   → cleanUnicode with prose-safe defaults
 *     (mojibake fix, NBSP, CRLF, zero-width, soft-hyphen)
 *
 * This middleware always runs — it is a safety net, not a transform.
 * It is intentionally placed BEFORE all other middlewares.
 */

const CODE_TYPES = new Set([
  "source_code",
  "json_data",
  "yaml_data",
  "toml_data",
]);

export const unicodeCleanerMiddleware: PipelineMiddleware = {
  id: "unicode-cleaner",
  supports: () => true, // always run
  run: (input, ctx) => {
    if (CODE_TYPES.has(ctx.detectedType)) {
      return cleanUnicodeForCode(input);
    }
    return cleanUnicode(input);
  },
};
