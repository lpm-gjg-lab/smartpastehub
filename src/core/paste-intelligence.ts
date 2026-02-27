import { ContentType, AppSettings } from "../shared/types";
import { FormattingIntent } from "./context-awareness";

type TargetAppType = "chat" | "browser" | "editor" | "terminal" | "unknown";

interface PasteIntelligenceInput {
  detectedType: ContentType;
  cleanedText: string;
  sourceHtml?: string;
  sourceAppName?: string;
  targetAppType: TargetAppType;
  targetAppName?: string;
  fieldIntent?: string;
  aiRewritten?: boolean;
  baselineIntent: FormattingIntent;
  autoLearnedRules?: AppSettings["autoLearnedRules"];
}

export interface PasteStrategyDecision {
  intent: FormattingIntent;
  confidence: number;
  reason: string;
  policyPack: string;
}

type PolicyOverride = {
  forceIntent?: FormattingIntent;
  richBoost?: number;
  plainBoost?: number;
  reason: string;
};

interface FormatLearningRule {
  id: string;
  appName: string;
  contentType: ContentType;
  suggestedPreset: string;
  confidence: number;
  count: number;
  updatedAt: string;
}

const STRUCTURE_TYPES = new Set<ContentType>([
  "styled_html",
  "structured_html",
  "html_table",
  "csv_table",
  "tsv_table",
  "md_text",
]);

const ALWAYS_PLAIN_TYPES = new Set<ContentType>([
  "source_code",
  "json_data",
  "yaml_data",
  "toml_data",
  "path_text",
  "math_expression",
]);

const DOC_APPS = /(word|onenote|outlook|notion|docs|google docs)/i;
const CHAT_APPS = /(slack|discord|teams|telegram|whatsapp|line|wechat)/i;
const BROWSER_APPS = /(chrome|firefox|edge|brave|opera|arc)/i;
const CODE_APPS = /(code|cursor|sublime|vim|nvim|idea|webstorm)/i;
const PLAIN_APPS =
  /(terminal|powershell|cmd|shell|notepad|alacritty|wezterm|konsole|iterm)/i;
const SPREADSHEET_APPS = /(excel|sheets|google sheets|numbers)/i;

const APP_POLICY_OVERRIDES: Array<{
  appPattern: RegExp;
  contentType?: ContentType;
  fieldPattern?: RegExp;
  override: PolicyOverride;
}> = [
  {
    appPattern: /(slack|teams|discord)/i,
    contentType: "md_text",
    override: {
      richBoost: 0.25,
      reason: "chat-md-rich",
    },
  },
  {
    appPattern: /(gmail|outlook)/i,
    fieldPattern: /(subject|title|search)/i,
    override: {
      forceIntent: "plain_text",
      reason: "mail-compact-field",
    },
  },
  {
    appPattern: /(excel|sheets|google sheets)/i,
    contentType: "html_table",
    override: {
      forceIntent: "plain_text",
      reason: "spreadsheet-table-force-plain",
    },
  },
  {
    appPattern: /(word|notion|docs|google docs)/i,
    contentType: "structured_html",
    override: {
      richBoost: 0.3,
      reason: "doc-structure-rich",
    },
  },
  {
    appPattern: /(terminal|powershell|cmd)/i,
    override: {
      forceIntent: "plain_text",
      reason: "terminal-force-plain",
    },
  },
];

function resolvePolicyOverride(input: {
  appName: string;
  contentType: ContentType;
  fieldIntent: string;
}): PolicyOverride | null {
  for (const policy of APP_POLICY_OVERRIDES) {
    if (!policy.appPattern.test(input.appName)) {
      continue;
    }

    if (policy.contentType && policy.contentType !== input.contentType) {
      continue;
    }

    if (policy.fieldPattern && !policy.fieldPattern.test(input.fieldIntent)) {
      continue;
    }

    return policy.override;
  }

  return null;
}

const LIST_LINE_PATTERN = /^\s*(?:[-*+•▪◦]|\d+[.)]|[A-Za-z][.)])\s+/m;
const TABLE_LINE_PATTERN = /^\|.+\|\s*$/m;

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function normalizeAppName(appName?: string): string {
  return String(appName ?? "unknown").trim() || "unknown";
}

function resolvePolicyPack(appType: TargetAppType, appName: string): string {
  if (appType === "terminal" || PLAIN_APPS.test(appName))
    return "terminal-safe";
  if (SPREADSHEET_APPS.test(appName)) return "spreadsheet-structured";
  if (DOC_APPS.test(appName)) return "document-rich";
  if (CHAT_APPS.test(appName)) return "chat-compact";
  if (CODE_APPS.test(appName)) return "code-safe";
  if (appType === "browser" || BROWSER_APPS.test(appName))
    return "browser-balanced";
  return "default-balanced";
}

function learnedBias(
  learnedRules: AppSettings["autoLearnedRules"] | undefined,
  appName: string,
  detectedType: ContentType,
): { rich: number; plain: number } {
  const rules = learnedRules ?? [];
  let rich = 0;
  let plain = 0;

  for (const rule of rules) {
    if (!rule.id.startsWith("format-")) continue;
    if (rule.appName.toLowerCase() !== appName.toLowerCase()) continue;
    if (rule.contentType !== detectedType) continue;

    const weightedConfidence = clamp(rule.confidence, 0, 1) * 0.45;
    if (rule.suggestedPreset === "format:rich") {
      rich += weightedConfidence;
    }
    if (rule.suggestedPreset === "format:plain") {
      plain += weightedConfidence;
    }
  }

  return { rich, plain };
}

export function planPasteStrategy(
  input: PasteIntelligenceInput,
): PasteStrategyDecision {
  const appName = normalizeAppName(input.targetAppName);
  const sourceAppName = normalizeAppName(input.sourceAppName);
  const fieldIntent = String(input.fieldIntent ?? "").toLowerCase();
  const text = String(input.cleanedText ?? "");
  const hasHtml = Boolean(String(input.sourceHtml ?? "").trim());
  const hasList = LIST_LINE_PATTERN.test(text);
  const hasTable =
    TABLE_LINE_PATTERN.test(text) || input.detectedType === "html_table";
  const isStructureContent =
    STRUCTURE_TYPES.has(input.detectedType) || hasList || hasTable;
  const policyPack = resolvePolicyPack(input.targetAppType, appName);

  let richScore = 0.15;
  let plainScore = 0.15;
  const reasons: string[] = [];

  if (input.baselineIntent === "rich_text") {
    richScore += 0.25;
    reasons.push("baseline-rich");
  } else {
    plainScore += 0.2;
    reasons.push("baseline-plain");
  }

  if (ALWAYS_PLAIN_TYPES.has(input.detectedType)) {
    plainScore += 0.7;
    reasons.push("plain-type");
  }

  switch (policyPack) {
    case "terminal-safe":
      plainScore += 0.8;
      reasons.push("terminal-pack");
      break;
    case "document-rich":
      richScore += isStructureContent ? 0.65 : 0.3;
      reasons.push("document-pack");
      break;
    case "chat-compact":
      richScore += hasList || hasTable ? 0.5 : 0.2;
      plainScore += 0.1;
      reasons.push("chat-pack");
      break;
    case "spreadsheet-structured":
      if (
        hasTable ||
        input.detectedType === "csv_table" ||
        input.detectedType === "tsv_table"
      ) {
        plainScore += 0.55;
        reasons.push("spreadsheet-table-plain");
      } else {
        plainScore += 0.3;
        richScore += 0.1;
      }
      reasons.push("spreadsheet-pack");
      break;
    case "code-safe":
      plainScore += 0.6;
      richScore +=
        isStructureContent && !ALWAYS_PLAIN_TYPES.has(input.detectedType)
          ? 0.15
          : 0;
      reasons.push("code-pack");
      break;
    case "browser-balanced":
      richScore += hasHtml && isStructureContent ? 0.45 : 0.2;
      reasons.push("browser-pack");
      break;
    default:
      richScore += hasHtml && isStructureContent ? 0.35 : 0.1;
      plainScore += 0.1;
      reasons.push("default-pack");
  }

  if (
    fieldIntent.includes("code") ||
    fieldIntent.includes("command") ||
    fieldIntent.includes("query")
  ) {
    plainScore += 0.45;
    reasons.push("field-code-like");
  }

  if (
    fieldIntent.includes("title") ||
    fieldIntent.includes("subject") ||
    fieldIntent.includes("search")
  ) {
    plainScore += 0.35;
    reasons.push("field-compact");
  }

  if (
    fieldIntent.includes("body") ||
    fieldIntent.includes("message") ||
    fieldIntent.includes("editor")
  ) {
    richScore += isStructureContent ? 0.35 : 0.1;
    reasons.push("field-rich-friendly");
  }

  const sourceIsCode = CODE_APPS.test(sourceAppName);
  const targetIsDocOrChat =
    policyPack === "document-rich" || policyPack === "chat-compact";
  if (
    sourceIsCode &&
    targetIsDocOrChat &&
    input.detectedType === "source_code"
  ) {
    plainScore += 0.5;
    reasons.push("source-code-protect");
  }

  if (sourceAppName === appName && isStructureContent) {
    richScore += 0.2;
    reasons.push("same-app-structure");
  }

  const policyOverride = resolvePolicyOverride({
    appName,
    contentType: input.detectedType,
    fieldIntent,
  });
  if (policyOverride) {
    richScore += policyOverride.richBoost ?? 0;
    plainScore += policyOverride.plainBoost ?? 0;
    reasons.push(policyOverride.reason);
  }

  if (hasHtml && isStructureContent) {
    richScore += 0.25;
    reasons.push("html-structure");
  }

  if (input.aiRewritten && !isStructureContent) {
    plainScore += 0.2;
    reasons.push("ai-rewrite-non-structure");
  }

  const learned = learnedBias(
    input.autoLearnedRules,
    appName,
    input.detectedType,
  );
  richScore += learned.rich;
  plainScore += learned.plain;
  if (learned.rich > 0 || learned.plain > 0) {
    reasons.push("learned-bias");
  }

  const safeBias = input.targetAppType === "unknown" ? 0.15 : 0;
  plainScore += safeBias;
  if (safeBias > 0) {
    reasons.push("unknown-target-safe-bias");
  }

  const total = richScore + plainScore;
  const diff = Math.abs(richScore - plainScore);
  const confidence = clamp(total > 0 ? diff / total : 0, 0, 1);

  let intent: FormattingIntent =
    richScore >= plainScore ? "rich_text" : "plain_text";

  if (
    confidence < 0.18 &&
    policyPack !== "document-rich" &&
    policyPack !== "chat-compact"
  ) {
    intent = "plain_text";
    reasons.push("low-confidence-fallback");
  }

  if (ALWAYS_PLAIN_TYPES.has(input.detectedType)) {
    intent = "plain_text";
  }

  if (
    fieldIntent.includes("code") ||
    fieldIntent.includes("command") ||
    fieldIntent.includes("query")
  ) {
    intent = "plain_text";
    reasons.push("field-hard-plain");
  }

  if (policyOverride?.forceIntent) {
    intent = policyOverride.forceIntent;
    reasons.push("policy-force");
  }

  return {
    intent,
    confidence,
    reason: reasons.join(","),
    policyPack,
  };
}

function formatRuleId(appName: string, contentType: ContentType): string {
  const normalized = appName.toLowerCase().replace(/[^a-z0-9]+/g, "_");
  return `format-${normalized}-${contentType}`;
}

export function learnPasteStrategyFeedback(
  existingRules: AppSettings["autoLearnedRules"] | undefined,
  input: {
    appName: string;
    contentType: ContentType;
    selectedIntent: FormattingIntent;
    confidence: number;
  },
): NonNullable<AppSettings["autoLearnedRules"]> {
  const rules = [...(existingRules ?? [])];
  const appName = normalizeAppName(input.appName);
  const id = formatRuleId(appName, input.contentType);
  const strategyPreset =
    input.selectedIntent === "rich_text" ? "format:rich" : "format:plain";
  const confidence = clamp(input.confidence, 0.15, 0.95);
  const idx = rules.findIndex((rule) => rule.id === id);

  if (idx >= 0) {
    const current = rules[idx];
    if (!current) return rules;

    const sameIntent = current.suggestedPreset === strategyPreset;
    const nextCount = sameIntent
      ? current.count + 1
      : Math.max(1, current.count - 1);
    const blendedConfidence = clamp(
      sameIntent
        ? current.confidence * 0.7 + confidence * 0.3
        : current.confidence * 0.6 + confidence * 0.2,
      0.1,
      0.98,
    );

    rules[idx] = {
      ...current,
      suggestedPreset: sameIntent ? current.suggestedPreset : strategyPreset,
      count: nextCount,
      confidence: blendedConfidence,
      updatedAt: new Date().toISOString(),
    };
    return rules;
  }

  rules.push({
    id,
    appName,
    contentType: input.contentType,
    suggestedPreset: strategyPreset,
    confidence,
    count: 1,
    updatedAt: new Date().toISOString(),
  });
  return rules;
}

export function applyExplicitPasteFeedback(
  existingRules: AppSettings["autoLearnedRules"] | undefined,
  input: {
    appName: string;
    contentType: ContentType;
    expectedIntent: FormattingIntent;
    weight?: number;
  },
): NonNullable<AppSettings["autoLearnedRules"]> {
  const weight = clamp(input.weight ?? 1, 1, 5);
  let rules = [...(existingRules ?? [])] as NonNullable<
    AppSettings["autoLearnedRules"]
  >;

  for (let i = 0; i < weight; i += 1) {
    rules = learnPasteStrategyFeedback(rules, {
      appName: input.appName,
      contentType: input.contentType,
      selectedIntent: input.expectedIntent,
      confidence: clamp(0.65 + i * 0.05, 0.65, 0.95),
    });
  }

  return rules;
}
