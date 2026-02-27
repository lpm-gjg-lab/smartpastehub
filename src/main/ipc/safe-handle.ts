import { ipcMain } from "electron";
import { IPCResponseEnvelope } from "../../shared/ipc-response";
import { SafeHandle } from "./contracts";

export function createSafeHandle(): SafeHandle {
  return function safeHandle<T>(
    channel: string,
    handler: (
      event: Electron.IpcMainInvokeEvent,
      payload: unknown,
    ) => Promise<T> | T,
  ) {
    ipcMain.handle(
      channel,
      async (event, payload): Promise<IPCResponseEnvelope<T>> => {
        try {
          const data = await handler(event, payload);
          return { ok: true, data };
        } catch (error) {
          console.error(`[IPC Error] ${channel}:`, error);
          return {
            ok: false,
            error: {
              code: "INTERNAL_ERROR",
              message: error instanceof Error ? error.message : String(error),
              recoverable: true,
            },
          };
        }
      },
    );
  };
}
