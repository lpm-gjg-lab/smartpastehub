import { ClipboardContent } from '../shared/types';

export interface SmartPastePlugin {
  name: string;
  version: string;
  description: string;
  author: string;
  onActivate(api: PluginAPI): void;
  onDeactivate(): void;
}

export interface PluginAPI {
  onBeforeClean(callback: (content: ClipboardContent) => ClipboardContent): void;
  onAfterClean(callback: (content: ClipboardContent) => ClipboardContent): void;
  registerTransform(name: string, fn: (text: string) => string): void;
  registerPreset(preset: { id: string; name: string; options: Record<string, unknown> }): void;
  registerContextRule(rule: Record<string, unknown>): void;
  registerSettingsPanel(component: unknown): void;
  storage: {
    get(key: string): Promise<unknown>;
    set(key: string, value: unknown): Promise<void>;
  };
  log: {
    info(message: string): void;
    warn(message: string): void;
    error(message: string): void;
  };
}
