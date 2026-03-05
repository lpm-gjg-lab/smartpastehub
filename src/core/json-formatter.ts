/**
 * Formatting helpers for JSON and lightweight cleanup for YAML/TOML text.
 */

/** Parses and pretty-prints JSON with configurable indentation. */
export function formatJson(text: string, indent = 2): string {
  try {
    const parsed: unknown = JSON.parse(text);
    return JSON.stringify(parsed, null, indent);
  } catch {
    return text;
  }
}

/** Parses JSON and emits a minified single-line representation. */
export function minifyJson(text: string): string {
  try {
    const parsed: unknown = JSON.parse(text);
    return JSON.stringify(parsed);
  } catch {
    return text;
  }
}

function basicIndentCleanup(text: string): string {
  const lines = text.split(/\r?\n/);
  const nonEmptyLines = lines.filter((line) => line.trim() !== "");
  if (nonEmptyLines.length === 0) return text;

  const normalizedLines = lines.map((line) =>
    line.replace(/\t/g, "  ").replace(/[ \t]+$/g, ""),
  );
  const leadingWidths = normalizedLines
    .filter((line) => line.trim() !== "")
    .map((line) => {
      const match = line.match(/^\s*/);
      return match ? match[0].length : 0;
    });

  const commonIndent =
    leadingWidths.length > 0 ? Math.min(...leadingWidths) : 0;
  if (commonIndent <= 0) return normalizedLines.join("\n");

  return normalizedLines
    .map((line) => {
      if (line.trim() === "") return "";
      return line.slice(commonIndent);
    })
    .join("\n");
}

/**
 * Formats structured data text.
 * - JSON: full parse + stringify formatting
 * - YAML/TOML: lightweight indentation normalization only
 */
export function formatData(
  text: string,
  type: "json" | "yaml" | "toml",
): string {
  if (type === "json") {
    return formatJson(text);
  }
  return basicIndentCleanup(text);
}
