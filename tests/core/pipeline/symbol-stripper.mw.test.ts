import { describe, expect, it } from "vitest";
import { symbolStripperMiddleware } from "../../../src/core/pipeline/middlewares/symbol-stripper.mw";
import { PipelineContext } from "../../../src/core/pipeline/types";

function ctx(
    detectedType: PipelineContext["detectedType"],
): PipelineContext {
    return { content: { text: "" }, detectedType };
}

describe("symbol-stripper middleware", () => {
    // ── supports ───────────────────────────────────────────────────────────────
    it("is active for plain_text", () => {
        expect(symbolStripperMiddleware.supports(ctx("plain_text"))).toBe(true);
    });

    it("is active for email_text", () => {
        expect(symbolStripperMiddleware.supports(ctx("email_text"))).toBe(true);
    });

    it("is NOT active for source_code", () => {
        expect(symbolStripperMiddleware.supports(ctx("source_code"))).toBe(false);
    });

    it("is NOT active for md_text", () => {
        expect(symbolStripperMiddleware.supports(ctx("md_text"))).toBe(false);
    });

    it("is NOT active for html types", () => {
        expect(symbolStripperMiddleware.supports(ctx("styled_html"))).toBe(false);
        expect(symbolStripperMiddleware.supports(ctx("structured_html"))).toBe(false);
    });

    // ── box-drawing removal ────────────────────────────────────────────────────
    it("removes box-drawing prefix from lines (like the screenshot)", async () => {
        const input = "│  hello world\n│  foo bar";
        const result = await symbolStripperMiddleware.run(input, ctx("plain_text"));
        expect(result).not.toContain("│");
        expect(result).toContain("hello world");
        expect(result).toContain("foo bar");
    });

    it("removes various box-drawing chars", async () => {
        const input = "┌─────┐\n│ hey │\n└─────┘";
        const result = await symbolStripperMiddleware.run(input, ctx("plain_text"));
        expect(result).not.toMatch(/[\u2500-\u257F]/);
        expect(result).toContain("hey");
    });

    // ── block elements ─────────────────────────────────────────────────────────
    it("removes block element characters", async () => {
        const input = "█▓▒░ loading ░▒▓█";
        const result = await symbolStripperMiddleware.run(input, ctx("plain_text"));
        expect(result).not.toMatch(/[\u2580-\u259F]/);
        expect(result).toContain("loading");
    });

    // ── geometric shapes ───────────────────────────────────────────────────────
    it("removes geometric shape chars", async () => {
        const input = "◆ item one\n◇ item two";
        const result = await symbolStripperMiddleware.run(input, ctx("plain_text"));
        expect(result).not.toMatch(/[\u25A0-\u25FF]/);
    });

    it("preserves bullet • (U+2022)", async () => {
        const input = "• First item\n• Second item";
        const result = await symbolStripperMiddleware.run(input, ctx("plain_text"));
        expect(result).toContain("•");
        expect(result).toContain("First item");
        expect(result).toContain("Second item");
    });

    // ── dingbats ───────────────────────────────────────────────────────────────
    it("removes decorative dingbat ornaments", async () => {
        const input = "✦ fancy heading ✦";
        const result = await symbolStripperMiddleware.run(input, ctx("plain_text"));
        expect(result).not.toContain("✦");
        expect(result).toContain("fancy heading");
    });

    it("preserves checkmark ✓ and ballot X ✗", async () => {
        const input = "✓ done\n✗ not done";
        const result = await symbolStripperMiddleware.run(input, ctx("plain_text"));
        expect(result).toContain("✓");
        expect(result).toContain("✗");
    });

    // ── normal text untouched ─────────────────────────────────────────────────
    it("does not change normal letters, numbers, and punctuation", async () => {
        const input = "Hello, World! 123. Ready? Yes: always.";
        const result = await symbolStripperMiddleware.run(input, ctx("plain_text"));
        expect(result).toBe(input);
    });

    it("does not strip emoji", async () => {
        const input = "Great job 🎉 well done 👍";
        const result = await symbolStripperMiddleware.run(input, ctx("plain_text"));
        expect(result).toContain("🎉");
        expect(result).toContain("👍");
    });
});
