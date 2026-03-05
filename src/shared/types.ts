export type ContentType =
  | "plain_text"
  | "pdf_text"
  | "styled_html"
  | "structured_html"
  | "html_table"
  | "tsv_table"
  | "csv_table"
  | "json_data"
  | "yaml_data"
  | "toml_data"
  | "source_code"
  | "email_text"
  | "address"
  | "date_text"
  | "phone_number"
  | "url_text"
  | "path_text"
  | "color_code"
  | "math_expression"
  | "md_text"
  | "text_with_links"
  | "ocr_result"
  | "multi_clipboard"
  | "paste_queue"
  | "unknown";

export interface DetectionResult {
  type: ContentType;
  confidence: number;
  language?: string;
  metadata: Record<string, unknown>;
}

export interface ClipboardContent {
  text: string;
  html?: string;
  sourceApp?: string;
}

export interface CleanResult {
  cleaned: string;
  securityAlert: SecurityAlert | null;
  appliedTransforms?: string[];
  error?: unknown;
}

export type MaskMode = "full" | "partial" | "smart" | "skip";

export interface SensitiveMatch {
  type:
    | "email"
    | "phone_id"
    | "phone_intl"
    | "nik"
    | "credit_card"
    | "npwp"
    | "passport_id"
    | "bank_account"
    | "ip_address"
    | "aws_key"
    | "custom";
  value: string;
  startIndex: number;
  endIndex: number;
}

export interface SecurityAlert {
  matches: SensitiveMatch[];
  text: string;
}

export interface CustomPreset {
  id: string;
  name: string;
  options: Record<string, unknown>;
}

export interface ContextRule {
  id: string;
  name: string;
  sourceApp?: string;
  targetApp?: string;
  contentType?: ContentType;
  preset: string;
  transforms: string[];
  enabled: boolean;
}

export interface UsageDaily {
  date: string;
  chars_cleaned: number;
  paste_count: number;
  table_converts: number;
  ocr_count: number;
  ai_rewrites: number;
}

export interface AppSettings {
  general: {
    startOnBoot: boolean;
    minimizeToTray: boolean;
    startHidden: boolean;
    autoCleanOnCopy: boolean;
    language: "id" | "en";
    theme: "light" | "dark" | "system";
    hasSeenOnboarding: boolean;
    enableContextMenu: boolean;
    contextMenuMode?: "top_level" | "submenu";
  };
  hotkeys: {
    pasteClean: string;
    ocrCapture: string;
    screenshotCapture?: string;
    presetSwitch?: string;
    ghostWrite?: string;
    translateClipboard?: string;
    multiCopy: string;
    queueToggle: string;
    historyOpen: string;
    commandPalette?: string;
    undoLastPaste?: string;
  };
  presets: {
    active: string;
    custom: CustomPreset[];
  };
  security: {
    detectSensitive: boolean;
    autoClear: boolean;
    clearTimerSeconds: number;
    maskMode: Exclude<MaskMode, "skip">;
    unknownContextAction: "allow" | "warn" | "block";
  };
  history: {
    enabled: boolean;
    maxItems: number;
    retentionDays: number;
  };
  ai: {
    enabled: boolean;
    provider:
      | "local"
      | "openai"
      | "gemini"
      | "anthropic"
      | "deepseek"
      | "xai"
      | "custom";
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    autoDetect: boolean;
    aiMode?: "auto" | "fix_grammar" | "summarize" | "formalize" | "rephrase";
  };
  ocr: {
    languages: string[];
    autoClean: boolean;
  };
  sync: {
    enabled: boolean;
    deviceId: string;
    pairedDevices: { id: string; name: string }[];
  };
  appFilter?: {
    mode: "whitelist" | "blacklist" | "off";
    apps: string[];
  };
  appProfiles?: Array<{
    appName: string;
    cleanMode: "plain" | "code" | "email" | "doc" | "default";
    autoTranslate?: boolean;
    targetLang?: "id" | "en";
  }>;
  automation?: {
    trustModeDefault: "strict" | "balanced" | "passthrough";
    appTrustModes: Array<{
      appName: string;
      mode: "strict" | "balanced" | "passthrough";
    }>;
    enableUniversalFallback: boolean;
    enablePastePreview: boolean;
    previewHoldMs: number;
    enableCommandPalette: boolean;
    enableIntentFieldDetection: boolean;
    enableSmartUrlTransform: boolean;
    enableLocaleAwareness: boolean;
    enableHealthGuard: boolean;
    enableAutoLearning: boolean;
    enableRecipes: boolean;
    enableUndo: boolean;
    sessionClusterMinutes: number;
    paletteFavorites?: Array<{
      appName: string;
      presets: string[];
    }>;
  };
  privacy?: {
    enableEphemeralSensitiveClips: boolean;
    sensitiveTtlSeconds: number;
    sensitiveAllowlistApps: string[];
    enablePrivacyFirewall: boolean;
    firewallRedactionMode: "display_only" | "mutate_clipboard";
    autoMutateOnPublicApps: boolean;
    mutateClipboardApps: string[];
    neverPersistSensitive: boolean;
  };
  diagnostics?: {
    observabilityEnabled: boolean;
    maxEvents: number;
    telemetryDeviceId?: string;
  };
  recipes?: Array<{
    id: string;
    sourceApp?: string;
    targetApp?: string;
    contentType?: ContentType;
    preset: string;
    enabled: boolean;
  }>;
  autoLearnedRules?: Array<{
    id: string;
    appName: string;
    contentType: ContentType;
    fieldIntent?: string;
    suggestedPreset: string;
    confidence: number;
    count: number;
    updatedAt: string;
  }>;
}
