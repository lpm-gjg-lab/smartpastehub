import { load } from "cheerio";
import TurndownService from "turndown";
import { SafeHandle } from "./contracts";

interface ClipperPayload {
  html: string;
  url?: string;
}

interface ClipResult {
  title: string;
  content: string;
  textContent: string;
  excerpt: string;
  byline?: string;
  siteName?: string;
  length: number;
}

function normalizePlainText(input: string): string {
  return input.replace(/\s+/g, " ").trim();
}

function extractClip(html: string): ClipResult {
  const $ = load(html);
  const title = normalizePlainText($("title").first().text()) || "Untitled";
  const bodyHtml = $("body").html() ?? html;
  const textContent = normalizePlainText($("body").text());

  return {
    title,
    content: bodyHtml,
    textContent,
    excerpt: textContent.slice(0, 220),
    byline: $('meta[name="author"]').attr("content") ?? $('meta[property="article:author"]').attr("content"),
    siteName: $('meta[property="og:site_name"]').attr("content") ?? $('meta[name="application-name"]').attr("content"),
    length: textContent.length,
  };
}

export function registerClipperIpc(safeHandle: SafeHandle): void {
  const turndown = new TurndownService({
    headingStyle: "atx",
    codeBlockStyle: "fenced",
  });

  safeHandle("clipper:clip-url", async (_, payload) => {
    const { html } = payload as ClipperPayload;
    return extractClip(html);
  });

  safeHandle("clipper:to-markdown", async (_, payload) => {
    const html = String(payload ?? "");
    return turndown.turndown(html);
  });

  safeHandle("clipper:to-plaintext", async (_, payload) => {
    const html = String(payload ?? "");
    const $ = load(html);
    return normalizePlainText($("body").text() || $.text());
  });
}
