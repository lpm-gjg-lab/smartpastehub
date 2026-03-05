import { AppSettings } from "../shared/types";

export type PrivacyRedactionMode = "display_only" | "mutate_clipboard";

const PUBLIC_APP_HINTS = [
  "slack",
  "discord",
  "teams",
  "telegram",
  "whatsapp",
  "line",
  "signal",
  "messenger",
  "chrome",
  "firefox",
  "edge",
  "brave",
  "opera",
  "vivaldi",
  "safari",
  "arc",
  "browser",
];

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function includesAny(haystack: string, needles: string[]): boolean {
  if (!haystack) return false;
  return needles.some((needle) => needle && haystack.includes(needle));
}

function getCustomMutateApps(settings: AppSettings): string[] {
  return (settings.privacy?.mutateClipboardApps ?? [])
    .map((entry) => normalize(entry))
    .filter(Boolean);
}

export function resolvePrivacyRedactionMode(
  settings: AppSettings,
  appName?: string,
): PrivacyRedactionMode {
  const fallback = settings.privacy?.firewallRedactionMode ?? "display_only";
  const normalizedApp = normalize(String(appName ?? ""));

  if (!normalizedApp) {
    return fallback;
  }

  if (includesAny(normalizedApp, getCustomMutateApps(settings))) {
    return "mutate_clipboard";
  }

  if (
    settings.privacy?.autoMutateOnPublicApps &&
    includesAny(normalizedApp, PUBLIC_APP_HINTS)
  ) {
    return "mutate_clipboard";
  }

  return fallback;
}
