import fs from "fs";
import { app, BrowserWindow, clipboard } from "electron";
import path from "path";
import { ClipboardWatcher } from "./clipboard-watcher";
import { createTray } from "./tray-manager";
import { registerHotkey, unregisterAllHotkeys } from "./hotkey-manager";
import { registerIpcHandlers } from "./ipc-handlers";
import { cleanContent } from "../core/cleaner";
import { Database } from "./db";
import { getSettings } from "./settings-store";
import { scheduleClipboardClear } from "../security/auto-clear";
import { logger } from "../shared/logger";
// import { autoUpdater } from "electron-updater";
import net from "net";

let mainWindow: BrowserWindow | null = null;
let tray: Electron.Tray | null = null;
let db: Database | null = null;
const watcher = new ClipboardWatcher();

function loadMainWindow(win: BrowserWindow) {
  if (process.env["NODE_ENV"] === "development") {
    win.loadURL("http://127.0.0.1:5173");
    return;
  }
  win.loadFile(path.join(__dirname, "../../renderer/index.html"));
}

function createFloatingWindow(hashRoute: string, width = 440, height = 600) {
  const win = new BrowserWindow({
    width,
    height,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  
  if (process.env["NODE_ENV"] === "development") {
    win.loadURL(`http://127.0.0.1:5173#${hashRoute}`);
  } else {
    win.loadURL(`file://${path.join(__dirname, "../../renderer/index.html")}#${hashRoute}`);
  }
  
  return win;
}

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  loadMainWindow(win);
  return win;
}

function wireClipboardWatcher(win: BrowserWindow) {
  watcher.start();
  watcher.on("change", (payload) => {
    win.webContents.send("clipboard:content", payload);
  });
}

async function setupHotkeys() {
  const settings = await getSettings();
  registerHotkey(settings.hotkeys.pasteClean, async () => {
    const text = clipboard.readText();
    const html = clipboard.readHTML();
    const result = await cleanContent({ text, html });
    clipboard.writeText(result.cleaned);
    if (settings.security.autoClear) {
      scheduleClipboardClear(settings.security.clearTimerSeconds);
    }
  });
}



function setupAutoUpdater() {
  // autoUpdater.logger = logger;
  // autoUpdater.checkForUpdatesAndNotify();
  logger.info('Auto-updater scaffold initialized');
}

function setupExtensionServer() {
  const SOCKET_PATH = process.platform === 'win32' 
    ? '\\.\pipe\smartpastehub-ext' 
    : '/tmp/smartpastehub-ext.sock';

  const server = net.createServer((stream) => {
    stream.on('data', async (data) => {
      try {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'clean_paste') {
          const result = await cleanContent({ text: msg.text });
          stream.write(JSON.stringify({ type: 'clean_paste_result', text: result.cleaned }));
        }
      } catch (e) {
        logger.error('Ext Server Error', { error: e });
      }
    });
  });

  server.listen(SOCKET_PATH, () => {
    logger.info('Extension IPC server listening');
  });
  
  // Clean up socket file on unix
  if (process.platform !== 'win32') {
    app.on('will-quit', () => {
      if (fs.existsSync(SOCKET_PATH)) fs.unlinkSync(SOCKET_PATH);
    });
  }
}

async function initializeApp() {
  db = new Database();
  mainWindow = createMainWindow();
  registerIpcHandlers(mainWindow, db, createFloatingWindow);
  await setupHotkeys();
  tray = createTray(
    () => mainWindow?.show(),
    () => mainWindow?.show(),
  );
  wireClipboardWatcher(mainWindow);
  setupExtensionServer();
  setupAutoUpdater();
}

app.whenReady().then(() => initializeApp());

process.on("uncaughtException", (error) => {
  logger.fatal("Uncaught exception", { error });
});

process.on("unhandledRejection", (reason) => {
  logger.error("Unhandled rejection", { reason });
});

app.on("window-all-closed", () => {
  return;
});

app.on("will-quit", () => {
  unregisterAllHotkeys();
  watcher.stop();
  tray?.destroy();
});
