import { BrowserWindow } from "electron";
import path from "path";
import { resolveAppIconPath } from "./utils/icon-resolver";

export function loadMainWindow(win: BrowserWindow): void {
  if (process.env["NODE_ENV"] === "development") {
    win.loadURL("http://127.0.0.1:5173");
    return;
  }
  win.loadFile(path.join(__dirname, "../../renderer/index.html"));
}

export function createFloatingWindow(
  hashRoute: string,
  width = 440,
  height = 600,
): BrowserWindow {
  const iconPath = resolveAppIconPath();
  const win = new BrowserWindow({
    width,
    height,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    alwaysOnTop: true,
    resizable: true,
    icon: iconPath,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (process.env["NODE_ENV"] === "development") {
    win.loadURL(`http://127.0.0.1:5173#${hashRoute}`);
  } else {
    win.loadURL(
      `file://${path.join(__dirname, "../../renderer/index.html")}#${hashRoute}`,
    );
  }

  return win;
}

export function createMainWindow(onClosed?: () => void): BrowserWindow {
  const iconPath = resolveAppIconPath();
  const win = new BrowserWindow({
    width: 1100,
    height: 720,
    icon: iconPath,
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });
  loadMainWindow(win);

  win.on("close", (e: { preventDefault: () => void }) => {
    if (!global.appIsQuiting) {
      e.preventDefault();
      win.hide();
    }
  });

  win.on("closed", () => {
    onClosed?.();
  });

  return win;
}
