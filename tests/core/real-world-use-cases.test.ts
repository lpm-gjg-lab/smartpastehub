import { describe, expect, it, vi } from "vitest";

vi.mock("electron", () => ({
  app: { getPath: () => "./.logs" },
}));

import { cleanContent } from "../../src/core/cleaner";

describe("real-world copy/paste use cases", () => {
  it("cleans PDF-style wrapped lines into readable prose", async () => {
    const text = [
      "Copy dari PDF sering bikin",
      "teks jadi patah baris",
      "dan sulit dibaca ulang",
      "kalau langsung di paste",
    ].join("\n");

    const result = await cleanContent({ text }, { skipSensitiveScan: true });

    expect(result.cleaned).toContain(
      "Copy dari PDF sering bikin teks jadi patah baris",
    );
    expect(result.appliedTransforms).toContain("line-break-fixer");
  });

  it("strips Outlook-style quoted reply block and keeps main email body", async () => {
    const text = [
      "Hi tim,",
      "",
      "Mohon review update terbaru.",
      "",
      "On Fri, 10 Jan 2025 at 09:30, John Doe <john@example.com> wrote:",
      "> Versi lama ada di bawah",
      "> Tolong cek lagi",
      "",
      "Regards,",
      "Rhazes",
    ].join("\n");

    const result = await cleanContent({ text }, { skipSensitiveScan: true });

    expect(result.cleaned).toContain("Mohon review update terbaru.");
    expect(result.cleaned).not.toContain("On Fri, 10 Jan 2025");
    expect(result.cleaned).not.toContain("> Versi lama ada di bawah");
    expect(result.appliedTransforms).toContain("email-cleaner");
  });

  it("pretty-prints minified JSON", async () => {
    const text =
      '{"user":{"name":"Rhazes","roles":["admin","editor"]},"active":true}';

    const result = await cleanContent({ text }, { skipSensitiveScan: true });

    expect(result.cleaned).toContain("\n");
    expect(result.cleaned).toContain('"user": {');
    expect(result.cleaned).toContain('"active": true');
    expect(result.appliedTransforms).toContain("json-formatter");
  });

  it("removes tracking params from marketing URLs", async () => {
    const text =
      "https://example.com/page?utm_source=newsletter&utm_medium=email&fbclid=abc123&id=42";

    const result = await cleanContent({ text }, { skipSensitiveScan: true });

    expect(result.cleaned).toContain("id=42");
    expect(result.cleaned).not.toContain("utm_source");
    expect(result.cleaned).not.toContain("utm_medium");
    expect(result.cleaned).not.toContain("fbclid");
    expect(result.appliedTransforms).toContain("url-cleaner");
  });

  it("converts web HTML content into clean readable text", async () => {
    const result = await cleanContent(
      {
        text: "fallback text",
        html: [
          "<h2>Laporan</h2>",
          "<p><strong>Bold</strong> dan <em>italic</em> text</p>",
          '<p><a href="https://example.com">Buka link</a></p>',
        ].join(""),
      },
      { skipSensitiveScan: true },
    );

    expect(result.cleaned).toContain("Laporan");
    expect(result.cleaned).toContain("**Bold**");
    expect(result.cleaned).toContain("[Buka link](https://example.com)");
    expect(result.cleaned).not.toContain("<strong>");
    expect(result.appliedTransforms).toContain("html-stripper");
  });

  it("preserves source-code whitespace (no prose whitespace normalization)", async () => {
    const text = [
      "function greet(name) {",
      "  const message = `Hello, ${name}`;",
      "  return message;",
      "}",
    ].join("\n");

    const result = await cleanContent({ text }, { skipSensitiveScan: true });

    expect(result.cleaned).toBe(text);
    expect(result.appliedTransforms).not.toContain("whitespace-normalizer");
  });

  it("fixes common Unicode paste artifacts", async () => {
    const text = "Halo\u00A0dunia\u200B, ini mojibake: caf\u00c3\u00a9";

    const result = await cleanContent({ text }, { skipSensitiveScan: true });

    expect(result.cleaned).toContain("Halo dunia");
    expect(result.cleaned).toContain("caf\u00e9");
    expect(result.cleaned).not.toContain("\u00A0");
    expect(result.cleaned).not.toContain("\u200B");
    expect(result.cleaned).not.toContain("caf\u00c3\u00a9");
    expect(result.appliedTransforms).toContain("unicode-cleaner");
  });
});
