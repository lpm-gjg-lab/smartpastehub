/**
 * HudManager — manages the floating toast/HUD window.
 * This window lives independently of mainWindow and is shown
 * whenever something interesting happens (clean, hotkey, block).
 * It auto-closes after a timeout, or when user dismisses it.
 */
import { BrowserWindow, screen } from "electron";
import path from "path";
import fs from "fs";

export interface HudPayload {
  cleaned: string;
  original: string;
  changes?: string[];
  type: string;
  securityAlert?: unknown;
  isMerged?: boolean;
  mergedCount?: number;
  sourceApp?: string;
  sensitiveCount?: number;
  sensitiveTypes?: string[];
  sizeKb?: number;
  fieldIntent?: string;
  preview?: string;
  previewRequired?: boolean;
  paletteOptions?: string[];
  previewOriginal?: string;
  previewCleaned?: string;
  previewStats?: string[];
  paletteSelected?: string;
  contentType?: string;
  strategyIntent?: "plain_text" | "rich_text";
}

let hudWindow: BrowserWindow | null = null;
let hideTimer: NodeJS.Timeout | null = null;
let lastAutoCleanHudAt = 0;

function resolveAppIconPath(): string | undefined {
  const candidates = [
    path.join(__dirname, "../../assets/tray/icon.png"),
    path.join(__dirname, "../../logo.png"),
    path.join(process.cwd(), "logo.png"),
  ];
  return candidates.find((c) => fs.existsSync(c));
}

function getHudBounds(contentHeight = 160) {
  const display = screen.getPrimaryDisplay();
  const { width: sw, height: sh } = display.workAreaSize;
  const w = 420;
  const h = Math.max(120, Math.min(contentHeight, 320));
  const margin = 16;
  return { x: sw - w - margin, y: sh - h - margin, width: w, height: h };
}

function createHudWindow(contentHeight = 160): BrowserWindow {
  const { x, y, width, height } = getHudBounds(contentHeight);
  const iconPath = resolveAppIconPath();

  const win = new BrowserWindow({
    x,
    y,
    width,
    height,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    focusable: false,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env["NODE_ENV"] === "development") {
    win.loadURL("http://127.0.0.1:5173#/toast");
  } else {
    win.loadURL(
      `file://${path.join(__dirname, "../../renderer/index.html")}#/toast`,
    );
  }

  win.on("closed", () => {
    hudWindow = null;
  });

  return win;
}

function scheduleHide(ms = 5000) {
  if (hideTimer) clearTimeout(hideTimer);
  hideTimer = setTimeout(() => {
    if (hudWindow && !hudWindow.isDestroyed()) {
      hudWindow.hide();
    }
  }, ms);
}

/** Estimate HUD height based on content. */
function estimateHeight(payload: HudPayload): number {
  // Base: header (48) + action bar (40) + padding (24)
  let h = 112;
  // Content preview: ~20px per 60 chars, capped at 4 lines
  const lines = Math.min(Math.ceil(payload.cleaned.length / 60), 4);
  h += lines * 20;
  // Changes list: 18px per transform
  if (payload.changes && payload.changes.length > 0) {
    h += Math.min(payload.changes.length, 5) * 18;
  }
  return h;
}

export function showHud(payload: HudPayload, durationMs = 5000) {
  // Debounce auto_clean HUD — if another auto_clean fired within 1500ms, just
  // silently update content without re-showing or resetting the timer.
  const isAutoClean = payload.type === "auto_clean";
  const now = Date.now();
  if (isAutoClean) {
    if (
      now - lastAutoCleanHudAt < 1500 &&
      hudWindow &&
      !hudWindow.isDestroyed()
    ) {
      hudWindow.webContents.send("toast:data", payload);
      return;
    }
    lastAutoCleanHudAt = now;
  }

  const contentHeight = estimateHeight(payload);
  if (!hudWindow || hudWindow.isDestroyed()) {
    hudWindow = createHudWindow(contentHeight);
    // Wait for window to load before sending data
    hudWindow.webContents.once("did-finish-load", () => {
      if (hudWindow && !hudWindow.isDestroyed()) {
        // Reposition in case display changed
        const { x, y, width, height } = getHudBounds(contentHeight);
        hudWindow.setBounds({ x, y, width, height });
        hudWindow.showInactive();
        hudWindow.webContents.send("toast:data", payload);
        scheduleHide(durationMs);
      }
    });
  } else {
    // Window already exists — update content and re-show
    const { x, y, width, height } = getHudBounds(contentHeight);
    hudWindow.setBounds({ x, y, width, height });
    hudWindow.showInactive();
    hudWindow.webContents.send("toast:data", payload);
    scheduleHide(durationMs);
  }
}

export function hideHud() {
  if (hideTimer) clearTimeout(hideTimer);
  if (hudWindow && !hudWindow.isDestroyed()) {
    hudWindow.hide();
  }
}

export function destroyHud() {
  if (hideTimer) clearTimeout(hideTimer);
  if (hudWindow && !hudWindow.isDestroyed()) {
    hudWindow.destroy();
    hudWindow = null;
  }
}
