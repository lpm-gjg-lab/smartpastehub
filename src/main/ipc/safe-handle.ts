import { ipcMain } from "electron";
import { IPCResponseEnvelope } from "../../shared/ipc-response";
import { SafeHandle } from "./contracts";

export function createSafeHandle(): SafeHandle {
  return function safeHandle<T, P = unknown>(
    channel: string,
    handler: (event: Electron.IpcMainInvokeEvent, payload: P) => Promise<T> | T,
    validate?: (payload: unknown) => P,
  ) {
    ipcMain.handle(
      channel,
      async (
        event: Electron.IpcMainInvokeEvent,
        payload: unknown,
      ): Promise<IPCResponseEnvelope<T>> => {
        try {
          const safePayload = validate ? validate(payload) : (payload as P);
          const data = await handler(event, safePayload);
          return { ok: true, data };
        } catch (error) {
          console.error(`[IPC Error] ${channel}:`, error);

          const isInvalidPayload =
            error instanceof Error &&
            (error.message.includes("payload") ||
              error.message.includes("required") ||
              error.message.includes("invalid"));

          return {
            ok: false,
            error: {
              code: isInvalidPayload ? "INVALID_PAYLOAD" : "INTERNAL_ERROR",
              message: error instanceof Error ? error.message : String(error),
              recoverable: !isInvalidPayload,
            },
          };
        }
      },
    );
  };
}
