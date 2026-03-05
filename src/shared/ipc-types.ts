import { ContentType, MaskMode, SensitiveMatch } from "./types";

export interface IPCEvents {
  "clipboard:content": {
    text: string;
    html?: string;
    type: ContentType;
    mergedCount?: number;
    maxItems?: number;
  };
  "clipboard:cleaned": {
    original: string;
    cleaned: string;
    type: ContentType;
    sourceApp?: string;
  };
  "clipboard:paste": { preset: string; transforms: string[] };
  "clipboard:detect": { text: string; html?: string };
  "clipboard:ghost-write": { text?: string } | string;
  "clipboard:auto-cleared": { seconds: number };

  "security:alert": { matches: SensitiveMatch[]; text: string };
  "security:policy": {
    action: "allow" | "warn" | "block";
    reason: string;
    targetApp?: string;
    appType?: string;
    autoClearAfterSeconds?: number;
  };
  "security:mask": { mode: MaskMode; matches: SensitiveMatch[] };
  "security:scan": { text: string };

  "ocr:start": void;
  "ocr:result": { text: string; confidence: number; error?: string };

  "ai:detect": { type: ContentType; confidence: number };
  "ai:rewrite": {
    text: string;
    mode?: "fix_grammar" | "rephrase" | "summarize" | "formalize";
    options?: {
      mode: "fix_grammar" | "rephrase" | "summarize" | "formalize";
      language?: "id" | "en";
      provider?: "local" | "openai" | "gemini" | "anthropic" | "deepseek" | "xai" | "custom";
      apiKey?: string;
      baseUrl?: string;
      model?: string;
    };
  };
  "ai:test-connection": void;

  "sync:status": {
    connected: boolean;
    devices: { id: string; name: string }[];
  };
  "sync:incoming": { text: string; fromDevice: string };
  "sync:connected": { roomId: string; deviceId: string };
  "sync:disconnected": { roomId: string; deviceId: string };
  "sync:received": { text: string; fromDeviceId: string };

  "settings:get": void;
  "settings:update": Record<string, unknown>;

  "history:list": { page: number; search?: string };
  "history:pin": { id: number; pinned: boolean };
  "history:delete": { id: number };
  "history:update": { id: number; cleanedText: string; aiMode?: string | null };
  "history:delete-many": { ids: number[] };
  "history:clear": void;
  "history:restore": {
    entries: Array<{
      originalText: string;
      cleanedText: string;
      htmlContent?: string | null;
      contentType: string;
      sourceApp?: string | null;
      presetUsed?: string | null;
      charCount?: number;
      isPinned?: boolean;
      isSensitive?: boolean;
      createdAt?: string;
    }>;
  };
  "snippet:list": { category?: string };
  "snippet:create": {
    name: string;
    content: string;
    tags?: string[];
    category?: string;
  };
  "template:fill": { id: number; values: Record<string, string> };
  "clipper:clip-url": { html: string; url?: string };
  "clipper:to-markdown": string;
  "clipper:to-plaintext": string;
  "qr:generate": {
    text: string;
    options?: { errorCorrection?: "L" | "M" | "Q" | "H"; size?: number };
  };
  "ring:get-items": void;
  "ring:search": string;
  "ring:select": number;
  "ring:delete": number;
  "ring:pin": number;
  "dragdrop:get-items": void;
  "dragdrop:add-item": { content: string; contentType?: string };
  "dragdrop:reorder": number[];
  "dragdrop:combine": { separator?: string };
  "dragdrop:clear": void;
  "chart:generate": { text: string };
  "transform:convert-format": {
    text: string;
    targetFormat: "json" | "yaml" | "toml";
  };
  "transform:math": string;
  "transform:color": string;
  "transform:md-to-rtf": string;
  "transform:open-links": string;
  "transform:extract-file": string;
  "transform:scrape-url": string;
  "transform:make-secret": string;
  "transform:case-convert": { text: string; targetCase: string };
  "transform:translate": { text: string; targetLang: "id" | "en" };
  "ai:detect-tone": { text: string };
  "ai:summarize-url": { url: string };
  "clipboard:redact": { text: string };
  "snippet:expand": { trigger: string };
  "settings:get-app-profiles": void;
  "settings:context-rules:list": void;
  "settings:context-rules:create": {
    name: string;
    sourceApp?: string | null;
    targetApp?: string | null;
    contentType?: string | null;
    preset: string;
    transforms?: string[];
    priority?: number;
    enabled?: boolean;
  };
  "settings:context-rules:update": {
    id: number;
    name: string;
    sourceApp?: string | null;
    targetApp?: string | null;
    contentType?: string | null;
    preset: string;
    transforms?: string[];
    priority?: number;
    enabled?: boolean;
  };
  "settings:context-rules:delete": { id: number };
  "settings:set-app-profile": {
    appName: string;
    cleanMode: "plain" | "code" | "email" | "doc" | "default";
    autoTranslate?: boolean;
    targetLang?: "id" | "en";
  };
  "settings:set-trust-mode": {
    appName: string;
    mode: "strict" | "balanced" | "passthrough";
  };
  "settings:context-menu-status": void;
  "settings:context-menu-repair": {
    mode?: "install" | "uninstall";
    menuMode?: "top_level" | "submenu";
  };
  "settings:export-portable": { passphrase: string };
  "settings:import-portable": { passphrase: string; data: string };
  "diagnostics:observability": { limit?: number };
  "timeline:clusters": void;
  "diagnostics:fallback-methods": void;
  "automation:set-active-preset": { presetId: string; appName?: string };
  "automation:paste-feedback": {
    appName: string;
    contentType: ContentType;
    fieldIntent?: string;
    expectedIntent: "plain_text" | "rich_text";
    weight?: number;
  };
  "automation:feedback-action": {
    expectedIntent: "plain_text" | "rich_text";
    applyNow?: boolean;
    weight?: number;
  };
}
