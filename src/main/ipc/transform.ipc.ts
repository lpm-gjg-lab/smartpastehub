import { rewriteText } from "../../ai/ai-rewriter";
import { getSettings } from "../settings-store";
import { autoConvert } from "../../converter/json-yaml-toml";
import { load } from "cheerio";
import { shell } from "electron";
import fs from "fs/promises";
import TurndownService from "turndown";
import { SafeHandle } from "./contracts";

function convertCase(text: string, targetCase: string): string {
  const words = text
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_\-]+/g, " ")
    .trim()
    .split(/\s+/);
  switch (targetCase) {
    case "camel":
      return words.map((w, i) =>(i === 0 ? w.toLowerCase() : w.slice(0,1).toUpperCase() + w.slice(1).toLowerCase())).join("");
    case "pascal":
      return words.map((w) => w.slice(0,1).toUpperCase() + w.slice(1).toLowerCase()).join("");
    case "snake":
      return words.map((w) => w.toLowerCase()).join("_");
    case "kebab":
      return words.map((w) => w.toLowerCase()).join("-");
    case "screaming":
      return words.map((w) => w.toUpperCase()).join("_");
    case "title":
      return words.map((w) => w.slice(0,1).toUpperCase() + w.slice(1).toLowerCase()).join(" ");
    case "lower":
      return text.toLowerCase();
    case "upper":
      return text.toUpperCase();
    default:
      return text;
  }
}

type TargetFormat = "json" | "yaml" | "toml";

function extractFirstUrl(input: string): string | null {
  const match = input.match(/https?:\/\/[^\s]+/i);
  return match?.[0] ?? null;
}

function calculateExpression(expression: string): string {
  const input = expression.trim();
  if (!/^[0-9+\-*/().,%\s]+$/.test(input)) {
    throw new Error("Unsupported characters in math expression");
  }

  // Safe recursive descent parser — no eval / Function constructor
  let pos = 0;
  const peek = () => input[pos] ?? "";
  const consume = () => input[pos++] ?? "";

  const skipWs = () => { while (peek() === " " || peek() === "\t") pos++; };

  // Forward declarations
  let parseExpr: () => number;

  const parseNumber = (): number => {
    skipWs();
    if (peek() === "(") {
      consume(); // '('
      const val = parseExpr();
      skipWs();
      if (peek() === ")") consume();
      return val;
    }
    let num = "";
    if (peek() === "-") { num += consume(); }
    while (/[0-9.]/.test(peek())) num += consume();
    // percentage
    skipWs();
    if (peek() === "%") { consume(); return Number(num) / 100; }
    const n = Number(num);
    if (!Number.isFinite(n)) throw new Error(`Invalid number: ${num}`);
    return n;
  };

  const parseMul = (): number => {
    let left = parseNumber();
    skipWs();
    while (peek() === "*" || peek() === "/") {
      const op = consume();
      const right = parseNumber();
      if (op === "*") left *= right;
      else {
        if (right === 0) throw new Error("Division by zero");
        left /= right;
      }
      skipWs();
    }
    return left;
  };

  parseExpr = (): number => {
    let left = parseMul();
    skipWs();
    while (peek() === "+" || peek() === "-") {
      const op = consume();
      const right = parseMul();
      left = op === "+" ? left + right : left - right;
      skipWs();
    }
    return left;
  };

  const value = parseExpr();
  if (!Number.isFinite(value)) {
    throw new Error("Math expression did not return a finite number");
  }
  // Format: strip trailing zeros for clean output
  return parseFloat(value.toPrecision(15)).toString();
}

function convertColorFormat(input: string): string {
  const text = input.trim();

  const hex = text.match(/^#?([a-fA-F0-9]{6})$/);
  if (hex) {
    const value = hex[1] ?? "000000";
    const r = Number.parseInt(value.slice(0, 2), 16);
    const g = Number.parseInt(value.slice(2, 4), 16);
    const b = Number.parseInt(value.slice(4, 6), 16);
    return `rgb(${r}, ${g}, ${b})`;
  }

  const rgb = text.match(
    /^rgb\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*\)$/i,
  );
  if (rgb) {
    const r = Number.parseInt(rgb[1] ?? "0", 10);
    const g = Number.parseInt(rgb[2] ?? "0", 10);
    const b = Number.parseInt(rgb[3] ?? "0", 10);
    const toHex = (value: number) => value.toString(16).padStart(2, "0");
    return `#${toHex(r)}${toHex(g)}${toHex(b)}`.toUpperCase();
  }

  throw new Error("Unsupported color format");
}

function markdownToText(input: string): string {
  return input
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```/g, ""))
    .replace(/`([^`]+)`/g, "$1")
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1 ($2)")
    .trim();
}

async function extractFileContent(filePath: string): Promise<string | null> {
  const resolved = String(filePath ?? "").trim();
  if (!resolved) {
    return null;
  }

  const stat = await fs.stat(resolved);
  const maxBytes = 256 * 1024;
  if (stat.size > maxBytes) {
    return null;
  }

  return fs.readFile(resolved, "utf8");
}

async function scrapeUrlAsMarkdown(input: string): Promise<string> {
  const url = extractFirstUrl(input);
  if (!url) {
    throw new Error("No URL found in input");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  let response: Response;
  try {
    response = await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
  if (!response.ok) {
    throw new Error(`Failed to fetch URL: ${response.status}`);
  }

  const html = await response.text();
  const $ = load(html);
  const bodyHtml = $("body").html() ?? html;

  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
  });
  return turndown.turndown(bodyHtml).trim();
}

function buildSecretLink(input: string): string {
  const payload = Buffer.from(input, "utf8").toString("base64url");
  return `https://secret.local/#${payload}`;
}

export function registerTransformIpc(safeHandle: SafeHandle): void {
  safeHandle("transform:convert-format", async (_, payload) => {
    const { text, targetFormat } = payload as {
      text: string;
      targetFormat: TargetFormat;
    };

    return {
      result: autoConvert(text, targetFormat),
      targetFormat,
    };
  });

  safeHandle("transform:math", async (_, payload) => {
    return {
      result: calculateExpression(String(payload ?? "")),
    };
  });

  safeHandle("transform:color", async (_, payload) => {
    return {
      result: convertColorFormat(String(payload ?? "")),
    };
  });

  safeHandle("transform:md-to-rtf", async (_, payload) => {
    return {
      result: markdownToText(String(payload ?? "")),
    };
  });

  safeHandle("transform:open-links", async (_, payload) => {
    const input = String(payload ?? "");
    const urls = Array.from(new Set(input.match(/https?:\/\/[^\s]+/gi) ?? []));
    const toOpen = urls.slice(0, 10);
    const results = await Promise.allSettled(toOpen.map((url) => shell.openExternal(url)));
    const opened = results.filter((r) => r.status === "fulfilled").length;
    const failed = results.length - opened;
    return {
      result:
        toOpen.length === 0
          ? "No links found."
          : failed > 0
          ? `Opened ${opened} link${opened !== 1 ? "s" : ""}, ${failed} failed.`
          : `Opened ${opened} link${opened !== 1 ? "s" : ""}.`,
    };
  });

  safeHandle("transform:extract-file", async (_, payload) => {
    return {
      result: await extractFileContent(String(payload ?? "")),
    };
  });

  safeHandle("transform:scrape-url", async (_, payload) => {
    return {
      result: await scrapeUrlAsMarkdown(String(payload ?? "")),
    };
  });

  safeHandle("transform:make-secret", async (_, payload) => {
    return {
      result: buildSecretLink(String(payload ?? "")),
    };
  });

  safeHandle("transform:case-convert", async (_, payload) => {
    const { text, targetCase } = payload as { text: string; targetCase: string };
    return { result: convertCase(text, targetCase) };
  });

  safeHandle("transform:translate", async (_, payload) => {
    const { text, targetLang } = payload as { text: string; targetLang: "id" | "en" };
    const settings = await getSettings();
    const ai = settings.ai;
    const rewritten = await rewriteText(text, {
      mode: "translate",
      language: targetLang,
      translateTarget: targetLang,
      provider: (ai.provider ?? "local") as import("../../ai/ai-rewriter").RewriteOptions["provider"],
      apiKey: ai.apiKey,
      baseUrl: ai.baseUrl,
      model: ai.model,
    });
    return { result: rewritten };
  });
}
