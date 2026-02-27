import { registerAiIpc } from "./ai.ipc";
import { registerChartIpc } from "./chart.ipc";
import { registerClipboardIpc } from "./clipboard.ipc";
import { registerClipperIpc } from "./clipper.ipc";
import { IpcDependencies } from "./contracts";
import { registerDragDropIpc } from "./dragdrop.ipc";
import { registerHistoryIpc } from "./history.ipc";
import { registerOcrIpc } from "./ocr.ipc";
import { registerProductivityIpc } from "./productivity.ipc";
import { registerQrIpc } from "./qr.ipc";
import { registerRingIpc } from "./ring.ipc";
import { createSafeHandle } from "./safe-handle";
import { registerSecurityIpc } from "./security.ipc";
import { registerSettingsIpc } from "./settings.ipc";
import { registerSnippetIpc } from "./snippet.ipc";
import { registerTemplateIpc } from "./template.ipc";
import { registerTransformIpc } from "./transform.ipc";
import { registerUsageIpc } from "./usage.ipc";
import { registerWindowIpc } from "./window.ipc";

export function registerAllIpcHandlers(deps: IpcDependencies): void {
  const safeHandle = createSafeHandle();

  registerSettingsIpc(safeHandle, {
    reloadHotkeys: deps.reloadHotkeys,
    confirmPreview: deps.confirmPreview,
    cancelPreview: deps.cancelPreview,
    getFallbackMethods: deps.getFallbackMethods,
    submitPasteFeedback: deps.submitPasteFeedback,
  });
  registerClipboardIpc(safeHandle, {
    mainWindow: deps.mainWindow,
    historyRepo: deps.historyRepo,
    snippetsRepo: deps.snippetsRepo,
    usageStatsRepo: deps.usageStatsRepo,
  });
  registerSecurityIpc(safeHandle);
  registerHistoryIpc(safeHandle, { historyRepo: deps.historyRepo });
  registerSnippetIpc(safeHandle, { snippetsRepo: deps.snippetsRepo });
  registerTemplateIpc(safeHandle, { templatesRepo: deps.templatesRepo });
  registerTransformIpc(safeHandle);
  registerAiIpc(safeHandle, { usageStatsRepo: deps.usageStatsRepo });
  registerClipperIpc(safeHandle);
  registerQrIpc(safeHandle);
  registerRingIpc(safeHandle, { historyRepo: deps.historyRepo });
  registerDragDropIpc(safeHandle);
  registerChartIpc(safeHandle);
  registerOcrIpc(safeHandle, { usageStatsRepo: deps.usageStatsRepo });
  registerProductivityIpc(safeHandle, { mainWindow: deps.mainWindow });
  registerUsageIpc(safeHandle, { usageStatsRepo: deps.usageStatsRepo });
  registerWindowIpc(safeHandle, {
    createFloatingWindow: deps.createFloatingWindow,
  });
}
