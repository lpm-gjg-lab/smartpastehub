import { app, BrowserWindow, clipboard } from 'electron';
import path from 'path';
import { ClipboardWatcher } from './clipboard-watcher';
import { createTray } from './tray-manager';
import { registerHotkey, unregisterAllHotkeys } from './hotkey-manager';
import { registerIpcHandlers } from './ipc-handlers';
import { cleanContent } from '../core/cleaner';
import { Database } from './db';
import { getSettings } from './settings-store';
import { scheduleClipboardClear } from '../security/auto-clear';
import { logger } from '../shared/logger';

let mainWindow: BrowserWindow | null = null;
let tray: Electron.Tray | null = null;
let db: Database | null = null;
const watcher = new ClipboardWatcher();

function createMainWindow() {
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  if (process.env['NODE_ENV'] === 'development') {
    win.loadURL('http://127.0.0.1:5173');
  } else {
    win.loadFile(path.join(__dirname, '../../renderer/index.html'));
  }
  return win;
}

function setupHotkeys() {
  const settings = getSettings();
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

app.whenReady().then(() => {
  db = new Database();
  mainWindow = createMainWindow();
  registerIpcHandlers(mainWindow, db);
  setupHotkeys();
  tray = createTray(
    () => mainWindow?.show(),
    () => mainWindow?.show(),
  );
  watcher.start();
  watcher.on('change', (payload) => {
    mainWindow?.webContents.send('clipboard:content', payload);
  });
});

process.on('uncaughtException', (error) => {
  logger.fatal('Uncaught exception', { error });
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled rejection', { reason });
});

app.on('window-all-closed', () => {
  return;
});

app.on('will-quit', () => {
  unregisterAllHotkeys();
  watcher.stop();
  tray?.destroy();
});
