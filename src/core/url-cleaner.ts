/**
 * url-cleaner.ts
 *
 * Strips tracking parameters and noise from URLs that are commonly added by
 * marketing platforms, analytics tools, and social media redirects.
 *
 * Tracking params removed:
 *  - Google Analytics: utm_source, utm_medium, utm_campaign, utm_term, utm_content, _ga, gclid
 *  - Facebook: fbclid, fb_action_ids, fb_action_types, fb_ref
 *  - Mailchimp: mc_cid, mc_eid
 *  - HubSpot: _hsenc, _hsmi, hsa_*
 *  - General: ref, source (when clearly tracking), __s, __hs*, trk, mkt_tok
 *
 * Preserves:
 *  - All functional query params (e.g. q=, page=, id=, token=, etc.)
 *  - Fragment (#anchors)
 *  - Protocol and path
 */

/** Tracking parameter prefixes and exact names to strip */
const TRACKING_PARAMS = new Set([
    // Google Analytics / Ads
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "utm_id",
    "_ga",
    "gclid",
    "gclsrc",
    "dclid",
    // Facebook / Meta
    "fbclid",
    "fb_action_ids",
    "fb_action_types",
    "fb_ref",
    "fb_source",
    // Twitter / X
    "twclid",
    // Microsoft / Bing
    "msclkid",
    // Mailchimp
    "mc_cid",
    "mc_eid",
    // HubSpot
    "_hsenc",
    "_hsmi",
    // General marketing / newsletter
    "__s",
    "mkt_tok",
    "trk",
    // Misc attribution
    "igshid",       // Instagram
    "si",           // YouTube Share
    "feature",      // YouTube feature=share
    "ref_",
    "ref_src",
    "ref_url",
]);

/** Prefixes that should also be stripped (hsa_*, yclid*, etc.) */
const TRACKING_PREFIXES = ["hsa_", "yclid", "__hs"];

function isTrackingParam(key: string): boolean {
    const lower = key.toLowerCase();
    if (TRACKING_PARAMS.has(lower)) return true;
    return TRACKING_PREFIXES.some((prefix) => lower.startsWith(prefix));
}

/**
 * Clean a single URL string by removing tracking parameters.
 * Returns the cleaned URL, or the original if parsing fails.
 */
export function cleanUrl(rawUrl: string): string {
    const trimmed = rawUrl.trim();
    try {
        const url = new URL(trimmed);

        // Remove tracking params
        const keysToDelete: string[] = [];
        url.searchParams.forEach((_, key) => {
            if (isTrackingParam(key)) {
                keysToDelete.push(key);
            }
        });
        for (const key of keysToDelete) {
            url.searchParams.delete(key);
        }

        // Rebuild — URL toString() always includes trailing slash for bare domains.
        // We keep it as-is (consistent behavior).
        let result = url.toString();

        // If query string is now empty, strip the trailing ?
        if (url.search === "?") {
            result = result.replace(/\?$/, "");
        }

        return result;
    } catch {
        // Not a valid URL — return as-is
        return trimmed;
    }
}

/**
 * Clean URLs that are embedded within a block of text.
 * Finds all http(s):// URLs and cleans each one in-place.
 */
export function cleanUrlsInText(text: string): string {
    // Match http/https URLs (greedy but stop at whitespace or common delimiters)
    return text.replace(
        /https?:\/\/[^\s<>"')\]]+/g,
        (match) => cleanUrl(match),
    );
}
