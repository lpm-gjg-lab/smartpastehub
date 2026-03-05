import fs from "fs";
import net from "net";
import { app } from "electron";
import { cleanContent } from "../core/cleaner";
import { logger } from "../shared/logger";

export function setupExtensionServer(): void {
  const socketPath =
    process.platform === "win32"
      ? "\\\\.\\pipe\\smartpastehub-ext"
      : "/tmp/smartpastehub-ext.sock";

  const server = net.createServer((stream) => {
    stream.on("data", async (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === "clean_paste") {
          const result = await cleanContent({ text: msg.text });
          stream.write(
            JSON.stringify({
              type: "clean_paste_result",
              text: result.cleaned,
            }),
          );
        }
      } catch (error) {
        try {
          logger.error("Ext Server Error", { error });
        } catch {
          /* logger not ready */
        }
      }
    });
  });

  server.listen(socketPath, () => {
    try {
      logger.info("Extension IPC server listening");
    } catch {
      /* logger not ready */
    }
  });

  if (process.platform !== "win32") {
    app.on("will-quit", () => {
      if (fs.existsSync(socketPath)) fs.unlinkSync(socketPath);
    });
  }
}
