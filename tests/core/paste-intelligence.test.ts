import { describe, expect, it } from "vitest";
import {
  applyExplicitPasteFeedback,
  learnPasteStrategyFeedback,
  planPasteStrategy,
} from "../../src/core/paste-intelligence";

describe("paste intelligence strategy", () => {
  it("prefers rich strategy for document apps with structured lists", () => {
    const decision = planPasteStrategy({
      detectedType: "structured_html",
      cleanedText: "1. First\n2. Second",
      sourceHtml: "<ol><li>First</li><li>Second</li></ol>",
      targetAppType: "editor",
      targetAppName: "WINWORD.EXE",
      aiRewritten: false,
      baselineIntent: "rich_text",
      autoLearnedRules: [],
    });

    expect(decision.intent).toBe("rich_text");
    expect(decision.policyPack).toBe("document-rich");
    expect(decision.confidence).toBeGreaterThan(0.2);
  });

  it("prefers plain strategy for terminal apps", () => {
    const decision = planPasteStrategy({
      detectedType: "md_text",
      cleanedText: "- one\n- two",
      sourceHtml: "<ul><li>one</li><li>two</li></ul>",
      targetAppType: "terminal",
      targetAppName: "WindowsTerminal.exe",
      aiRewritten: false,
      baselineIntent: "rich_text",
      autoLearnedRules: [],
    });

    expect(decision.intent).toBe("plain_text");
    expect(decision.policyPack).toBe("terminal-safe");
  });

  it("respects learned format bias", () => {
    const decision = planPasteStrategy({
      detectedType: "md_text",
      cleanedText: "- item a\n- item b",
      sourceHtml: "",
      targetAppType: "editor",
      targetAppName: "notion.exe",
      aiRewritten: false,
      baselineIntent: "plain_text",
      autoLearnedRules: [
        {
          id: "format-notion-md_text",
          appName: "notion.exe",
          contentType: "md_text",
          suggestedPreset: "format:rich",
          confidence: 0.9,
          count: 5,
          updatedAt: new Date().toISOString(),
        },
      ],
    });

    expect(decision.intent).toBe("rich_text");
  });

  it("forces plain for code-like field intent", () => {
    const decision = planPasteStrategy({
      detectedType: "md_text",
      cleanedText: "1. item\n2. item",
      sourceHtml: "<ol><li>item</li></ol>",
      sourceAppName: "notion.exe",
      targetAppType: "editor",
      targetAppName: "notion.exe",
      fieldIntent: "code-block",
      aiRewritten: false,
      baselineIntent: "rich_text",
      autoLearnedRules: [],
    });

    expect(decision.intent).toBe("plain_text");
  });

  it("uses spreadsheet policy pack for excel-like targets", () => {
    const decision = planPasteStrategy({
      detectedType: "tsv_table",
      cleanedText: "name\tscore\nA\t10",
      sourceHtml: "",
      sourceAppName: "chrome.exe",
      targetAppType: "editor",
      targetAppName: "EXCEL.EXE",
      fieldIntent: "grid-cell",
      aiRewritten: false,
      baselineIntent: "plain_text",
      autoLearnedRules: [],
    });

    expect(decision.policyPack).toBe("spreadsheet-structured");
    expect(decision.intent).toBe("plain_text");
  });

  it("protects source code when moving from code app to document app", () => {
    const decision = planPasteStrategy({
      detectedType: "source_code",
      cleanedText: "const total = 1;",
      sourceHtml: "<pre><code>const total = 1;</code></pre>",
      sourceAppName: "Code.exe",
      targetAppType: "editor",
      targetAppName: "winword.exe",
      fieldIntent: "editor-body",
      aiRewritten: false,
      baselineIntent: "rich_text",
      autoLearnedRules: [],
    });

    expect(decision.intent).toBe("plain_text");
  });

  it("forces plain for mail subject/title fields via app policy override", () => {
    const decision = planPasteStrategy({
      detectedType: "md_text",
      cleanedText: "- one\n- two",
      sourceHtml: "<ul><li>one</li><li>two</li></ul>",
      sourceAppName: "notion.exe",
      targetAppType: "editor",
      targetAppName: "outlook.exe",
      fieldIntent: "subject",
      aiRewritten: false,
      baselineIntent: "rich_text",
      autoLearnedRules: [],
    });

    expect(decision.intent).toBe("plain_text");
  });
});

describe("paste intelligence learning feedback", () => {
  it("creates a new format learning rule", () => {
    const rules = learnPasteStrategyFeedback([], {
      appName: "notion.exe",
      contentType: "md_text",
      selectedIntent: "rich_text",
      confidence: 0.72,
    });
    const firstRule = rules[0];
    if (!firstRule) {
      throw new Error("Expected format learning rule to exist");
    }

    expect(rules.length).toBe(1);
    expect(firstRule.id).toContain("format-notion-md_text");
    expect(firstRule.suggestedPreset).toBe("format:rich");
  });

  it("updates existing format learning rule when intent changes", () => {
    const existing = [
      {
        id: "format-notion-md_text",
        appName: "notion.exe",
        contentType: "md_text" as const,
        suggestedPreset: "format:rich",
        confidence: 0.8,
        count: 4,
        updatedAt: new Date().toISOString(),
      },
    ];

    const rules = learnPasteStrategyFeedback(existing, {
      appName: "notion.exe",
      contentType: "md_text",
      selectedIntent: "plain_text",
      confidence: 0.6,
    });
    const firstRule = rules[0];
    if (!firstRule) {
      throw new Error("Expected updated format learning rule to exist");
    }

    expect(rules.length).toBe(1);
    expect(firstRule.suggestedPreset).toBe("format:plain");
  });

  it("applies explicit feedback with weighted updates", () => {
    const rules = applyExplicitPasteFeedback([], {
      appName: "notion.exe",
      contentType: "md_text",
      expectedIntent: "rich_text",
      weight: 4,
    });
    const firstRule = rules[0];
    if (!firstRule) {
      throw new Error("Expected explicit feedback rule to exist");
    }

    expect(firstRule.count).toBeGreaterThanOrEqual(4);
    expect(firstRule.suggestedPreset).toBe("format:rich");
  });

  it("weights recent learned feedback higher than stale rules", () => {
    const oldDate = new Date(
      Date.now() - 1000 * 60 * 60 * 24 * 120,
    ).toISOString();
    const freshDate = new Date().toISOString();
    const decision = planPasteStrategy({
      detectedType: "plain_text",
      cleanedText: "Quick status update",
      sourceHtml: "",
      sourceAppName: "custom-tool.exe",
      targetAppType: "unknown",
      targetAppName: "custom-tool.exe",
      fieldIntent: "general",
      aiRewritten: false,
      baselineIntent: "plain_text",
      autoLearnedRules: [
        {
          id: "format-custom_tool-plain_text-old",
          appName: "custom-tool.exe",
          contentType: "plain_text",
          suggestedPreset: "format:rich",
          confidence: 0.95,
          count: 20,
          updatedAt: oldDate,
        },
        {
          id: "format-custom_tool-plain_text-new",
          appName: "custom-tool",
          contentType: "plain_text",
          suggestedPreset: "format:plain",
          confidence: 0.8,
          count: 3,
          updatedAt: freshDate,
        },
      ],
    });

    expect(decision.intent).toBe("plain_text");
  });

  it("learns separate rules per field bucket for same app+content", () => {
    let rules = learnPasteStrategyFeedback([], {
      appName: "notion.exe",
      contentType: "md_text",
      fieldIntent: "editor_body",
      selectedIntent: "rich_text",
      confidence: 0.9,
    });

    rules = learnPasteStrategyFeedback(rules, {
      appName: "notion.exe",
      contentType: "md_text",
      fieldIntent: "search_box",
      selectedIntent: "plain_text",
      confidence: 0.85,
    });

    expect(rules.length).toBe(2);
    expect(rules.some((rule) => rule.fieldIntent === "rich")).toBe(true);
    expect(rules.some((rule) => rule.fieldIntent === "compact")).toBe(true);
    expect(rules.some((rule) => rule.id.endsWith("--rich"))).toBe(true);
    expect(rules.some((rule) => rule.id.endsWith("--compact"))).toBe(true);
  });

  it("keeps legacy general rule key when no field intent is provided", () => {
    const rules = learnPasteStrategyFeedback([], {
      appName: "custom-tool.exe",
      contentType: "md_text",
      selectedIntent: "plain_text",
      confidence: 0.9,
    });

    expect(rules).toHaveLength(1);
    expect(rules[0]?.fieldIntent).toBeUndefined();
    expect(rules[0]?.id).toContain("format-custom_tool-md_text");
    expect(rules[0]?.id.includes("--")).toBe(false);
  });
});
