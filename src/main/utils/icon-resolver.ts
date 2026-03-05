import { app } from "electron";
import fs from "fs";
import path from "path";

/**
 * Centralized icon/logo path resolution for main process.
 *
 * Resolution order (first existing file wins):
 *
 * 1. extraResources icon.ico — best quality for Windows tray/taskbar
 *    (bundled via electron-builder extraResources, sits next to app.asar)
 * 2. app.getAppPath()/logo.png — always inside asar (listed in electron-builder files)
 * 3. process.cwd()/logo.png — dev-mode fallback
 * 4. __dirname-relative assets/tray/icon.png — dev-mode fallback
 *
 * NOTE: `assets/` is used as `buildResources` by electron-builder and is
 * **excluded** from the asar bundle.  Never rely on __dirname-based paths
 * that point into `assets/` for packaged builds.
 */

let cachedIconPath: string | undefined;

/**
 * Resolve the best available app icon path.
 * Result is cached after first successful lookup.
 *
 * @param preferIco  When true, prefer .ico over .png (better for Windows tray).
 *                   Falls back to .png if .ico is not found.
 */
export function resolveAppIconPath(preferIco = false): string | undefined {
  if (cachedIconPath !== undefined) return cachedIconPath || undefined;

  const candidates: string[] = [];

  // 1. extraResources — sits beside app.asar in the resources/ directory
  if (process.resourcesPath) {
    candidates.push(path.join(process.resourcesPath, "icon.ico"));
  }

  // 2. assets/icons/icon.ico — available in dev (assets/ is not in asar)
  candidates.push(path.join(__dirname, "../../assets/icons/icon.ico"));

  // 3. app.getAppPath()/logo.png — inside asar, always available in packaged build
  candidates.push(path.join(app.getAppPath(), "logo.png"));

  // 4. Dev-mode: cwd-based (project root)
  candidates.push(path.join(process.cwd(), "logo.png"));
  candidates.push(path.join(process.cwd(), "assets/icons/icon.ico"));

  // 5. Dev-mode: __dirname-relative (assets/ is accessible during dev)
  candidates.push(path.join(__dirname, "../../assets/tray/icon.png"));

  if (preferIco) {
    // Try .ico candidates first for Windows tray
    const icoCandidates = candidates.filter((c) => c.endsWith(".ico"));
    const pngCandidates = candidates.filter((c) => !c.endsWith(".ico"));
    const ordered = [...icoCandidates, ...pngCandidates];
    cachedIconPath = ordered.find((c) => fs.existsSync(c)) ?? "";
  } else {
    cachedIconPath = candidates.find((c) => fs.existsSync(c)) ?? "";
  }

  return cachedIconPath || undefined;
}

/**
 * Resolve the tray icon path. Prefers .ico on Windows for best
 * multi-resolution rendering at 16×16 / 32×32.
 */
export function resolveTrayIconPath(): string | undefined {
  return resolveAppIconPath(process.platform === "win32");
}

/**
 * Clear the cached icon path (useful if resources change at runtime,
 * e.g. after an auto-update).
 */
export function clearIconCache(): void {
  cachedIconPath = undefined;
}
