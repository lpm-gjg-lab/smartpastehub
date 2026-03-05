/**
 * HudManager — manages the floating toast/HUD window.
 * This window lives independently of mainWindow and is shown
 * whenever something interesting happens (clean, hotkey, block).
 * It auto-closes after a timeout, or when user dismisses it.
 */
import { BrowserWindow, screen } from "electron";
import path from "path";
import { resolveAppIconPath } from "./utils/icon-resolver";
import { SensitiveMatch } from "../shared/types";

export interface HudPayload {
  cleaned: string;
  original: string;
  changes?: string[];
  type: string;
  securityAlert?: { matches: SensitiveMatch[]; text: string };
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


function getHudBounds(contentHeight = 160) {
  const display = screen.getPrimaryDisplay();
  const { width: sw, height: sh } = display.workAreaSize;
  const w = 420;
  // Increase max height to 500 so multiple rows of buttons and long changes fit
  const h = Math.max(120, Math.min(contentHeight, 500));
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

/** Estimate HUD height based on content to size the transparent window. */
function estimateHeight(payload: HudPayload): number {
  // Base: header (50) + padding (32) + action bar base row (46) = 128
  let h = 128;

  // Content preview: count actual newlines, wrap at 50 chars, max 5 lines
  const text = payload.cleaned || "";
  const lines = Math.min(
    text.split("\n").reduce((acc, line) => acc + Math.ceil(Math.max(1, line.length) / 50), 0),
    5,
  );
  h += lines * 22;

  // Changes list: 20px per transform
  if (payload.changes && payload.changes.length > 0) {
    h += Math.min(payload.changes.length, 6) * 20;
  }

  // Account for action buttons logic
  // "auto_clean" / "paste_clean" has 5 buttons -> wrapping to 2 rows
  if (payload.type === "auto_clean" || payload.type === "paste_clean") {
    h += 48; // extra row height
  } else if (payload.type === "command_palette") {
    // Up to 8 preset buttons, 3 per row -> max 3 rows.
    const opts = payload.paletteOptions?.length || 0;
    const extraRows = Math.max(0, Math.ceil(opts / 3) - 1);
    h += extraRows * 42;
  } else if (payload.type === "sensitive_warning") {
    // 3 buttons, fits 1 row
  } else {
    // Default / smart actions can have 5-6 buttons (2 rows)
    h += 42;
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
