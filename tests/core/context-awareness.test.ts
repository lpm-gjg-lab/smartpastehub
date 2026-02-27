import { describe, expect, it } from "vitest";
import {
  buildRichClipboardHtml,
  detectFormattingIntent,
} from "../../src/core/context-awareness";

describe("context awareness formatting intent", () => {
  it("chooses rich text for list-like html in editor targets", () => {
    const intent = detectFormattingIntent({
      detectedType: "structured_html",
      cleanedText: "1. First\n2. Second",
      sourceHtml: "<ol><li>First</li><li>Second</li></ol>",
      targetAppType: "editor",
      targetAppName: "WINWORD.EXE",
      aiRewritten: false,
    });

    expect(intent).toBe("rich_text");
  });

  it("keeps plain text for terminal targets", () => {
    const intent = detectFormattingIntent({
      detectedType: "structured_html",
      cleanedText: "- one\n- two",
      sourceHtml: "<ul><li>one</li><li>two</li></ul>",
      targetAppType: "terminal",
      targetAppName: "WindowsTerminal.exe",
      aiRewritten: false,
    });

    expect(intent).toBe("plain_text");
  });

  it("keeps plain text when AI rewrite has changed content", () => {
    const intent = detectFormattingIntent({
      detectedType: "md_text",
      cleanedText: "1. Improved line",
      sourceHtml: "",
      targetAppType: "editor",
      targetAppName: "Notion.exe",
      aiRewritten: true,
    });

    expect(intent).toBe("rich_text");
  });

  it("keeps plain text for code/data use cases", () => {
    const intent = detectFormattingIntent({
      detectedType: "source_code",
      cleanedText: "const x = 1;",
      sourceHtml: "<pre><code>const x = 1;</code></pre>",
      targetAppType: "editor",
      targetAppName: "VSCode.exe",
      aiRewritten: false,
    });

    expect(intent).toBe("plain_text");
  });

  it("keeps plain text for explicitly plain-friendly apps", () => {
    const intent = detectFormattingIntent({
      detectedType: "structured_html",
      cleanedText: "1. a\n2. b",
      sourceHtml: "<ol><li>a</li><li>b</li></ol>",
      targetAppType: "editor",
      targetAppName: "notepad.exe",
      aiRewritten: false,
    });

    expect(intent).toBe("plain_text");
  });
});

describe("context awareness rich html builder", () => {
  it("renders markdown list to rich html", () => {
    const html = buildRichClipboardHtml("- item one\n- item two");

    expect(html).toContain("<ul>");
    expect(html).toContain("<li>");
  });

  it("sanitizes script content from source html fallback", () => {
    const html = buildRichClipboardHtml(
      "",
      "<div>Hello</div><script>alert('x')</script>",
    );

    expect(html).toContain("Hello");
    expect(html).not.toContain("<script");
  });
});
