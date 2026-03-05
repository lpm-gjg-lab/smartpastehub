import { MaskMode, SensitiveMatch } from "../shared/types";

type EffectiveMaskMode = Exclude<MaskMode, "skip" | "smart">;

const PARTIAL_TYPES = new Set<SensitiveMatch["type"]>([
  "email",
  "phone_id",
  "phone_intl",
  "ip_address",
]);

function resolveMatchMode(
  mode: MaskMode,
  type: SensitiveMatch["type"],
): EffectiveMaskMode {
  if (mode === "skip") {
    return "partial";
  }
  if (mode === "smart") {
    return PARTIAL_TYPES.has(type) ? "partial" : "full";
  }
  return mode;
}

function maskValue(value: string, mode: EffectiveMaskMode): string {
  if (mode === "full") {
    return value.replace(/[A-Za-z0-9]/g, "*");
  }
  const chars = value.split("");
  const keepStart = Math.max(1, Math.floor(chars.length * 0.2));
  const keepEnd = Math.max(1, Math.floor(chars.length * 0.2));
  return chars
    .map((ch, i) => {
      if (i < keepStart || i >= chars.length - keepEnd) return ch;
      return ch === " " || ch === "-" || ch === "." || ch === "@" ? ch : "*";
    })
    .join("");
}

export function maskData(
  text: string,
  matches: SensitiveMatch[],
  mode: MaskMode,
): string {
  if (mode === "skip") return text;
  if (matches.length === 0) return text;
  const sorted = [...matches].sort((a, b) => a.startIndex - b.startIndex);
  let result = "";
  let lastIndex = 0;
  for (const match of sorted) {
    result += text.slice(lastIndex, match.startIndex);
    result += maskValue(match.value, resolveMatchMode(mode, match.type));
    lastIndex = match.endIndex;
  }
  result += text.slice(lastIndex);
  return result;
}
