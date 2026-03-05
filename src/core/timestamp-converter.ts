type TimestampFormat = "iso" | "human" | "relative";

const EPOCH_ONLY_PATTERN = /^-?\d{10,16}$/;
const ISO_LIKE_PATTERN =
  /^\d{4}-\d{2}-\d{2}(?:[Tt\s]\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

function toEpochMilliseconds(epoch: number): number {
  return Math.abs(epoch) >= 1_000_000_000_000 ? epoch : epoch * 1000;
}

function formatHumanDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function formatRelativeDate(date: Date): string {
  const secondsDiff = Math.round((date.getTime() - Date.now()) / 1000);
  const absSeconds = Math.abs(secondsDiff);

  if (absSeconds < 60) {
    return secondsDiff >= 0
      ? `in ${absSeconds} seconds`
      : `${absSeconds} seconds ago`;
  }

  const minutesDiff = Math.round(absSeconds / 60);
  if (minutesDiff < 60) {
    return secondsDiff >= 0
      ? `in ${minutesDiff} minutes`
      : `${minutesDiff} minutes ago`;
  }

  const hoursDiff = Math.round(minutesDiff / 60);
  if (hoursDiff < 24) {
    return secondsDiff >= 0
      ? `in ${hoursDiff} hours`
      : `${hoursDiff} hours ago`;
  }

  const daysDiff = Math.round(hoursDiff / 24);
  return secondsDiff >= 0 ? `in ${daysDiff} days` : `${daysDiff} days ago`;
}

/**
 * Format a Unix timestamp into ISO, human-readable, or relative text.
 */
export function formatTimestamp(
  epoch: number,
  format: TimestampFormat = "iso",
): string {
  const date = new Date(toEpochMilliseconds(epoch));
  if (Number.isNaN(date.getTime())) {
    return "Invalid date";
  }

  if (format === "human") {
    return formatHumanDate(date);
  }
  if (format === "relative") {
    return formatRelativeDate(date);
  }
  return date.toISOString();
}

/**
 * Convert timestamp-like input between Unix epoch, ISO 8601, and readable date.
 */
export function convertTimestamp(text: string): string {
  const trimmed = text.trim();
  if (!trimmed) {
    return text;
  }

  if (EPOCH_ONLY_PATTERN.test(trimmed)) {
    const epochNumber = Number(trimmed);
    const date = new Date(toEpochMilliseconds(epochNumber));
    if (Number.isNaN(date.getTime())) {
      return text;
    }
    return `${trimmed} -> ${date.toISOString()} (${formatHumanDate(date)})`;
  }

  if (ISO_LIKE_PATTERN.test(trimmed)) {
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      return text;
    }
    const epoch = Math.floor(parsed.getTime() / 1000);
    return `${trimmed} -> ${epoch} (${formatHumanDate(parsed)})`;
  }

  const parsedDate = new Date(trimmed);
  if (Number.isNaN(parsedDate.getTime())) {
    return text;
  }
  return `${trimmed} -> ${parsedDate.toISOString()}`;
}
