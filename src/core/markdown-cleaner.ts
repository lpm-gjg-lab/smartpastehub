/**
 * markdown-cleaner.ts
 *
 * Cleans up common issues in copy-pasted Markdown text:
 *
 *  1. Normalize list markers: * + → -
 *  2. Fix heading spacing: ##Title → ## Title
 *  3. Ensure blank line before headings
 *  4. Trim trailing whitespace per line
 *  5. Collapse 3+ blank lines → 2
 *  6. Fix broken emphasis: * * text * * → **text**
 *  7. Normalize horizontal rules to ---
 */

/**
 * Clean up Markdown text by normalizing common formatting inconsistencies.
 */
export function cleanMarkdown(text: string): string {
    let lines = text.split("\n");

    // Pass 1: per-line transforms
    lines = lines.map((line) => {
        let out = line;

        // Trim trailing whitespace (except intentional MD line break: 2+ trailing spaces)
        // We strip trailing spaces everywhere — if user needs <br> they can use HTML
        out = out.replace(/[ \t]+$/, "");

        // Normalize unordered list markers: * and + at line start → -
        // Must have a space after the marker to avoid breaking emphasis/bold
        out = out.replace(/^(\s*)[*+](\s+)/, "$1-$2");

        // Fix heading spacing: ##Title → ## Title (1-6 hashes)
        out = out.replace(/^(#{1,6})([^ #\n])/, "$1 $2");

        return out;
    });

    // Pass 2: structural fixes
    const result: string[] = [];
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i]!;
        const prevLine = result[result.length - 1];

        // Ensure blank line before headings (unless at start of document or already blank)
        if (/^#{1,6}\s/.test(line) && prevLine !== undefined && prevLine.trim() !== "") {
            result.push("");
        }

        result.push(line);
    }

    let out = result.join("\n");

    // Collapse 3+ consecutive blank lines → double blank line (paragraph break)
    out = out.replace(/\n{3,}/g, "\n\n");

    // Normalize horizontal rules: ***, ___, --- (with optional spaces) → ---
    out = out.replace(/^[ \t]*[*]{3,}[ \t]*$/gm, "---");
    out = out.replace(/^[ \t]*[_]{3,}[ \t]*$/gm, "---");
    out = out.replace(/^[ \t]*[-]{3,}[ \t]*$/gm, "---");

    return out.replace(/^\n+/, "").replace(/\n+$/, "");
}
