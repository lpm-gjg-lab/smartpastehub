/**
 * Normalizes pasted code indentation by de-indenting shared leading whitespace
 * and converting indentation to a consistent target style.
 */

export type IndentTarget = "spaces" | "tabs";

function leadingWhitespace(line: string): string {
  const match = line.match(/^[\t ]*/);
  return match ? match[0] : "";
}

function detectIndentProfile(lines: string[]): {
  usesTabs: boolean;
  indentSize: 2 | 4;
} {
  let tabIndentedLines = 0;
  let spaceIndentedLines = 0;
  let twoSpaceHits = 0;
  let fourSpaceHits = 0;

  for (const line of lines) {
    if (line.trim() === "") continue;
    const indent = leadingWhitespace(line);
    if (indent.length === 0) continue;

    if (indent.includes("\t")) {
      tabIndentedLines += 1;
    }

    const spaceCount = indent.replace(/\t/g, "").length;
    if (spaceCount > 0) {
      spaceIndentedLines += 1;
      if (spaceCount % 4 === 0) {
        fourSpaceHits += 1;
      }
      if (spaceCount % 2 === 0) {
        twoSpaceHits += 1;
      }
    }
  }

  const usesTabs = tabIndentedLines > spaceIndentedLines;
  const indentSize: 2 | 4 = fourSpaceHits > twoSpaceHits ? 4 : 2;
  return { usesTabs, indentSize };
}

function indentWidth(indent: string, tabWidth: number): number {
  let width = 0;
  for (const char of indent) {
    if (char === "\t") {
      width += tabWidth;
    } else {
      width += 1;
    }
  }
  return width;
}

function buildIndent(
  width: number,
  targetIndent: IndentTarget,
  size: number,
): string {
  if (width <= 0) return "";
  if (targetIndent === "spaces") {
    return " ".repeat(width);
  }

  const tabCount = Math.floor(width / size);
  const remainderSpaces = width % size;
  return "\t".repeat(tabCount) + " ".repeat(remainderSpaces);
}

/**
 * Fixes mixed indentation and strips common leading indentation from all
 * non-empty lines while preserving empty lines.
 */
export function fixIndentation(
  text: string,
  targetIndent: IndentTarget = "spaces",
  size = 2,
): string {
  const lines = text.split(/\r?\n/);
  const nonEmpty = lines.filter((line) => line.trim() !== "");
  if (nonEmpty.length === 0) {
    return text;
  }

  const profile = detectIndentProfile(lines);
  const sourceTabWidth = profile.usesTabs ? 4 : profile.indentSize;

  const commonIndent = Math.min(
    ...nonEmpty.map((line) =>
      indentWidth(leadingWhitespace(line), sourceTabWidth),
    ),
  );

  return lines
    .map((line) => {
      if (line.trim() === "") {
        return "";
      }

      const indent = leadingWhitespace(line);
      const content = line.slice(indent.length);
      const width = indentWidth(indent, sourceTabWidth);
      const normalizedWidth = Math.max(0, width - commonIndent);
      return `${buildIndent(normalizedWidth, targetIndent, size)}${content}`;
    })
    .join("\n");
}
