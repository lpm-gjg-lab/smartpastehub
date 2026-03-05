import { describe, expect, it } from "vitest";
import { urlCleanerMiddleware } from "../../../src/core/pipeline/middlewares/url-cleaner.mw";
import { PipelineContext } from "../../../src/core/pipeline/types";

function ctx(
    detectedType: PipelineContext["detectedType"],
): PipelineContext {
    return { content: { text: "" }, detectedType };
}

describe("url-cleaner middleware", () => {
    // ── supports ───────────────────────────────────────────────────────────────
    it("is active for url_text", () => {
        expect(urlCleanerMiddleware.supports(ctx("url_text"))).toBe(true);
    });

    it("is active for text_with_links", () => {
        expect(urlCleanerMiddleware.supports(ctx("text_with_links"))).toBe(true);
    });

    it("is NOT active for plain_text", () => {
        expect(urlCleanerMiddleware.supports(ctx("plain_text"))).toBe(false);
    });

    // ── single URL cleaning ────────────────────────────────────────────────────
    it("strips utm_* params from a URL", async () => {
        const input = "https://example.com/page?utm_source=twitter&utm_medium=social&id=123";
        const result = await urlCleanerMiddleware.run(input, ctx("url_text"));
        expect(result).toContain("id=123");
        expect(result).not.toContain("utm_source");
        expect(result).not.toContain("utm_medium");
    });

    it("strips fbclid from a URL", async () => {
        const input = "https://example.com/article?fbclid=abc123def456";
        const result = await urlCleanerMiddleware.run(input, ctx("url_text"));
        expect(result).not.toContain("fbclid");
        expect(result).toContain("example.com/article");
    });

    it("strips gclid from a URL", async () => {
        const input = "https://shop.com/product?gclid=xyz&color=red";
        const result = await urlCleanerMiddleware.run(input, ctx("url_text"));
        expect(result).not.toContain("gclid");
        expect(result).toContain("color=red");
    });

    it("preserves functional query params", async () => {
        const input = "https://example.com/search?q=hello+world&page=2";
        const result = await urlCleanerMiddleware.run(input, ctx("url_text"));
        expect(result).toBe(input);
    });

    it("preserves URL without tracking params", async () => {
        const input = "https://example.com/about";
        const result = await urlCleanerMiddleware.run(input, ctx("url_text"));
        expect(result).toContain("example.com/about");
    });

    it("strips YouTube si param", async () => {
        const input = "https://youtu.be/dQw4w9WgXcQ?si=abc123tracking";
        const result = await urlCleanerMiddleware.run(input, ctx("url_text"));
        expect(result).not.toContain("si=");
        expect(result).toContain("dQw4w9WgXcQ");
    });

    // ── text_with_links ────────────────────────────────────────────────────────
    it("cleans URLs embedded in text", async () => {
        const input = "Check this out: https://blog.com/post?utm_source=newsletter&id=42 and let me know!";
        const result = await urlCleanerMiddleware.run(input, ctx("text_with_links"));
        expect(result).toContain("id=42");
        expect(result).not.toContain("utm_source");
        expect(result).toContain("Check this out:");
        expect(result).toContain("and let me know!");
    });

    it("cleans multiple URLs in text", async () => {
        const input = "Link 1: https://a.com?fbclid=x Link 2: https://b.com?gclid=y";
        const result = await urlCleanerMiddleware.run(input, ctx("text_with_links"));
        expect(result).not.toContain("fbclid");
        expect(result).not.toContain("gclid");
    });

    // ── edge cases ─────────────────────────────────────────────────────────────
    it("handles invalid URL gracefully", async () => {
        const input = "not-a-url-at-all";
        const result = await urlCleanerMiddleware.run(input, ctx("url_text"));
        expect(result).toBe("not-a-url-at-all");
    });
});
