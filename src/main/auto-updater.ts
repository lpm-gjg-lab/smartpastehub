import { autoUpdater } from "electron-updater";
import { Notification } from "electron";
import { logger } from "../shared/logger";

export function setupAutoUpdater(): void {
  autoUpdater.logger = logger;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("update-available", (info) => {
    logger.info("Auto-updater: update available", { version: info.version });
  });

  autoUpdater.on("update-downloaded", (info) => {
    logger.info("Auto-updater: update downloaded", { version: info.version });
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: "Update Ready",
        body: `Version ${info.version} has been downloaded and will be installed on restart. Click to restart now.`,
      });
      notification.on("click", () => {
        autoUpdater.quitAndInstall();
      });
      notification.show();
    }
  });

  autoUpdater.on("error", (err) => {
    // Log silently, don't crash if no update server configured
    logger.error("Auto-updater error", {
      error: err instanceof Error ? err.message : String(err),
    });
  });

  try {
    autoUpdater.checkForUpdatesAndNotify();
  } catch (err) {
    logger.error("Auto-updater: failed to check for updates", {
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
