const fs = require('fs');
const content = fs.readFileSync('src/main/ipc-handlers.ts', 'utf8');

const safeHandleStr = `import { IPCResponseEnvelope } from "../shared/ipc-response";

/**
 * Wraps an IPC handler with a try/catch block to prevent main process
 * unhandled promise rejections from crashing the renderer.
 * Normalizes all returns into an IPCResponseEnvelope.
 */
function safeHandle<T>(
  channel: string,
  handler: (event: Electron.IpcMainInvokeEvent, payload: any) => Promise<T> | T
) {
  ipcMain.handle(
    channel,
    async (event, payload): Promise<IPCResponseEnvelope<T>> => {
      try {
        const data = await handler(event, payload);
        return { ok: true, data };
      } catch (error) {
        console.error(\`[IPC Error] \${channel}:\`, error);
        return {
          ok: false,
          error: {
            code: "INTERNAL_ERROR",
            message: error instanceof Error ? error.message : String(error),
            recoverable: true,
          },
        };
      }
    }
  );
}

`;

const replaced = content.replace('export function registerIpcHandlers', safeHandleStr + 'export function registerIpcHandlers');
fs.writeFileSync('src/main/ipc-handlers.ts', replaced);
