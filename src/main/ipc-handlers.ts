import { BrowserWindow } from "electron";
import { Database } from "./db";
import { registerAllIpcHandlers } from "./ipc";
import { HistoryRepository } from "./repositories/history.repo";
import { SnippetsRepository } from "./repositories/snippets.repo";
import { TemplatesRepository } from "./repositories/templates.repo";
import { UsageStatsRepository } from "./repositories/usage-stats.repo";
import { setHistoryRepo } from "./history-repo-ref";
export function registerIpcHandlers(
  mainWindow: BrowserWindow,
  db: Database,
  reloadHotkeys: () => Promise<void>,
  createFloatingWindow: (
    route: string,
    width?: number,
    height?: number,
  ) => BrowserWindow,
  confirmPreview: () => Promise<boolean>,
  cancelPreview: () => void,
  getFallbackMethods: () => Array<{ app: string; method: string }>,
  submitPasteFeedback: (payload: {
    expectedIntent: "plain_text" | "rich_text";
    applyNow?: boolean;
    weight?: number;
  }) => Promise<{
    appliedNow: boolean;
    expectedIntent: "plain_text" | "rich_text";
    appName?: string;
    contentType?: string;
  }>,
) {
  const historyRepo = new HistoryRepository(db);
  const snippetsRepo = new SnippetsRepository(db);
  const templatesRepo = new TemplatesRepository(db);
  const usageStatsRepo = new UsageStatsRepository(db);

  // Wire historyRepo to main process so performClean() can auto-save history
  setHistoryRepo(historyRepo);

  registerAllIpcHandlers({
    mainWindow,
    reloadHotkeys,
    createFloatingWindow,
    historyRepo,
    snippetsRepo,
    templatesRepo,
    usageStatsRepo,
    confirmPreview,
    cancelPreview,
    getFallbackMethods,
    submitPasteFeedback,
  });
}
