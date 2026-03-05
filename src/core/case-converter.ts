/**
 * Utilities to convert text between common casing styles.
 */

function splitWords(text: string): string[] {
  return text
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function capitalize(word: string): string {
  if (word.length === 0) return word;
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

/** Converts text to all uppercase. */
export function toUpperCase(text: string): string {
  return text.toUpperCase();
}

/** Converts text to all lowercase. */
export function toLowerCase(text: string): string {
  return text.toLowerCase();
}

/** Converts text to title case (every word capitalized). */
export function toTitleCase(text: string): string {
  return splitWords(text).map(capitalize).join(" ");
}

/** Converts text to camelCase. */
export function toCamelCase(text: string): string {
  const words = splitWords(text).map((word) => word.toLowerCase());
  if (words.length === 0) return "";
  const [first, ...rest] = words;
  return first + rest.map(capitalize).join("");
}

/** Converts text to snake_case. */
export function toSnakeCase(text: string): string {
  return splitWords(text)
    .map((word) => word.toLowerCase())
    .join("_");
}

/** Converts text to kebab-case. */
export function toKebabCase(text: string): string {
  return splitWords(text)
    .map((word) => word.toLowerCase())
    .join("-");
}

/** Converts text to PascalCase. */
export function toPascalCase(text: string): string {
  return splitWords(text)
    .map((word) => capitalize(word.toLowerCase()))
    .join("");
}

/** Converts text to sentence case (only first character uppercase). */
export function toSentenceCase(text: string): string {
  const normalized = text.trim().toLowerCase();
  if (normalized.length === 0) return "";
  return normalized.charAt(0).toUpperCase() + normalized.slice(1);
}
