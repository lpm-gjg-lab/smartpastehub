import { BrowserWindow } from "electron";
import { HistoryRepository } from "../repositories/history.repo";
import { SnippetsRepository } from "../repositories/snippets.repo";
import { TemplatesRepository } from "../repositories/templates.repo";
import { UsageStatsRepository } from "../repositories/usage-stats.repo";
import { ContextRulesRepository } from "../repositories/context-rules.repo";

export type PayloadValidator<P> = (payload: unknown) => P;

export type SafeHandle = <T, P = unknown>(
  channel: string,
  handler: (event: Electron.IpcMainInvokeEvent, payload: P) => Promise<T> | T,
  validate?: PayloadValidator<P>,
) => void;

export interface IpcDependencies {
  mainWindow: BrowserWindow;
  reloadHotkeys: () => Promise<void>;
  createFloatingWindow: (
    route: string,
    width?: number,
    height?: number,
  ) => BrowserWindow;
  historyRepo: HistoryRepository;
  snippetsRepo: SnippetsRepository;
  templatesRepo: TemplatesRepository;
  usageStatsRepo: UsageStatsRepository;
  contextRulesRepo: ContextRulesRepository;
  getFallbackMethods: () => Array<{ app: string; method: string }>;
  submitPasteFeedback: (payload: {
    expectedIntent: "plain_text" | "rich_text";
    applyNow?: boolean;
    weight?: number;
  }) => Promise<{
    appliedNow: boolean;
    expectedIntent: "plain_text" | "rich_text";
    appName?: string;
    contentType?: string;
  }>;
}
