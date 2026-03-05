import { describe, expect, it } from "vitest";
import {
  learnPasteStrategyFeedback,
  planPasteStrategy,
} from "../../src/core/paste-intelligence";
import { ContentType } from "../../src/shared/types";

function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (1664525 * state + 1013904223) >>> 0;
    return state / 0x100000000;
  };
}

function pick<T>(rand: () => number, values: readonly T[]): T {
  return values[Math.floor(rand() * values.length)] as T;
}

const ALWAYS_PLAIN_TYPES: ReadonlySet<ContentType> = new Set([
  "source_code",
  "json_data",
  "yaml_data",
  "toml_data",
  "path_text",
  "math_expression",
]);

const STRUCTURE_TYPES: ReadonlySet<ContentType> = new Set([
  "styled_html",
  "structured_html",
  "html_table",
  "csv_table",
  "tsv_table",
  "md_text",
]);

const DOC_APPS = ["WINWORD.EXE", "notion.exe", "Google Docs"] as const;
const CHAT_APPS = ["slack.exe", "teams.exe", "discord.exe"] as const;
const TERMINAL_APPS = [
  "WindowsTerminal.exe",
  "cmd.exe",
  "powershell.exe",
] as const;
const SPREADSHEET_APPS = ["EXCEL.EXE", "Google Sheets"] as const;
const CODE_APPS = ["Code.exe", "cursor.exe"] as const;
const MISC_APPS = ["unknown-app.exe", "custom-tool.exe"] as const;

const SOURCE_APPS = [
  ...DOC_APPS,
  ...CHAT_APPS,
  ...TERMINAL_APPS,
  ...SPREADSHEET_APPS,
  ...CODE_APPS,
  ...MISC_APPS,
] as const;

const CONTENT_TYPES: readonly ContentType[] = [
  "plain_text",
  "styled_html",
  "structured_html",
  "html_table",
  "csv_table",
  "tsv_table",
  "md_text",
  "source_code",
  "json_data",
  "yaml_data",
  "toml_data",
  "path_text",
  "math_expression",
  "text_with_links",
];

const FIELD_INTENTS = [
  "editor-body",
  "message-body",
  "title",
  "subject",
  "search",
  "code-block",
  "query-input",
  "command-line",
  "grid-cell",
  "",
] as const;

function sampleText(contentType: ContentType): { text: string; html: string } {
  switch (contentType) {
    case "md_text":
      return {
        text: "1. First\n2. Second",
        html: "<ol><li>First</li><li>Second</li></ol>",
      };
    case "html_table":
      return {
        text: "| name | score |\n| --- | --- |\n| a | 1 |",
        html: "<table><tr><th>name</th><th>score</th></tr><tr><td>a</td><td>1</td></tr></table>",
      };
    case "csv_table":
      return { text: "name,score\na,1", html: "" };
    case "tsv_table":
      return { text: "name\tscore\na\t1", html: "" };
    case "styled_html":
      return {
        text: "- alpha\n- beta",
        html: "<ul><li>alpha</li><li>beta</li></ul>",
      };
    case "structured_html":
      return {
        text: "Section\n\n- one\n- two",
        html: "<div><ul><li>one</li><li>two</li></ul></div>",
      };
    case "source_code":
      return {
        text: "const total = 1;",
        html: "<pre><code>const total = 1;</code></pre>",
      };
    case "json_data":
      return { text: '{"name":"a"}', html: "" };
    case "yaml_data":
      return { text: "name: a\nscore: 1", html: "" };
    case "toml_data":
      return { text: '[user]\nname = "a"', html: "" };
    case "path_text":
      return { text: "C:\\Project\\file.ts", html: "" };
    case "math_expression":
      return { text: "(100 + 20) * 3", html: "" };
    case "text_with_links":
      return { text: "See docs at https://example.com for details", html: "" };
    default:
      return { text: "Plain paragraph text", html: "" };
  }
}

function expectedIntent(args: {
  targetAppName: string;
  contentType: ContentType;
  fieldIntent: string;
}): "plain_text" | "rich_text" {
  const target = args.targetAppName.toLowerCase();
  const field = args.fieldIntent.toLowerCase();
  const isTerminal = /terminal|cmd|powershell/.test(target);
  const isSpreadsheet = /excel|sheets/.test(target);
  const isDocOrChat = /word|notion|docs|slack|teams|discord/.test(target);
  const isCodeLikeField = /code|command|query/.test(field);
  const isStructure = STRUCTURE_TYPES.has(args.contentType);

  if (isTerminal) return "plain_text";
  if (isCodeLikeField) return "plain_text";
  if (ALWAYS_PLAIN_TYPES.has(args.contentType)) return "plain_text";
  if (
    isSpreadsheet &&
    (args.contentType === "csv_table" || args.contentType === "tsv_table")
  ) {
    return "plain_text";
  }
  if (isDocOrChat && isStructure) return "rich_text";
  return "plain_text";
}

describe("paste intelligence high-iteration precision", () => {
  it("holds precision across 2000 mixed contexts", () => {
    const rand = seededRandom(20260226);
    const iterations = 2000;
    let matches = 0;

    for (let i = 0; i < iterations; i += 1) {
      const contentType = pick(rand, CONTENT_TYPES);
      const targetApp = pick(rand, SOURCE_APPS);
      const sourceApp = pick(rand, SOURCE_APPS);
      const fieldIntent = pick(rand, FIELD_INTENTS);
      const targetAppType = /terminal|cmd|powershell/.test(targetApp)
        ? "terminal"
        : /chrome|firefox|edge|brave|opera/.test(targetApp)
          ? "browser"
          : /slack|discord|teams/.test(targetApp)
            ? "chat"
            : "editor";

      const sample = sampleText(contentType);
      const decision = planPasteStrategy({
        detectedType: contentType,
        cleanedText: sample.text,
        sourceHtml: sample.html,
        sourceAppName: sourceApp,
        targetAppType,
        targetAppName: targetApp,
        fieldIntent,
        aiRewritten: false,
        baselineIntent: i % 2 === 0 ? "plain_text" : "rich_text",
        autoLearnedRules: [],
      });

      const expected = expectedIntent({
        targetAppName: targetApp,
        contentType,
        fieldIntent,
      });

      if (decision.intent === expected) {
        matches += 1;
      }
    }

    const precision = matches / iterations;
    expect(precision).toBeGreaterThanOrEqual(0.92);
  });

  it("converges to rich preference with repeated positive feedback", () => {
    let rules: ReturnType<typeof learnPasteStrategyFeedback> = [];

    for (let i = 0; i < 500; i += 1) {
      rules = learnPasteStrategyFeedback(rules, {
        appName: "custom-tool.exe",
        contentType: "md_text",
        selectedIntent: "rich_text",
        confidence: 0.9,
      });
    }

    const decision = planPasteStrategy({
      detectedType: "md_text",
      cleanedText: "- alpha\n- beta",
      sourceHtml: "",
      sourceAppName: "custom-tool.exe",
      targetAppType: "editor",
      targetAppName: "custom-tool.exe",
      fieldIntent: "editor-body",
      aiRewritten: false,
      baselineIntent: "plain_text",
      autoLearnedRules: rules,
    });

    expect(decision.intent).toBe("rich_text");
    expect(decision.confidence).toBeGreaterThan(0.2);
  });

  it("converges to plain preference with repeated plain feedback", () => {
    let rules: ReturnType<typeof learnPasteStrategyFeedback> = [];

    for (let i = 0; i < 700; i += 1) {
      rules = learnPasteStrategyFeedback(rules, {
        appName: "custom-tool.exe",
        contentType: "md_text",
        selectedIntent: "plain_text",
        confidence: 0.85,
      });
    }

    const decision = planPasteStrategy({
      detectedType: "md_text",
      cleanedText: "1. one\n2. two",
      sourceHtml: "<ol><li>one</li><li>two</li></ol>",
      sourceAppName: "custom-tool.exe",
      targetAppType: "editor",
      targetAppName: "custom-tool.exe",
      fieldIntent: "title",
      aiRewritten: false,
      baselineIntent: "rich_text",
      autoLearnedRules: rules,
    });

    expect(decision.intent).toBe("plain_text");
  });
});
