/**
 * smart-actions.ts
 * Maps detected content types to ranked AI/transform action suggestions.
 * Used by SmartPastePage and ToastActionBar to show context-aware buttons.
 */

export interface SmartAction {
    action: string;
    label: string;
    icon: string;
    /** If true, render prominently at the top of the action bar */
    isPrimary: boolean;
    /** Keyboard shortcut hint displayed on the button (optional) */
    hint?: string;
}

/**
 * Returns ordered smart actions for a given content type and text length.
 * Primary actions are always returned first.
 *
 * @param contentType - The detected content type string from content-detector.ts
 * @param textLength  - Length of the text (chars), used to prioritise Summarize for long text
 */
export function getSmartActions(
    contentType: string,
    textLength = 0,
): SmartAction[] {
    const LONG_TEXT_THRESHOLD = 500;
    const SHORT_TEXT_THRESHOLD = 100;
    const isLong = textLength > LONG_TEXT_THRESHOLD;
    const isShort = textLength > 0 && textLength < SHORT_TEXT_THRESHOLD;

    switch (contentType) {
        // ── Email-like content → Formalize first ─────────────────────────────────
        case "email_text":
            return [
                { action: "formalize", label: "Formalize", icon: "👔", isPrimary: true, hint: "F" },
                { action: "fix_grammar", label: "Fix Grammar", icon: "✅", isPrimary: true, hint: "F" },
                { action: "rephrase", label: "Rephrase", icon: "🔄", isPrimary: false },
                { action: "summarize", label: "Summarize", icon: "📝", isPrimary: false },
            ];

        // ── Source code → no AI rewrite, only transforms ────────────────────────
        case "source_code":
            return [];

        // ── URL → scrape + summarize are most useful ─────────────────────────────
        case "url_text":
        case "text_with_links":
            return [
                { action: "scrape_url", label: "Scrape Article", icon: "🕸️", isPrimary: true },
                { action: "summarize_url", label: "Summarize URL", icon: "🔗", isPrimary: true },
            ];

        // ── Markdown → summarize or convert to rich text ─────────────────────────
        case "md_text":
            return [
                { action: "summarize", label: "Summarize", icon: "📝", isPrimary: true, hint: "S" },
                { action: "bullet_list", label: "Bullets", icon: "•", isPrimary: true },
                { action: "rephrase", label: "Rephrase", icon: "🔄", isPrimary: false },
                { action: "fix_grammar", label: "Fix Grammar", icon: "✅", isPrimary: false },
            ];

        // ── Structured data → conversion actions (handled separately in toast) ───
        case "json_data":
        case "yaml_data":
        case "toml_data":
        case "csv_table":
        case "tsv_table":
        case "html_table":
            return [];

        // ── Math / color / path / date / phone → nothing to rewrite ──────────────
        case "math_expression":
        case "color_code":
        case "path_text":
        case "date_text":
        case "phone_number":
        case "address":
            return [];

        // ── PDF-extracted text (often garbled) → fix grammar first ──────────────
        case "pdf_text":
            return [
                { action: "fix_grammar", label: "Fix Grammar", icon: "✅", isPrimary: true, hint: "F" },
                { action: "rephrase", label: "Rephrase", icon: "🔄", isPrimary: true },
                isLong
                    ? { action: "summarize", label: "Summarize", icon: "📝", isPrimary: true, hint: "S" }
                    : { action: "formalize", label: "Formalize", icon: "👔", isPrimary: false },
            ];

        // ── Plain text (default) — length-aware prioritisation ───────────────────
        case "plain_text":
        default: {
            if (isLong) {
                return [
                    { action: "summarize", label: "Summarize", icon: "📝", isPrimary: true, hint: "S" },
                    { action: "fix_grammar", label: "Fix Grammar", icon: "✅", isPrimary: true, hint: "F" },
                    { action: "rephrase", label: "Rephrase", icon: "🔄", isPrimary: false },
                    { action: "formalize", label: "Formalize", icon: "👔", isPrimary: false },
                ];
            }

            if (isShort) {
                return [
                    { action: "fix_grammar", label: "Fix Grammar", icon: "✅", isPrimary: true, hint: "F" },
                    { action: "translate", label: "Translate", icon: "🌐", isPrimary: true },
                    { action: "rephrase", label: "Rephrase", icon: "🔄", isPrimary: false },
                    { action: "formalize", label: "Formalize", icon: "👔", isPrimary: false },
                ];
            }

            return [
                { action: "fix_grammar", label: "Fix Grammar", icon: "✅", isPrimary: true, hint: "F" },
                { action: "rephrase", label: "Rephrase", icon: "🔄", isPrimary: true, hint: "R" },
                { action: "formalize", label: "Formalize", icon: "👔", isPrimary: false },
                { action: "summarize", label: "Summarize", icon: "📝", isPrimary: false, hint: "S" },
            ];
        }
    }
}

/**
 * Auto-selects the best pipeline preset string for a given content type.
 * Used by handleClean() so users never need to manually pick FORMAT/CLEAN mode.
 */
export function getAutoPreset(contentType: string): string {
    switch (contentType) {
        case "source_code":
            return "code";
        case "email_text":
            return "email";
        case "md_text":
            return "markdown";
        case "json_data":
        case "yaml_data":
        case "toml_data":
        case "csv_table":
        case "tsv_table":
        case "html_table":
            return "json_table";
        default:
            return "default";
    }
}
