import { describe, expect, it } from "vitest";
import { markdownCleanerMiddleware } from "../../../src/core/pipeline/middlewares/markdown-cleaner.mw";
import { PipelineContext } from "../../../src/core/pipeline/types";

function ctx(
    detectedType: PipelineContext["detectedType"],
): PipelineContext {
    return { content: { text: "" }, detectedType };
}

describe("markdown-cleaner middleware", () => {
    // ── supports ───────────────────────────────────────────────────────────────
    it("is active for md_text", () => {
        expect(markdownCleanerMiddleware.supports(ctx("md_text"))).toBe(true);
    });

    it("is NOT active for plain_text", () => {
        expect(markdownCleanerMiddleware.supports(ctx("plain_text"))).toBe(false);
    });

    it("is NOT active for source_code", () => {
        expect(markdownCleanerMiddleware.supports(ctx("source_code"))).toBe(false);
    });

    // ── list marker normalization ─────────────────────────────────────────────
    it("normalizes * list markers to -", async () => {
        const input = "* Item one\n* Item two\n* Item three";
        const result = await markdownCleanerMiddleware.run(input, ctx("md_text"));
        expect(result).toContain("- Item one");
        expect(result).toContain("- Item two");
        expect(result).toContain("- Item three");
    });

    it("normalizes + list markers to -", async () => {
        const input = "+ First\n+ Second";
        const result = await markdownCleanerMiddleware.run(input, ctx("md_text"));
        expect(result).toContain("- First");
        expect(result).toContain("- Second");
    });

    it("preserves indented list markers", async () => {
        const input = "  * Nested item";
        const result = await markdownCleanerMiddleware.run(input, ctx("md_text"));
        expect(result).toContain("  - Nested item");
    });

    // ── heading spacing ───────────────────────────────────────────────────────
    it("fixes heading spacing: ##Title → ## Title", async () => {
        const input = "##My Heading";
        const result = await markdownCleanerMiddleware.run(input, ctx("md_text"));
        expect(result).toBe("## My Heading");
    });

    it("does not double-space correct headings", async () => {
        const input = "## Already Correct";
        const result = await markdownCleanerMiddleware.run(input, ctx("md_text"));
        expect(result).toBe("## Already Correct");
    });

    // ── blank line before headings ────────────────────────────────────────────
    it("adds blank line before heading when missing", async () => {
        const input = "Some paragraph text.\n## Heading";
        const result = await markdownCleanerMiddleware.run(input, ctx("md_text"));
        expect(result).toBe("Some paragraph text.\n\n## Heading");
    });

    it("does not add extra blank line if already present", async () => {
        const input = "Some text.\n\n## Heading";
        const result = await markdownCleanerMiddleware.run(input, ctx("md_text"));
        expect(result).toBe("Some text.\n\n## Heading");
    });

    // ── horizontal rule normalization ─────────────────────────────────────────
    it("normalizes *** to ---", async () => {
        const input = "Above\n\n***\n\nBelow";
        const result = await markdownCleanerMiddleware.run(input, ctx("md_text"));
        expect(result).toContain("---");
        expect(result).not.toContain("***");
    });

    it("normalizes ___ to ---", async () => {
        const input = "___";
        const result = await markdownCleanerMiddleware.run(input, ctx("md_text"));
        expect(result).toBe("---");
    });

    // ── trailing whitespace ───────────────────────────────────────────────────
    it("strips trailing whitespace from lines", async () => {
        const input = "Line one   \nLine two\t\t";
        const result = await markdownCleanerMiddleware.run(input, ctx("md_text"));
        expect(result).toBe("Line one\nLine two");
    });

    // ── blank line collapse ───────────────────────────────────────────────────
    it("collapses 3+ blank lines into 2", async () => {
        const input = "Para one\n\n\n\n\nPara two";
        const result = await markdownCleanerMiddleware.run(input, ctx("md_text"));
        expect(result).toBe("Para one\n\nPara two");
    });

    // ── does not break valid markdown ─────────────────────────────────────────
    it("preserves bold and italic markers", async () => {
        const input = "This is **bold** and *italic* text.";
        const result = await markdownCleanerMiddleware.run(input, ctx("md_text"));
        expect(result).toContain("**bold**");
        expect(result).toContain("*italic*");
    });

    it("preserves code blocks", async () => {
        const input = "```js\nconst x = 1;\n```";
        const result = await markdownCleanerMiddleware.run(input, ctx("md_text"));
        expect(result).toContain("```js");
        expect(result).toContain("const x = 1;");
        expect(result).toContain("```");
    });
});
