import { describe, expect, it, vi } from "vitest";
import { fixLineBreaks } from "../../src/core/line-break-fixer";
import { stripHTML } from "../../src/core/html-stripper";
import { normalizeWhitespace } from "../../src/core/whitespace-normalizer";
import {
  parseCSV,
  parseHTMLTable,
  parseTSV,
  toMarkdown,
} from "../../src/core/table-converter";
import { cleanContent } from "../../src/core/cleaner";
import { PipelineRunner } from "../../src/core/pipeline/pipeline-runner";
import { createDefaultPipelineRunner } from "../../src/core/pipeline/default-pipeline";
import { PipelineMiddleware } from "../../src/core/pipeline/types";

describe("Pipeline runner", () => {
  it("runs middlewares in declared order deterministically", async () => {
    const order: string[] = [];
    const mwA: PipelineMiddleware = {
      id: "a",
      supports: () => true,
      run: (input) => {
        order.push("a");
        return `${input}-a`;
      },
    };
    const mwB: PipelineMiddleware = {
      id: "b",
      supports: () => true,
      run: (input) => {
        order.push("b");
        return `${input}-b`;
      },
    };

    const runner = new PipelineRunner([mwA, mwB]);
    const result = await runner.run("x", {
      content: { text: "x" },
      detectedType: "plain_text",
    });

    expect(order).toEqual(["a", "b"]);
    expect(result.cleaned).toBe("x-a-b");
    expect(result.appliedTransforms).toEqual(["a", "b"]);
  });

  it("applies optional regex and ai middleware after base transforms", async () => {
    const runner = createDefaultPipelineRunner();
    const aiRewrite = vi.fn(async (text: string) => `${text} [ai]`);

    const result = await runner.run("hello   world", {
      content: { text: "hello   world" },
      detectedType: "plain_text",
      enableRegexTransforms: true,
      regexRules: [{ pattern: "world", replacement: "team" }],
      enableAiRewrite: true,
      aiRewrite,
    });

    expect(result.cleaned).toBe("hello team [ai]");
    expect(result.appliedTransforms).toEqual([
      "unicode-cleaner",
      "whitespace-normalizer",
      "regex-transformer",
      "ai-rewriter",
    ]);
  });

  it("propagates middleware errors to caller", async () => {
    const runner = new PipelineRunner([
      {
        id: "boom",
        supports: () => true,
        run: () => {
          throw new Error("pipeline-failure");
        },
      },
    ]);

    await expect(
      runner.run("x", {
        content: { text: "x" },
        detectedType: "plain_text",
      }),
    ).rejects.toThrow("pipeline-failure");
  });
});

describe("Cleaner compatibility", () => {
  it("keeps html cleaning behavior parity", async () => {
    const content = {
      text: "Bold text",
      html: "<b>Bold</b> <span style='color:red'>text</span>",
    };

    const result = await cleanContent(content);
    const expected = stripHTML(content.html, {
      keepBold: true,
      keepItalic: true,
      keepLists: true,
      keepLinks: true,
      keepHeadings: true,
      keepLineBreaks: true,
    });

    expect(result.cleaned).toBe(expected);
    expect(result.appliedTransforms).toEqual(["unicode-cleaner", "html-stripper"]);
  });

  it("keeps pdf line-break fixing behavior parity", async () => {
    const text = [
      "This is a wrapped line",
      "that should be joined",
      "another short wrapped line",
      "continues here",
      "final line without punctuation",
    ].join("\n");
    const result = await cleanContent({ text });

    expect(result.cleaned).toBe(fixLineBreaks(text));
    expect(result.appliedTransforms).toEqual(["unicode-cleaner", "line-break-fixer"]);
  });

  it("keeps csv table conversion parity", async () => {
    const text = "name,score\nA,10\nB,11";
    const result = await cleanContent({ text });

    expect(result.cleaned).toBe(toMarkdown(parseCSV(text)));
    expect(result.appliedTransforms).toEqual(["unicode-cleaner", "table-converter"]);
  });

  it("keeps tsv table conversion parity", async () => {
    const text = "name\tscore\nA\t10\nB\t11";
    const result = await cleanContent({ text });

    expect(result.cleaned).toBe(toMarkdown(parseTSV(text)));
    expect(result.appliedTransforms).toEqual(["unicode-cleaner", "table-converter"]);
  });

  it("keeps html table conversion parity", async () => {
    const html =
      "<table><tr><th>name</th><th>score</th></tr><tr><td>A</td><td>10</td></tr></table>";
    const result = await cleanContent({ text: "fallback", html });

    expect(result.cleaned).toBe(toMarkdown(parseHTMLTable(html)));
    expect(result.appliedTransforms).toEqual(["unicode-cleaner", "table-converter"]);
  });

  it("keeps default whitespace normalization parity", async () => {
    const text = "Some text   with   extra  spaces";
    const result = await cleanContent({ text });

    expect(result.cleaned).toBe(normalizeWhitespace(text));
    expect(result.appliedTransforms).toEqual(["unicode-cleaner", "whitespace-normalizer"]);
  });
});
