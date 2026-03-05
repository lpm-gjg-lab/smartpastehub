import { normalizePhone } from "../../phone-normalizer";
import { PipelineMiddleware } from "../types";

/**
 * phone-normalizer middleware
 *
 * Normalizes phone numbers into a consistent, readable format.
 * Indonesian numbers (08xx) are converted to international (+62 8xx) format.
 * Only active for phone_number content type.
 */

export const phoneNormalizerMiddleware: PipelineMiddleware = {
    id: "phone-normalizer",
    supports: (ctx) => ctx.detectedType === "phone_number",
    run: (input) => normalizePhone(input),
};
