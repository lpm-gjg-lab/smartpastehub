import { detectSensitiveData } from "../../../security/sensitive-detector";
import { maskData } from "../../../security/data-masker";
import { PipelineMiddleware } from "../types";

/**
 * sensitive-masker middleware
 *
 * Detects PII (emails, phone numbers, NIK, credit cards, API keys, etc.)
 * and masks them before pasting. Uses existing sensitive-detector + data-masker
 * modules from the security layer.
 *
 * Active for all content types — acts as a safety net at the end of the pipeline
 * (before regex-transformer and ai-rewriter).
 *
 * Uses "partial" masking by default: keeps first/last 20% of characters visible.
 * Example: "user@example.com" → "u***@*****e.com"
 */

export const sensitiveMaskerMiddleware: PipelineMiddleware = {
  id: "sensitive-masker",
  supports: () => false, // opt-in only — cleanContent() has its own security detection
  run: (input) => {
    const matches = detectSensitiveData(input);
    if (matches.length === 0) return input;
    return maskData(input, matches, "partial");
  },
};
