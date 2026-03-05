import { cleanMarkdown } from "../../markdown-cleaner";
import { PipelineMiddleware } from "../types";

/**
 * markdown-cleaner middleware
 *
 * Normalizes Markdown formatting: consistent list markers, heading spacing,
 * horizontal rules, and whitespace cleanup.
 * Only active for md_text content type.
 */

export const markdownCleanerMiddleware: PipelineMiddleware = {
    id: "markdown-cleaner",
    supports: (ctx) => ctx.detectedType === "md_text",
    run: (input) => cleanMarkdown(input),
};
