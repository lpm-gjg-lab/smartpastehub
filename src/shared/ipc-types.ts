import { ContentType, MaskMode, SensitiveMatch } from './types';

export interface IPCEvents {
  'clipboard:content': { text: string; html?: string; type: ContentType };
  'clipboard:cleaned': { original: string; cleaned: string; type: ContentType };
  'clipboard:paste': { preset: string; transforms: string[] };
  'clipboard:detect': { text: string; html?: string };

  'security:alert': { matches: SensitiveMatch[]; text: string };
  'security:mask': { mode: MaskMode; matches: SensitiveMatch[] };
  'security:scan': { text: string };

  'ocr:start': void;
  'ocr:result': { text: string; confidence: number; error?: string };

  'ai:detect': { type: ContentType; confidence: number };
  'ai:rewrite': { text: string; mode: string };
  'ai:result': { original: string; rewritten: string };

  'sync:status': { connected: boolean; devices: { id: string; name: string }[] };
  'sync:incoming': { text: string; fromDevice: string };

  'settings:get': void;
  'settings:update': Record<string, unknown>;

  'history:list': { page: number; search?: string };
  'history:pin': { id: number; pinned: boolean };
  'history:delete': { id: number };
  'snippet:list': { category?: string };
  'snippet:create': { name: string; content: string; tags?: string[]; category?: string };
  'template:fill': { id: number; values: Record<string, string> };
}
