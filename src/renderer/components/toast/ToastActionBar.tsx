import React, { useEffect } from "react";
import styles from "../../styles/components/ToastWindow.module.css";
import { ToastData } from "../../hooks/useToastData";
import { getSmartActions } from "../../lib/smart-actions";

interface Props {
  data: ToastData;
  isAiLoading: boolean;
  copied: boolean;
  onAction: (action: string) => void;
}

export function ToastActionBar({ data, isAiLoading, copied, onAction }: Props) {
  // Keyboard shortcut handler — Z/C/Esc work for ALL types, digits 1-9 only for non-compact
  useEffect(() => {
    const isCompact =
      data.type === "bypass_mode" ||
      data.type === "system" ||
      data.type === "auto_clean" ||
      data.type === "paste_clean";

    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;

      // Z/C/Esc shortcuts — all HUD types
      if (e.key === "z" || e.key === "Z") {
        onAction("undo");
        return;
      }
      if (e.key === "c" || e.key === "C") {
        onAction("copy");
        return;
      }
      if (e.key === "Escape") {
        onAction("dismiss");
        return;
      }
      if (e.key === "Enter" && data.type === "paste_preview") {
        onAction("confirm_preview");
        return;
      }

      // Guard: skip S/F/R when input/textarea is focused
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      // S/F/R AI action shortcuts — only for non-compact types
      if (isCompact) return;
      if (e.key === "s" || e.key === "S") {
        onAction("summarize");
        return;
      }
      if (e.key === "f" || e.key === "F") {
        onAction("fix_grammar");
        return;
      }
      if (e.key === "r" || e.key === "R") {
        onAction("rephrase");
        return;
      }

      // Digit keys 1-9 — only for non-compact types
      if (isCompact) return;
      if (e.key >= "1" && e.key <= "9") {
        const index = Number.parseInt(e.key, 10) - 1;
        const button = document.querySelector<HTMLButtonElement>(
          `[data-action-index="${index}"]`,
        );
        button?.click();
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [data.type, onAction]);

  if (
    data.type === "bypass_mode" ||
    data.type === "system" ||
    data.type === "size_warning"
  ) {
    return null;
  }

  if (data.type === "paste_preview") {
    return (
      <div className={styles.actions}>
        <button
          className={styles.actionBtn}
          onClick={() => onAction("confirm_preview")}
          aria-label="Confirm preview and paste cleaned result"
        >
          ✅ Confirm Paste
        </button>
        <button
          className={styles.actionBtn}
          onClick={() => onAction("cancel_preview")}
          aria-label="Cancel preview"
        >
          ✖ Cancel
        </button>
      </div>
    );
  }

  if (
    data.type === "command_palette" &&
    data.paletteOptions &&
    data.paletteOptions.length > 0
  ) {
    return (
      <div className={styles.actions}>
        {data.paletteOptions.slice(0, 8).map((option, index) => (
          <button
            key={option}
            className={styles.actionBtn}
            onClick={() => onAction(`palette_select:${option}`)}
            aria-label={`Use preset ${option}`}
            data-action-index={index}
          >
            {data.paletteSelected === option ? "✓ " : ""}
            {option}
          </button>
        ))}
      </div>
    );
  }

  // Sensitive data warning — offer "Show anyway" or "Keep masked"
  if (data.type === "sensitive_warning") {
    return (
      <div className={styles.actions}>
        <button
          className={styles.actionBtn}
          onClick={() => onAction("use_original")}
          aria-label="Show original unmasked text"
        >
          👁 Show anyway
        </button>
        <button
          className={styles.actionBtn}
          onClick={() => onAction("copy")}
          aria-label="Copy masked text to clipboard"
        >
          {copied ? "✓ Copied" : "Keep masked"}
        </button>
      </div>
    );
  }

  // Compact HUD for background-clean types: feedback + fix options
  if (data.type === "auto_clean" || data.type === "paste_clean") {
    const currentIntent = data.strategyIntent ?? "plain_text";
    const oppositeIntent =
      currentIntent === "rich_text" ? "plain_text" : "rich_text";

    return (
      <div className={styles.actions}>
        <button
          className={styles.actionBtn}
          onClick={() => onAction("undo")}
          disabled={isAiLoading}
          aria-label="Undo clean — restore original text"
          title="Restore original text to clipboard"
        >
          ↩ Undo
        </button>
        <button
          className={styles.actionBtn}
          onClick={() => onAction("copy")}
          disabled={isAiLoading}
          aria-label="Copy cleaned text"
        >
          {copied ? "✓ Copied" : "Copy"}
        </button>
        <button
          className={styles.actionBtn}
          onClick={() => onAction("feedback_good")}
          disabled={isAiLoading}
          aria-label="Feedback: current format is correct"
          title="Learn only; keep this format"
        >
          👍 Benar
        </button>
        <button
          className={styles.actionBtn}
          onClick={() => onAction(`feedback_learn:${oppositeIntent}`)}
          disabled={isAiLoading}
          aria-label="Feedback: adjust next time only"
          title="Learn only; apply on next paste"
        >
          🧠 Learn Only
        </button>
        <button
          className={styles.actionBtn}
          onClick={() => onAction(`feedback_fix_now:${oppositeIntent}`)}
          disabled={isAiLoading}
          aria-label="Feedback: fix now and reapply paste"
          title="Learn and reapply now"
        >
          🛠 Fix Now
        </button>
      </div>
    );
  }
  let actionIndex = 0;
  const renderActionButton = (
    action: string,
    label: string,
    ariaLabel: string,
    opts?: { title?: string; disabled?: boolean },
  ) => {
    const currentIndex = actionIndex;
    actionIndex += 1;

    return (
      <button
        key={`${action}-${currentIndex}`}
        className={styles.actionBtn}
        onClick={() => onAction(action)}
        disabled={opts?.disabled ?? isAiLoading}
        aria-label={ariaLabel}
        aria-busy={isAiLoading}
        title={opts?.title}
        data-action-index={currentIndex}
      >
        {label}
      </button>
    );
  };

  const renderContextButtons = () => {
    switch (data.type) {
      case "math_expression":
        return renderActionButton(
          "calculate",
          "🧮 Calculate",
          "Calculate mathematical expression",
        );
      case "color_code":
        return renderActionButton(
          "convert_color",
          "🎨 Convert Format",
          "Convert color format",
        );
      case "path_text":
        return renderActionButton(
          "extract_file",
          "📄 Extract Content",
          "Extract file content",
        );
      case "url_text":
        return renderActionButton(
          "scrape_url",
          isAiLoading ? "🕸️ Scraping..." : "🕸️ Scrape Article",
          "Extract article content from URL",
          { title: "Convert article to markdown" },
        );
      case "md_text":
        return renderActionButton(
          "convert_md",
          "📝 Make Rich Text",
          "Convert markdown to rich text",
          { title: "Convert to rich text" },
        );
      case "text_with_links":
        return renderActionButton(
          "open_links",
          "🔗 Open Links",
          "Extract and open links",
          { title: "Extract and open links" },
        );
      case "json_data":
        return (
          <>
            {renderActionButton(
              "convert_yaml",
              "JSON → YAML",
              "Convert JSON to YAML format",
            )}
            {renderActionButton(
              "convert_toml",
              "JSON → TOML",
              "Convert JSON to TOML format",
            )}
          </>
        );
      case "yaml_data":
      case "toml_data":
        return renderActionButton(
          "convert_json",
          "→ JSON",
          "Convert to JSON format",
        );
      case "html_table":
        return (
          <>
            {renderActionButton(
              "convert_csv",
              "\u2192 CSV",
              "Convert HTML table to CSV",
            )}
            {renderActionButton(
              "convert_md",
              "\u2192 Markdown",
              "Convert to Markdown table",
            )}
          </>
        );
      case "csv_table":
        return (
          <>
            {renderActionButton(
              "convert_md",
              "\u2192 Markdown",
              "Convert to Markdown table",
            )}
            {renderActionButton(
              "convert_json",
              "\u2192 JSON",
              "Convert to JSON format",
            )}
          </>
        );
      default: {
        // Smart context-aware AI suggestions based on detected content type
        const smartActions = getSmartActions(
          data.type,
          data.cleaned?.length ?? 0,
        );
        if (smartActions.length > 0) {
          return (
            <>
              {smartActions.map(({ action, label, icon }) =>
                renderActionButton(action, `${icon} ${label}`, label),
              )}
            </>
          );
        }
        // Fallback for plain_text / unknown: generic utility set
        return (
          <>
            {renderActionButton(
              "save_snippet",
              "💾 Save Snippet",
              "Save copied text as snippet",
            )}
            {renderActionButton(
              "make_secret",
              isAiLoading ? "Encrypting..." : "💣 Secret Link",
              "Create one-time secret link",
              { title: "Create one-time secret link" },
            )}
            {renderActionButton(
              "fix_grammar",
              isAiLoading ? "✨ Thinking..." : "✅ Fix Grammar",
              "Fix grammar",
            )}
            {renderActionButton(
              "rephrase",
              isAiLoading ? "✨ Thinking..." : "🔄 Rephrase",
              "Rephrase text",
            )}
            {renderActionButton(
              "formalize",
              isAiLoading ? "✨ Thinking..." : "👔 Formalize",
              "Rewrite text in formal tone",
            )}
            {renderActionButton(
              "summarize",
              isAiLoading ? "✨ Thinking..." : "📝 Summarize",
              "Summarize text",
            )}
          </>
        );
      }
    }
  };

  return (
    <div className={styles.actions}>
      {renderContextButtons()}
      {renderActionButton(
        "UPPERCASE",
        copied ? "Copied!" : "UPPERCASE",
        "Convert result to uppercase",
      )}
    </div>
  );
}
