import { load } from "cheerio";
import { Element } from "domhandler";
import { markdownToRichText } from "../converter/markdown-richtext";
import { ContentType } from "../shared/types";

export type FormattingIntent = "plain_text" | "rich_text";

interface FormattingIntentInput {
  detectedType: ContentType;
  cleanedText: string;
  sourceHtml?: string;
  targetAppType: "chat" | "browser" | "editor" | "terminal" | "unknown";
  targetAppName?: string;
  aiRewritten?: boolean;
}

const STRUCTURE_SENSITIVE_TYPES = new Set<ContentType>([
  "styled_html",
  "structured_html",
  "html_table",
  "md_text",
]);

const ALWAYS_PLAIN_TYPES = new Set<ContentType>([
  "source_code",
  "json_data",
  "yaml_data",
  "toml_data",
  "path_text",
  "math_expression",
]);

const RICH_FRIENDLY_APPS =
  /(word|onenote|outlook|notion|docs|google docs|slack|teams|discord|chrome|firefox|edge|brave|opera)/i;

const PLAIN_FRIENDLY_APPS =
  /(notepad|terminal|powershell|cmd|shell|alacritty|wezterm|iterm|konsole)/i;

const LIST_LINE_PATTERN = /^\s*(?:[-*+•▪◦]|\d+[.)]|[A-Za-z][.)])\s+/m;

function targetSupportsRichPaste(
  appType: FormattingIntentInput["targetAppType"],
  appName: string,
): boolean {
  if (appType === "terminal") {
    return false;
  }

  if (PLAIN_FRIENDLY_APPS.test(appName)) {
    return false;
  }

  if (RICH_FRIENDLY_APPS.test(appName)) {
    return true;
  }

  return appType === "editor" || appType === "browser" || appType === "chat";
}

export function detectFormattingIntent(
  input: FormattingIntentInput,
): FormattingIntent {
  const normalizedHtml = String(input.sourceHtml ?? "").trim();
  const normalizedText = String(input.cleanedText ?? "").trim();
  const normalizedApp = String(input.targetAppName ?? "");

  if (!targetSupportsRichPaste(input.targetAppType, normalizedApp)) {
    return "plain_text";
  }

  if (ALWAYS_PLAIN_TYPES.has(input.detectedType)) {
    return "plain_text";
  }

  const structureSensitiveType = STRUCTURE_SENSITIVE_TYPES.has(
    input.detectedType,
  );
  const listLikeText = LIST_LINE_PATTERN.test(normalizedText);
  const hasMarkdownTables = /^\|.+\|\s*$/m.test(normalizedText);

  if (
    normalizedHtml &&
    (structureSensitiveType || listLikeText || hasMarkdownTables)
  ) {
    return "rich_text";
  }

  if (structureSensitiveType && (listLikeText || hasMarkdownTables)) {
    return "rich_text";
  }

  if (input.aiRewritten && (listLikeText || hasMarkdownTables)) {
    return "rich_text";
  }

  return "plain_text";
}

function sanitizeClipboardHtml(html: string): string {
  const $ = load(html);
  $("script,style,meta,link,noscript,iframe,object,embed").remove();

  $("*").each((_, node) => {
    const elementNode = node as Element;
    const attribs = elementNode.attribs ?? {};
    for (const key of Object.keys(attribs)) {
      if (/^on/i.test(key)) {
        $(node).removeAttr(key);
      }
    }

    const href = $(node).attr("href");
    if (href && /^javascript:/i.test(href.trim())) {
      $(node).removeAttr("href");
    }
  });

  const bodyHtml = $("body").html();
  return (bodyHtml ?? $.root().html() ?? "").trim();
}

export function buildRichClipboardHtml(
  cleanedText: string,
  sourceHtml?: string,
): string | null {
  const normalizedText = String(cleanedText ?? "").trim();
  const normalizedHtml = String(sourceHtml ?? "").trim();

  if (!normalizedText && !normalizedHtml) {
    return null;
  }

  let candidate = "";

  if (normalizedText) {
    try {
      candidate = markdownToRichText(normalizedText).trim();
    } catch {
      candidate = "";
    }
  }

  if (!candidate && normalizedHtml) {
    candidate = normalizedHtml;
  }

  if (!candidate) {
    return null;
  }

  const sanitized = sanitizeClipboardHtml(candidate);
  return sanitized || null;
}
