import { cleanUrl, cleanUrlsInText } from "../../url-cleaner";
import { PipelineMiddleware } from "../types";

/**
 * url-cleaner middleware
 *
 * Strips tracking parameters (utm_*, fbclid, gclid, etc.) from URLs.
 * - url_text: clean the entire input as a single URL
 * - text_with_links: find and clean all embedded URLs in-place
 */

export const urlCleanerMiddleware: PipelineMiddleware = {
    id: "url-cleaner",
    supports: (ctx) =>
        ctx.detectedType === "url_text" || ctx.detectedType === "text_with_links",
    run: (input, ctx) => {
        if (ctx.detectedType === "url_text") {
            return cleanUrl(input);
        }
        return cleanUrlsInText(input);
    },
};
