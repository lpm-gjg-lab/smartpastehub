export type ContentType =
  | 'plain_text'
  | 'pdf_text'
  | 'styled_html'
  | 'structured_html'
  | 'html_table'
  | 'tsv_table'
  | 'csv_table'
  | 'json_data'
  | 'yaml_data'
  | 'toml_data'
  | 'source_code'
  | 'email_text'
  | 'address'
  | 'ocr_result'
  | 'unknown';

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
  error?: unknown;
}

export type MaskMode = 'full' | 'partial' | 'skip';

export interface SensitiveMatch {
  type:
    | 'email'
    | 'phone_id'
    | 'phone_intl'
    | 'nik'
    | 'credit_card'
    | 'npwp'
    | 'passport_id'
    | 'bank_account'
    | 'ip_address'
    | 'aws_key'
    | 'custom';
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
    language: 'id' | 'en';
    theme: 'light' | 'dark' | 'system';
  };
  hotkeys: {
    pasteClean: string;
    ocrCapture: string;
    multiCopy: string;
    queueToggle: string;
    historyOpen: string;
  };
  presets: {
    active: string;
    custom: CustomPreset[];
  };
  security: {
    detectSensitive: boolean;
    autoClear: boolean;
    clearTimerSeconds: number;
    maskMode: Exclude<MaskMode, 'skip'>;
  };
  history: {
    enabled: boolean;
    maxItems: number;
    retentionDays: number;
  };
  ai: {
    enabled: boolean;
    provider: 'local' | 'openai' | 'gemini';
    apiKey?: string;
    autoDetect: boolean;
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
  license: {
    tier: 'free' | 'pro' | 'ultimate';
    key?: string;
    activatedAt?: string;
  };
}
