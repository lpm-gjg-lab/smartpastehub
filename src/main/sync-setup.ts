import { BrowserWindow, clipboard } from "electron";
import {
  connectSync,
  isSyncTransportRuntimeAvailable,
} from "../sync/sync-manager";
import { logger } from "../shared/logger";
import { getSettings } from "./settings-store";

export async function setupSyncRuntime(win: BrowserWindow): Promise<void> {
  const settings = await getSettings();
  if (!settings.sync.enabled) {
    try {
      logger.info("Sync disabled by settings");
    } catch {
      /* logger not ready */
    }
    return;
  }

  const relayUrl = process.env["SMARTPASTE_SYNC_RELAY_URL"];
  const roomId = process.env["SMARTPASTE_SYNC_ROOM_ID"];
  const relayAuthToken = process.env["SMARTPASTE_SYNC_AUTH_TOKEN"];
  const secretKeyHex = process.env["SMARTPASTE_SYNC_SECRET_KEY"];

  if (!relayUrl || !roomId || !relayAuthToken || !secretKeyHex) {
    try {
      logger.warn("Sync enabled but missing required sync env vars");
    } catch {
      /* logger not ready */
    }
    win.webContents.send("sync:disconnected", {
      roomId: roomId ?? "",
      deviceId: settings.sync.deviceId || "desktop-local",
    });
    return;
  }

  if (!/^[0-9a-fA-F]+$/.test(secretKeyHex) || secretKeyHex.length % 2 !== 0) {
    try {
      logger.warn("Sync secret key is not valid hex");
    } catch {
      /* logger not ready */
    }
    win.webContents.send("sync:disconnected", {
      roomId,
      deviceId: settings.sync.deviceId || "desktop-local",
    });
    return;
  }

  if (!isSyncTransportRuntimeAvailable()) {
    try {
      logger.warn(
        "Sync enabled but WebSocket runtime is unavailable (no global WebSocket and no ws fallback)",
      );
    } catch {
      // logger not ready
    }
    win.webContents.send("sync:disconnected", {
      roomId,
      deviceId: settings.sync.deviceId || "desktop-local",
    });
    return;
  }

  connectSync(relayUrl, secretKeyHex, {
    roomId,
    relayAuthToken,
    deviceId: settings.sync.deviceId || undefined,
    onIncomingClipboard(text) {
      clipboard.writeText(text);
    },
  });
}
