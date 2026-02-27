import { BrowserWindow } from "electron";
import { HistoryRepository } from "../repositories/history.repo";
import { SnippetsRepository } from "../repositories/snippets.repo";
import { TemplatesRepository } from "../repositories/templates.repo";
import { UsageStatsRepository } from "../repositories/usage-stats.repo";

export type SafeHandle = <T>(
  channel: string,
  handler: (
    event: Electron.IpcMainInvokeEvent,
    payload: unknown,
  ) => Promise<T> | T,
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
  confirmPreview: () => Promise<boolean>;
  cancelPreview: () => void;
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
