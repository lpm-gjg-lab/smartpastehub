/**
 * path-converter.ts
 *
 * Converts file paths between Windows and Unix-like formats.
 */

export type PathTarget = "windows" | "unix" | "auto";

function stripSurroundingQuotes(text: string): string {
  const trimmed = text.trim();
  if (trimmed.length >= 2) {
    const first = trimmed[0];
    const last = trimmed[trimmed.length - 1];
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return trimmed.slice(1, -1);
    }
  }
  return trimmed;
}

function isWindowsPath(path: string): boolean {
  return (
    /^[a-zA-Z]:[\\/]/.test(path) ||
    /^[a-zA-Z]:$/.test(path) ||
    /^\\\\[^\\]+\\[^\\]+/.test(path)
  );
}

function isUnixPath(path: string): boolean {
  return /^\//.test(path);
}

function normalizeUnixPath(path: string): string {
  if (path.startsWith("//")) {
    const rest = path.slice(2).replace(/\/+/g, "/");
    return `//${rest}`;
  }
  return path.replace(/\/+/g, "/");
}

function normalizeWindowsPath(path: string): string {
  if (path.startsWith("\\\\")) {
    const rest = path.slice(2).replace(/\\+/g, "\\");
    return `\\\\${rest}`;
  }
  return path.replace(/\\+/g, "\\");
}

function toUnix(path: string): string {
  if (path.startsWith("\\\\")) {
    const rest = path.slice(2).replace(/[\\/]+/g, "/");
    return `//${rest}`;
  }

  const normalized = path.replace(/[\\/]+/g, "\\");

  if (normalized.startsWith("\\\\")) {
    const rest = normalized.slice(2).replace(/\\+/g, "/");
    return `//${rest}`;
  }

  const driveMatch = normalized.match(/^([a-zA-Z]):\\?(.*)$/);
  if (driveMatch) {
    const drive = (driveMatch[1] ?? "").toLowerCase();
    const rest = (driveMatch[2] ?? "").replace(/\\+/g, "/");
    return rest ? `/${drive}/${rest}` : `/${drive}/`;
  }

  return normalizeUnixPath(normalized.replace(/\\+/g, "/"));
}

function toWindows(path: string): string {
  const normalized = path.replace(/[\\/]+/g, "/");

  if (normalized.startsWith("//")) {
    const rest = normalized.slice(2).replace(/\/+/g, "\\");
    return `\\\\${rest}`;
  }

  const driveMatch = normalized.match(/^\/([a-zA-Z])(?:\/(.*))?$/);
  if (driveMatch) {
    const drive = (driveMatch[1] ?? "C").toUpperCase();
    const rest = (driveMatch[2] ?? "").replace(/\/+/g, "\\");
    return rest ? `${drive}:\\${rest}` : `${drive}:\\`;
  }

  if (normalized.startsWith("/")) {
    const rest = normalized.slice(1).replace(/\/+/g, "\\");
    return `C:\\${rest}`;
  }

  return normalizeWindowsPath(normalized.replace(/\/+/g, "\\"));
}

/**
 * Convert a path between Windows and Unix-like styles.
 *
 * - `auto`: Windows -> Unix, Unix -> Windows, unknown -> normalized only
 * - `windows`: force Windows conversion
 * - `unix`: force Unix conversion
 */
export function convertPath(text: string, target: PathTarget = "auto"): string {
  const raw = stripSurroundingQuotes(text);
  if (!raw) {
    return raw;
  }

  if (target === "unix") {
    return toUnix(raw);
  }

  if (target === "windows") {
    return toWindows(raw);
  }

  if (isWindowsPath(raw)) {
    return toUnix(raw);
  }

  if (isUnixPath(raw)) {
    return toWindows(raw);
  }

  if (raw.includes("\\")) {
    return normalizeWindowsPath(raw);
  }

  if (raw.includes("/")) {
    return normalizeUnixPath(raw);
  }

  return raw;
}
