import { ContentType } from "../shared/types";

export interface AutomationTransformResult {
  text: string;
  displayText?: string;
  applied: string[];
  metadata: Record<string, unknown>;
}

const URL_REGEX = /(https?:\/\/[^\s)\]}>'"`]+)/gi;
const UTM_REGEX = /([?&])(utm_[^=&]+|fbclid|gclid)=[^&#]*/gi;

function stripTrackingParams(url: string): { value: string; removed: number } {
  const cleaned = url.replace(UTM_REGEX, (match, sep) =>
    sep === "?" ? "?" : "",
  );
  const normalized = cleaned
    .replace(/[?&]$/, "")
    .replace("?&", "?")
    .replace("&&", "&");
  const removed = (url.match(UTM_REGEX) ?? []).length;
  return { value: normalized, removed };
}

function normalizeLocaleFormatting(input: string): {
  text: string;
  changed: boolean;
} {
  let out = input;
  const before = out;
  out = out.replace(/\b(\d{1,3})\.(\d{3})\b/g, "$1,$2");
  out = out.replace(/\b(\d{4})\/(\d{2})\/(\d{2})\b/g, "$1-$2-$3");
  return { text: out, changed: before !== out };
}

function detectFieldIntent(
  targetApp: string | undefined,
  text: string,
): string {
  const app = String(targetApp ?? "").toLowerCase();
  const normalizedText = text.trim();
  const lineCount = normalizedText ? normalizedText.split(/\r?\n/).length : 0;

  if (app.includes("excel") || app.includes("sheets"))
    return "spreadsheet_cell";
  if (
    app.includes("cmd") ||
    app.includes("terminal") ||
    app.includes("powershell")
  )
    return "terminal";
  if (app.includes("slack") || app.includes("discord") || app.includes("teams"))
    return "chat_message";

  if (/^\s*(find|search|look up|query)\b/i.test(normalizedText)) {
    return "search_box";
  }
  if (
    /^\s*(re|fwd)\s*:/i.test(normalizedText) ||
    /^subject\s*:/i.test(normalizedText)
  ) {
    return "email_subject";
  }
  if (
    /^\s*(npm|pnpm|yarn|git|docker|kubectl|python|node|deno|go|cargo|composer)\b/i.test(
      normalizedText,
    )
  ) {
    return "command_line";
  }
  if (
    /^\s*(select|insert|update|delete|with|create|alter|drop)\b/i.test(
      normalizedText,
    )
  ) {
    return "query_input";
  }
  if (/^\s*[{[]/.test(normalizedText)) return "structured_input";
  if (/^\s*```/.test(normalizedText) || /^(\s{2,}|\t)\S/.test(normalizedText)) {
    return "code_block";
  }
  if (lineCount > 4 || text.length > 240) return "editor_body";
  return "general";
}

function healthGuard(input: string): { text: string; changes: number } {
  let out = input;
  let changes = 0;
  const before = out;
  out = out.replace(/[\u200B-\u200D\uFEFF]/g, "");
  out = out.replace(/\uFFFD/g, "");
  out = out.replace(/\s+$/gm, "");
  if (out !== before) {
    changes += 1;
  }
  return { text: out, changes };
}
function privacyFirewall(input: string): { text: string; blocked: number } {
  const patterns = [
    /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/g,
    /\bsk-[A-Za-z0-9]{20,}\b/g,
  ];
  let blocked = 0;
  let text = input;
  for (const pattern of patterns) {
    text = text.replace(pattern, () => {
      blocked += 1;
      return "[REDACTED_SECRET]";
    });
  }
  return { text, blocked };
}

export function applyAutomationTransforms(params: {
  text: string;
  contentType: ContentType;
  targetApp?: string;
  enableSmartUrlTransform: boolean;
  enableLocaleAwareness: boolean;
  enableIntentFieldDetection: boolean;
  enableHealthGuard: boolean;
  enablePrivacyFirewall: boolean;
  privacyRedactionMode?: "display_only" | "mutate_clipboard";
}): AutomationTransformResult {
  const applied: string[] = [];
  const metadata: Record<string, unknown> = {};
  let output = params.text;
  let displayText: string | undefined = undefined;

  if (params.enableHealthGuard) {
    const guarded = healthGuard(output);
    output = guarded.text;
    if (guarded.changes > 0) {
      applied.push("health-guard");
      metadata["healthChanges"] = guarded.changes;
    }
  }

  if (
    params.enableSmartUrlTransform &&
    (params.contentType === "url_text" ||
      params.contentType === "text_with_links")
  ) {
    let removed = 0;
    output = output.replace(URL_REGEX, (rawUrl) => {
      const cleaned = stripTrackingParams(rawUrl);
      removed += cleaned.removed;
      return cleaned.value;
    });
    if (removed > 0) {
      applied.push("smart-url-transform");
      metadata["trackingParamsRemoved"] = removed;
    }
  }

  if (params.enableLocaleAwareness) {
    const localized = normalizeLocaleFormatting(output);
    if (localized.changed) {
      output = localized.text;
      applied.push("locale-awareness");
    }
  }
  if (params.enablePrivacyFirewall) {
    const firewall = privacyFirewall(output);
    if (firewall.blocked > 0) {
      applied.push("privacy-firewall");
      metadata["secretsRedacted"] = firewall.blocked;
      const redactionMode = params.privacyRedactionMode ?? "display_only";
      metadata["privacyRedactionMode"] = redactionMode;
      displayText = firewall.text;
      if (redactionMode === "mutate_clipboard") {
        output = firewall.text;
      }
    }
  }
  if (params.enableIntentFieldDetection) {
    const intent = detectFieldIntent(params.targetApp, output);
    metadata["fieldIntent"] = intent;
    if (intent === "terminal") {
      output = output.replace(/\r?\n/g, " && ");
      applied.push("intent-terminal-flatten");
    } else if (intent === "search_box") {
      output = output.replace(/\r?\n/g, " ").trim();
      applied.push("intent-search-flatten");
    } else if (intent === "spreadsheet_cell") {
      output = output.replace(/\r\n/g, "\n");
    }
    applied.push("intent-aware-field-detection");
  }

  return {
    text: output,
    displayText: displayText ?? output,
    applied,
    metadata,
  };
}
