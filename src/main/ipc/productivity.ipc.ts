import {
  enqueue,
  dequeue,
  peek,
  size,
  clearQueue,
} from "../../productivity/paste-queue";
import {
  startCollecting,
  addItem,
  mergeAndPaste,
  clear as clearMulti,
  getMultiClipboard,
} from "../../productivity/multi-clipboard";
import { IpcDependencies, SafeHandle } from "./contracts";

export function registerProductivityIpc(
  safeHandle: SafeHandle,
  deps: Pick<IpcDependencies, "mainWindow">,
): void {
  safeHandle("queue:enqueue", async (_, payload) => {
    const { text } = payload as { text: string };
    enqueue(text);
    const queueSize = size();
    const nextItem = peek();
    if (!deps.mainWindow.isDestroyed()) {
      deps.mainWindow.webContents.send("clipboard:content", {
        text: nextItem ? `Next: ${nextItem.substring(0, 50)}...` : "",
        type: "paste_queue",
        mergedCount: queueSize,
      });
    }
    return true;
  });
  safeHandle("queue:dequeue", async () => dequeue());
  safeHandle("queue:peek", async () => peek());
  safeHandle("queue:size", async () => size());
  safeHandle("queue:clear", async () => {
    clearQueue();
    return true;
  });

  safeHandle("multi:start", async () => {
    startCollecting();
    const state = getMultiClipboard();
    if (!deps.mainWindow.isDestroyed()) {
      deps.mainWindow.webContents.send("clipboard:content", {
        text: "Multi-copy collection started",
        type: "multi_clipboard",
        mergedCount: state.items.length,
        maxItems: state.maxItems,
      });
    }
    return true;
  });
  safeHandle("multi:add", async (_, payload) => {
    const { text } = payload as { text: string };
    addItem(text);
    const state = getMultiClipboard();
    if (!deps.mainWindow.isDestroyed()) {
      deps.mainWindow.webContents.send("clipboard:content", {
        text,
        type: "multi_clipboard",
        mergedCount: state.items.length,
        maxItems: state.maxItems,
      });
    }
    return true;
  });
  safeHandle("multi:merge", async (_, payload) => {
    const { separator } = payload as { separator?: string };
    return mergeAndPaste(separator);
  });
  safeHandle("multi:clear", async () => {
    clearMulti();
    return true;
  });
  safeHandle("multi:state", async () => getMultiClipboard());
}
