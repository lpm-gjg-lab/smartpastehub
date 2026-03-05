import React, { useState, useCallback, useEffect, useId } from "react";
import { useTranslation } from "react-i18next";
import { invokeIPC } from "../lib/ipc";
import { Cross2Icon } from "@radix-ui/react-icons";

type FormatMode = "markdown" | "plaintext" | "html";

interface ClipResult {
  title: string;
  content: string;
  textContent: string;
  excerpt: string;
  byline?: string;
  siteName?: string;
  length: number;
}

export default function WebClipper() {
  const { t } = useTranslation();
  const urlInputId = useId();
  const [url, setUrl] = useState("");
  const [clipResult, setClipResult] = useState<ClipResult | null>(null);
  const [format, setFormat] = useState<FormatMode>("markdown");
  const [renderedContent, setRenderedContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const statusMessage = loading
    ? t("window.clipper.loading")
    : copied
      ? t("window.clipper.copied")
      : saved
        ? t("window.clipper.saved")
        : "";

  // ── #8 Auto-populate URL dari clipboard saat window dibuka (✔ auto)
  useEffect(() => {
    void (async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text && /^https?:\/\//i.test(text.trim())) {
          setUrl(text.trim());
        }
      } catch {
        // clipboard read permission denied — silently skip
      }
    })();
  }, []);

  const applyFormat = useCallback(async (html: string, fmt: FormatMode) => {
    if (fmt === "html") {
      setRenderedContent(html);
      return;
    }
    const channel =
      fmt === "markdown" ? "clipper:to-markdown" : "clipper:to-plaintext";
    const converted = await invokeIPC<string>(channel, html);
    setRenderedContent(converted ?? "");
  }, []);

  const clip = useCallback(async () => {
    if (!url.trim()) return;
    setLoading(true);
    setError("");
    setClipResult(null);
    setRenderedContent("");
    try {
      // Fetch HTML in renderer (Node fetch / browser fetch)
      const fetchRes = await fetch(url);
      const html = await fetchRes.text();

      const result = await invokeIPC<ClipResult>("clipper:clip-url", {
        html,
        url,
      });
      setClipResult(result);
      await applyFormat(result.content, format);
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [url, format, applyFormat]);

  const handleFormatChange = async (fmt: FormatMode) => {
    setFormat(fmt);
    if (clipResult) {
      await applyFormat(clipResult.content, fmt);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(renderedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSave = async () => {
    if (!clipResult || !renderedContent) return;
    // Persist via snippets IPC
    await invokeIPC("snippet:create", {
      name: clipResult.title || url,
      content: renderedContent,
      tags: ["web-clip"],
    });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  const formats: { key: FormatMode; label: string }[] = [
    { key: "markdown", label: t("window.clipper.format_markdown") },
    { key: "plaintext", label: t("window.clipper.format_plaintext") },
    { key: "html", label: "HTML" },
  ];

  return (
    <main
      aria-label={t("window.clipper.title")}
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-tertiary)",
        backdropFilter: "blur(16px)",
        fontFamily: "var(--font-sans)",
        color: "var(--text-primary)",
        overflow: "hidden",
        borderRadius: 12,
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      {/* Header */}
      <h1
        className="window-drag-region"
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--border-subtle)",
          fontWeight: 600,
          fontSize: 13,
          margin: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span>{t("window.clipper.title")}</span>
        <button
          className="window-no-drag"
          type="button"
          aria-label="Close window"
          onClick={() => window.close()}
          style={{
            border: "none",
            background: "transparent",
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontSize: 16,
            lineHeight: 1,
            borderRadius: 6,
            padding: "2px 6px",
          }}
        >
          <Cross2Icon />
        </button>
      </h1>

      {/* URL input */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--border-subtle)",
          display: "flex",
          gap: 8,
        }}
      >
        <input
          id={urlInputId}
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void clip()}
          placeholder={t("window.clipper.url_placeholder")}
          aria-label={t("window.clipper.url_placeholder")}
          style={{
            flex: 1,
            padding: "6px 10px",
            background: "var(--glass-bg)",
            border: "1px solid var(--glass-border)",
            borderRadius: 6,
            color: "var(--text-primary)",
            fontSize: 12,
          }}
        />
        <button
          type="button"
          onClick={() => void clip()}
          disabled={loading || !url.trim()}
          aria-label={t("window.clipper.clip")}
          style={{
            padding: "6px 14px",
            borderRadius: 6,
            border: "none",
            cursor: loading || !url.trim() ? "not-allowed" : "pointer",
            fontSize: 12,
            fontWeight: 600,
            background: "var(--accent-primary)",
            color: "#fff",
          }}
        >
          {loading ? t("window.clipper.loading") : t("window.clipper.clip")}
        </button>
      </div>

      {/* Article meta */}
      {clipResult && (
        <div
          style={{
            padding: "6px 14px",
            borderBottom: "1px solid var(--border-subtle)",
            fontSize: 11,
            opacity: 0.7,
          }}
        >
          <strong style={{ opacity: 1, fontSize: 12 }}>
            {clipResult.title}
          </strong>
          {clipResult.byline && ` · ${clipResult.byline}`}
          {clipResult.siteName && ` · ${clipResult.siteName}`}
          {` · ${t("window.clipper.chars", { count: clipResult.length })}`}
        </div>
      )}

      {/* Format toggle */}
      <fieldset
        aria-label="Output format"
        style={{
          padding: "6px 14px",
          display: "flex",
          gap: 6,
          borderBottom: "1px solid var(--border-subtle)",
          margin: 0,
          borderLeft: "none",
          borderRight: "none",
          borderTop: "none",
        }}
      >
        {formats.map(({ key, label }) => (
          <button
            type="button"
            key={key}
            onClick={() => void handleFormatChange(key)}
            aria-pressed={format === key}
            aria-label={label}
            style={{
              padding: "3px 10px",
              borderRadius: 4,
              border: "none",
              cursor: "pointer",
              fontSize: 11,
              background:
                format === key
                  ? "var(--accent-primary)"
                  : "var(--glass-bg-hover)",
              color: format === key ? "#fff" : "var(--text-primary)",
            }}
          >
            {label}
          </button>
        ))}
      </fieldset>

      {/* Preview */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          maxHeight: 280,
          overflowY: "auto",
          padding: "10px 14px",
        }}
      >
        {error && (
          <div
            role="alert"
            style={{ color: "var(--accent-danger)", fontSize: 12 }}
          >
            {error}
          </div>
        )}
        {!error && !renderedContent && !loading && (
          <div style={{ opacity: 0.4, fontSize: 12 }}>
            {t("window.clipper.empty_hint")}
          </div>
        )}
        {renderedContent && (
          <pre
            style={{
              margin: 0,
              fontSize: 11,
              lineHeight: 1.6,
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              color: "var(--text-secondary)",
              fontFamily: format === "html" ? "monospace" : "inherit",
            }}
          >
            {renderedContent}
          </pre>
        )}
      </div>

      {/* Action bar */}
      <div
        style={{
          padding: "8px 12px",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          gap: 8,
        }}
      >
        <button
          type="button"
          onClick={() => void handleCopy()}
          disabled={!renderedContent}
          aria-label={t("window.clipper.copy")}
          style={{
            flex: 2,
            padding: "7px 0",
            borderRadius: 6,
            border: "none",
            cursor: renderedContent ? "pointer" : "not-allowed",
            fontSize: 12,
            fontWeight: 600,
            background: copied
              ? "var(--success-glow)"
              : "var(--accent-primary)",
            color: "#fff",
          }}
        >
          {copied ? t("window.clipper.copied") : t("window.clipper.copy")}
        </button>
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!clipResult}
          aria-label={t("window.clipper.save_snippet")}
          style={{
            flex: 1,
            padding: "7px 0",
            borderRadius: 6,
            border: "none",
            cursor: clipResult ? "pointer" : "not-allowed",
            fontSize: 12,
            background: saved ? "var(--success-glow)" : "var(--glass-bg-hover)",
            color: saved ? "#fff" : "var(--text-primary)",
          }}
        >
          {saved ? t("window.clipper.saved") : t("window.clipper.save_snippet")}
        </button>
      </div>
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {statusMessage}
      </div>
    </main>
  );
}
