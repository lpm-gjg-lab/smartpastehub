import { Menu, Tray, nativeImage, clipboard, app } from "electron";
import fs from "fs";
import path from "path";
import { resolveTrayIconPath } from "./utils/icon-resolver";

// Incognito state (no.18) — toggled by tray menu
let incognitoActive = false;

export function setIncognitoActive(v: boolean) {
  incognitoActive = v;
  rebuildMenu();
}
let trayInstance: Tray | null = null;
let lastCleaned = "";
let autoCleanActive = false;

interface TrayQuickActions {
  ghostWriteClipboard?: () => void;
  translateClipboard?: () => void;
}

// Snooze state — snooze auto-clean for N minutes
let snoozedUntil = 0;

export function isSnoozed(): boolean {
  return Date.now() < snoozedUntil;
}

function setSnoozed(minutes: number) {
  snoozedUntil = Date.now() + minutes * 60 * 1000;
  rebuildMenu();
}

function clearSnooze() {
  snoozedUntil = 0;
  rebuildMenu();
}

export function updateTrayLastCleaned(text: string) {
  lastCleaned = text;
  rebuildMenu();
}

export function updateTrayAutoCleanState(active: boolean) {
  autoCleanActive = active;
  applyTrayIcon();
  rebuildMenu();
}

function applyTrayIcon() {
  if (!trayInstance || trayInstance.isDestroyed()) return;

  const iconPath = resolveTrayIconPath();
  if (!iconPath) return;

  if (autoCleanActive) {
    // Draw a small green dot badge on the icon using nativeImage
    const base = nativeImage.createFromPath(iconPath);
    const size = base.getSize();
    const w = size.width || 16;
    const h = size.height || 16;
    // Build a simple 4×4 green dot PNG (tiny inline badge)
    // We overlay it on the bottom-right corner via nativeImage crop+resize tricks.
    // The simplest approach: create a badge image and resize/composite via canvas-like API.
    // Electron nativeImage doesn't have composite — use a pre-made badge asset if present,
    // otherwise fall back to a tinted copy via resize.
    const badgePath = path.join(path.dirname(iconPath), "icon-active" + path.extname(iconPath));
    if (fs.existsSync(badgePath)) {
      trayInstance.setImage(nativeImage.createFromPath(badgePath));
    } else {
      // Fallback: resize slightly (signals active state visually on some OSes)
      const resized = base.resize({ width: w, height: h, quality: "good" });
      trayInstance.setImage(resized);
    }
  } else {
    const img = iconPath
      ? nativeImage.createFromPath(iconPath)
      : nativeImage.createEmpty();
    trayInstance.setImage(img);
  }
}

function rebuildMenu() {
  if (!trayInstance || trayInstance.isDestroyed()) return;

  const preview = lastCleaned
    ? lastCleaned.trim().slice(0, 40) + (lastCleaned.length > 40 ? "…" : "")
    : "(nothing cleaned yet)";

  const snoozeLabel = isSnoozed()
    ? `▶ Resume Auto-Clean (snoozed until ${new Date(snoozedUntil).toLocaleTimeString()})`
    : "⏸ Snooze Auto-Clean 10 min";

  const menu = Menu.buildFromTemplate([
    { label: "SmartPasteHub", enabled: false },
    { type: "separator" },
    {
      label: `Last cleaned: ${preview}`,
      enabled: !!lastCleaned,
      click: () => {
        if (lastCleaned) clipboard.writeText(lastCleaned);
      },
    },
    { type: "separator" },
    {
      label: snoozeLabel,
      click: () => {
        if (isSnoozed()) {
          clearSnooze();
        } else {
          setSnoozed(10);
        }
      },
    },
    {
      label: "🔍 Search History",
      click: () => onOpenHistory(),
    },
    { type: "separator" },
    { label: "Quick Actions", enabled: false },
    {
      label: "⌨️ Ghost Write Clipboard",
      click: () => onGhostWriteClipboard(),
    },
    {
      label: "🌐 Translate Clipboard",
      click: () => onTranslateClipboard(),
    },
    { type: "separator" },
    {
      label: "Open Settings",
      accelerator: "CmdOrCtrl+,",
      click: () => onOpenSettings(),
    },
    { type: "separator" },
    {
      label: incognitoActive
        ? "🕵️ Incognito: ON (click to disable)"
        : "🕵️ Incognito: OFF",
      type: "checkbox",
      checked: incognitoActive,
      click: () => onToggleIncognito(),
    },
    {
      label: "Quit SmartPasteHub",
      click: () => {
        (global as Record<string, unknown>)["appIsQuiting"] = true;
        app.quit();
      },
    },
  ]);

  trayInstance.setContextMenu(menu);
}

// Callbacks — set when createTray is called
let onOpenSettings: () => void = () => {};
let onOpenHistory: () => void = () => {};
let onToggleIncognito: () => void = () => {};
let onGhostWriteClipboard: () => void = () => {};
let onTranslateClipboard: () => void = () => {};

export function createTray(
  openSettings: () => void,
  openHistory: () => void,
  toggleIncognito?: () => void,
  quickActions?: TrayQuickActions,
): Tray {
  onOpenSettings = openSettings;
  onOpenHistory = openHistory;
  if (toggleIncognito) onToggleIncognito = toggleIncognito;
  if (quickActions?.ghostWriteClipboard) {
    onGhostWriteClipboard = quickActions.ghostWriteClipboard;
  }
  if (quickActions?.translateClipboard) {
    onTranslateClipboard = quickActions.translateClipboard;
  }
  const iconPath = resolveTrayIconPath();
  const icon = iconPath
    ? nativeImage.createFromPath(iconPath)
    : nativeImage.createEmpty();

  trayInstance = new Tray(icon);
  trayInstance.setToolTip("SmartPasteHub — running in background");

  // Left click → open settings
  trayInstance.on("click", () => onOpenSettings());

  rebuildMenu();

  return trayInstance;
}
