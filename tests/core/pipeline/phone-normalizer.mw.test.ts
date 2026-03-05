import { describe, expect, it } from "vitest";
import { phoneNormalizerMiddleware } from "../../../src/core/pipeline/middlewares/phone-normalizer.mw";
import { PipelineContext } from "../../../src/core/pipeline/types";

function ctx(
    detectedType: PipelineContext["detectedType"],
): PipelineContext {
    return { content: { text: "" }, detectedType };
}

describe("phone-normalizer middleware", () => {
    // ── supports ───────────────────────────────────────────────────────────────
    it("is active for phone_number", () => {
        expect(phoneNormalizerMiddleware.supports(ctx("phone_number"))).toBe(true);
    });

    it("is NOT active for plain_text", () => {
        expect(phoneNormalizerMiddleware.supports(ctx("plain_text"))).toBe(false);
    });

    it("is NOT active for email_text", () => {
        expect(phoneNormalizerMiddleware.supports(ctx("email_text"))).toBe(false);
    });

    // ── Indonesian numbers ────────────────────────────────────────────────────
    it("normalizes 08xx to +62 format", async () => {
        const input = "081234567890";
        const result = await phoneNormalizerMiddleware.run(input, ctx("phone_number"));
        expect(result).toBe("+62 812 3456 7890");
    });

    it("normalizes 08xx with dashes", async () => {
        const input = "0812-3456-7890";
        const result = await phoneNormalizerMiddleware.run(input, ctx("phone_number"));
        expect(result).toBe("+62 812 3456 7890");
    });

    it("normalizes 08xx with spaces", async () => {
        const input = "0812 3456 7890";
        const result = await phoneNormalizerMiddleware.run(input, ctx("phone_number"));
        expect(result).toBe("+62 812 3456 7890");
    });

    it("normalizes 62 prefix without +", async () => {
        const input = "6281234567890";
        const result = await phoneNormalizerMiddleware.run(input, ctx("phone_number"));
        expect(result).toBe("+62 812 3456 7890");
    });

    // ── International numbers ─────────────────────────────────────────────────
    it("normalizes +62 format (already international)", async () => {
        const input = "+62 812-3456-7890";
        const result = await phoneNormalizerMiddleware.run(input, ctx("phone_number"));
        expect(result).toBe("+62 812 3456 7890");
    });

    it("normalizes +1 US number", async () => {
        const input = "+1 (555) 123-4567";
        const result = await phoneNormalizerMiddleware.run(input, ctx("phone_number"));
        expect(result).toContain("+1");
        expect(result).not.toContain("(");
        expect(result).not.toContain(")");
    });

    it("normalizes +44 UK number", async () => {
        const input = "+44 20 7946 0958";
        const result = await phoneNormalizerMiddleware.run(input, ctx("phone_number"));
        expect(result).toContain("+44");
    });

    // ── Edge cases ────────────────────────────────────────────────────────────
    it("does not modify numbers too short to be phones", async () => {
        const input = "12345";
        const result = await phoneNormalizerMiddleware.run(input, ctx("phone_number"));
        expect(result).toBe("12345");
    });

    it("handles numbers with parentheses and dots", async () => {
        const input = "(021) 555.1234";
        const result = await phoneNormalizerMiddleware.run(input, ctx("phone_number"));
        expect(result).toContain("+62");
        expect(result).not.toContain("(");
        expect(result).not.toContain(".");
    });
});
