import { app } from "electron";
import { execFile } from "child_process";
import { promisify } from "util";
import * as path from "path";
import fs from "fs";

const execFileAsync = promisify(execFile);

const BG_PARENT_KEY = "HKCU\\Software\\Classes\\Directory\\Background\\shell";
const FILE_PARENT_KEY = "HKCU\\Software\\Classes\\*\\shell";
const FOLDER_PARENT_KEY = "HKCU\\Software\\Classes\\Directory\\shell";

export type ContextMenuMode = "top_level" | "submenu";

interface EntrySpec {
  parentKey: string;
  actionKey: string;
  commandKey: string;
  label: string;
  command: string;
  groupKey?: string;
}

interface ContextMenuConfig {
  mode: ContextMenuMode;
  background: EntrySpec;
  file: EntrySpec;
  folder: EntrySpec;
}

export interface ContextMenuStatus {
  supported: boolean;
  installed: boolean;
  mode?: ContextMenuMode;
  backgroundEntry: boolean;
  fileEntry: boolean;
  folderEntry: boolean;
  backgroundCommandMatch?: boolean;
  fileCommandMatch?: boolean;
  folderCommandMatch?: boolean;
  actualBackgroundCommand?: string;
  actualFileCommand?: string;
  actualFolderCommand?: string;
  expectedBackgroundCommand?: string;
  expectedFileCommand?: string;
  expectedFolderCommand?: string;
}

/**
 * Handles adding and removing SmartPasteHub from the Windows Context Menu via the Registry.
 * Note: Modifying HKCU (Current User) does not require admin privileges.
 */
export class ContextMenuManager {
  private static get isWindows(): boolean {
    return process.platform === "win32";
  }

  private static get execPath(): string {
    // When running in development, process.execPath is the path to electron.exe
    // Adding the app dev path ensures it runs correctly during dev too.
    if (!app.isPackaged) {
      return `"${process.execPath}" "${app.getAppPath()}"`;
    }
    return `"${process.execPath}"`;
  }

  private static get expectedBackgroundCommand(): string {
    return `${this.execPath} --smart-paste-dir "%V"`;
  }

  private static get expectedFileCommand(): string {
    return `${this.execPath} --smart-clean-file "%1"`;
  }

  private static get expectedFolderCommand(): string {
    return `${this.execPath} --smart-paste-dir "%1"`;
  }

  private static configFor(mode: ContextMenuMode): ContextMenuConfig {
    if (mode === "submenu") {
      const bgGroupKey = `${BG_PARENT_KEY}\\SmartPasteHub`;
      const fileGroupKey = `${FILE_PARENT_KEY}\\SmartPasteHub`;
      const folderGroupKey = `${FOLDER_PARENT_KEY}\\SmartPasteHub`;

      const backgroundActionKey = `${bgGroupKey}\\shell\\PasteNewFile`;
      const fileActionKey = `${fileGroupKey}\\shell\\CleanCopy`;
      const folderActionKey = `${folderGroupKey}\\shell\\PasteIntoFolder`;

      return {
        mode,
        background: {
          parentKey: BG_PARENT_KEY,
          groupKey: bgGroupKey,
          actionKey: backgroundActionKey,
          commandKey: `${backgroundActionKey}\\command`,
          label: "Paste as New File",
          command: this.expectedBackgroundCommand,
        },
        file: {
          parentKey: FILE_PARENT_KEY,
          groupKey: fileGroupKey,
          actionKey: fileActionKey,
          commandKey: `${fileActionKey}\\command`,
          label: "Clean and Copy",
          command: this.expectedFileCommand,
        },
        folder: {
          parentKey: FOLDER_PARENT_KEY,
          groupKey: folderGroupKey,
          actionKey: folderActionKey,
          commandKey: `${folderActionKey}\\command`,
          label: "Paste in This Folder",
          command: this.expectedFolderCommand,
        },
      };
    }

    return {
      mode,
      background: {
        parentKey: BG_PARENT_KEY,
        actionKey: `${BG_PARENT_KEY}\\SmartPasteHub.PasteNewFile`,
        commandKey: `${BG_PARENT_KEY}\\SmartPasteHub.PasteNewFile\\command`,
        label: "SmartPasteHub: Paste as New File",
        command: this.expectedBackgroundCommand,
      },
      file: {
        parentKey: FILE_PARENT_KEY,
        actionKey: `${FILE_PARENT_KEY}\\SmartPasteHub.CleanCopy`,
        commandKey: `${FILE_PARENT_KEY}\\SmartPasteHub.CleanCopy\\command`,
        label: "SmartPasteHub: Clean and Copy",
        command: this.expectedFileCommand,
      },
      folder: {
        parentKey: FOLDER_PARENT_KEY,
        actionKey: `${FOLDER_PARENT_KEY}\\SmartPasteHub.PasteIntoFolder`,
        commandKey: `${FOLDER_PARENT_KEY}\\SmartPasteHub.PasteIntoFolder\\command`,
        label: "SmartPasteHub: Paste in This Folder",
        command: this.expectedFolderCommand,
      },
    };
  }

  /**
   * Registers both "Smart Paste as New File" (Directory Background)
   * and "Clean & Copy to Clipboard" (Files).
   */
  static async install(mode: ContextMenuMode = "top_level"): Promise<boolean> {
    if (!this.isWindows) return false;

    try {
      const config = this.configFor(mode);
      await this.removeLegacySmartPasteEntries(config);
      const iconPath = this.getIconPath();
      await this.ensureInstalledEntries(iconPath, config);

      const status = await this.getStatus(mode);
      if (status.installed) {
        console.log("Context menu install command executed.");
        return true;
      }

      // Repair once when entries exist but commands are stale/invalid.
      await this.uninstall();
      await this.ensureInstalledEntries(iconPath, config);
      const repaired = await this.getStatus(mode);
      console.log("Context menu install repaired.");
      return repaired.installed;
    } catch (error) {
      console.error("Failed to install context menu:", error);
      return false;
    }
  }

  /**
   * Removes all SmartPasteHub entries from the Windows Context Menu.
   */
  static async uninstall(): Promise<boolean> {
    if (!this.isWindows) return false;

    try {
      await this.removeLegacySmartPasteEntries(undefined, true);

      console.log("Context menu uninstall command executed.");
      return true;
    } catch (error) {
      console.error("Failed to uninstall context menu:", error);
      return false;
    }
  }

  /**
   * Checks if the context menu is currently installed.
   */
  static async isInstalled(): Promise<boolean> {
    if (!this.isWindows) return false;
    const status = await this.getStatus();
    return status.installed;
  }

  static async getStatus(
    mode: ContextMenuMode = "top_level",
  ): Promise<ContextMenuStatus> {
    if (!this.isWindows) {
      return {
        supported: false,
        installed: false,
        backgroundEntry: false,
        fileEntry: false,
        folderEntry: false,
      };
    }

    const config = this.configFor(mode);
    const backgroundEntry = await this.queryKeyExists(
      config.background.actionKey,
    );
    const fileEntry = await this.queryKeyExists(config.file.actionKey);
    const folderEntry = await this.queryKeyExists(config.folder.actionKey);

    const actualBackgroundCommand = await this.queryValue(
      config.background.commandKey,
    );
    const actualFileCommand = await this.queryValue(config.file.commandKey);
    const actualFolderCommand = await this.queryValue(config.folder.commandKey);

    const backgroundCommandMatch =
      this.normalizeCommand(actualBackgroundCommand) ===
      this.normalizeCommand(this.expectedBackgroundCommand);
    const fileCommandMatch =
      this.normalizeCommand(actualFileCommand) ===
      this.normalizeCommand(this.expectedFileCommand);
    const folderCommandMatch =
      this.normalizeCommand(actualFolderCommand) ===
      this.normalizeCommand(this.expectedFolderCommand);

    return {
      supported: true,
      mode,
      installed:
        backgroundEntry &&
        fileEntry &&
        folderEntry &&
        backgroundCommandMatch &&
        fileCommandMatch &&
        folderCommandMatch,
      backgroundEntry,
      fileEntry,
      folderEntry,
      backgroundCommandMatch,
      fileCommandMatch,
      folderCommandMatch,
      actualBackgroundCommand: actualBackgroundCommand ?? undefined,
      actualFileCommand: actualFileCommand ?? undefined,
      actualFolderCommand: actualFolderCommand ?? undefined,
      expectedBackgroundCommand: this.expectedBackgroundCommand,
      expectedFileCommand: this.expectedFileCommand,
      expectedFolderCommand: this.expectedFolderCommand,
    };
  }

  /**
   * Helper to execute 'reg' command line utilities.
   */
  private static async runReg(args: string[]): Promise<string> {
    const { stdout, stderr } = await execFileAsync("reg", args, {
      windowsHide: true,
      timeout: 10000,
    });
    if (stderr && stderr.trim().length > 0 && !/success/i.test(stderr)) {
      throw new Error(`Registry command failed: ${stderr}`);
    }
    return stdout;
  }

  private static normalizeCommand(command?: string | null): string {
    return String(command ?? "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();
  }

  private static async queryValue(
    key: string,
    valueName?: string,
  ): Promise<string | null> {
    const args = valueName
      ? ["query", key, "/v", valueName]
      : ["query", key, "/ve"];

    try {
      const output = await this.runReg(args);
      const valueLabel = valueName ?? "(Default)";
      const escaped = valueLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const match = output.match(
        new RegExp(`${escaped}\\s+REG_\\w+\\s+(.+)$`, "im"),
      );
      return match?.[1]?.trim() ?? null;
    } catch {
      return null;
    }
  }

  private static async queryKeyExists(key: string): Promise<boolean> {
    try {
      await this.runReg(["query", key]);
      return true;
    } catch {
      return false;
    }
  }

  private static async deleteKeyIfExists(key: string): Promise<void> {
    const exists = await this.queryKeyExists(key);
    if (!exists) {
      return;
    }
    await this.runReg(["delete", key, "/f"]);
  }

  private static async listSubKeys(parentKey: string): Promise<string[]> {
    try {
      const output = await this.runReg(["query", parentKey]);
      const lines = output
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.startsWith("HKEY_"));
      return lines;
    } catch {
      return [];
    }
  }

  private static async removeLegacySmartPasteEntries(
    activeConfig?: ContextMenuConfig,
    purgeAll = false,
  ): Promise<void> {
    const keep = new Set<string>();
    const configs = [this.configFor("top_level"), this.configFor("submenu")];
    for (const config of configs) {
      keep.add(config.background.actionKey.toLowerCase());
      keep.add(config.file.actionKey.toLowerCase());
      keep.add(config.folder.actionKey.toLowerCase());
      if (config.background.groupKey)
        keep.add(config.background.groupKey.toLowerCase());
      if (config.file.groupKey) keep.add(config.file.groupKey.toLowerCase());
      if (config.folder.groupKey)
        keep.add(config.folder.groupKey.toLowerCase());
    }

    // If specific config passed, preserve only active config keys.
    const keepActiveOnly = purgeAll
      ? new Set<string>()
      : activeConfig
        ? new Set<string>([
            activeConfig.background.actionKey.toLowerCase(),
            activeConfig.file.actionKey.toLowerCase(),
            activeConfig.folder.actionKey.toLowerCase(),
            ...(activeConfig.background.groupKey
              ? [activeConfig.background.groupKey.toLowerCase()]
              : []),
            ...(activeConfig.file.groupKey
              ? [activeConfig.file.groupKey.toLowerCase()]
              : []),
            ...(activeConfig.folder.groupKey
              ? [activeConfig.folder.groupKey.toLowerCase()]
              : []),
          ])
        : keep;

    const parents = [BG_PARENT_KEY, FILE_PARENT_KEY, FOLDER_PARENT_KEY];

    for (const parent of parents) {
      const keys = await this.listSubKeys(parent);
      for (const key of keys) {
        const normalized = key.toLowerCase();
        const isSmartPasteKey =
          normalized.includes("\\smartpastehub") ||
          normalized.includes("\\smartpaste");
        if (!isSmartPasteKey) {
          continue;
        }
        if (!purgeAll && keepActiveOnly.has(normalized)) {
          continue;
        }
        await this.deleteKeyIfExists(key);
      }
    }
  }

  private static async ensureInstalledEntries(
    iconPath: string,
    config: ContextMenuConfig,
  ): Promise<void> {
    await this.installEntry(config.background, iconPath, config.mode);
    await this.installEntry(config.file, iconPath, config.mode);
    await this.installEntry(config.folder, iconPath, config.mode);
  }

  private static async installEntry(
    entry: EntrySpec,
    iconPath: string,
    mode: ContextMenuMode,
  ): Promise<void> {
    if (mode === "submenu" && entry.groupKey) {
      await this.runReg([
        "add",
        entry.groupKey,
        "/ve",
        "/d",
        "SmartPasteHub",
        "/f",
      ]);
      await this.runReg([
        "add",
        entry.groupKey,
        "/v",
        "Icon",
        "/d",
        iconPath,
        "/f",
      ]);
      await this.runReg([
        "add",
        entry.groupKey,
        "/v",
        "MUIVerb",
        "/d",
        "SmartPasteHub",
        "/f",
      ]);
      await this.runReg([
        "add",
        entry.groupKey,
        "/v",
        "Position",
        "/d",
        "Top",
        "/f",
      ]);
    }

    await this.runReg(["add", entry.actionKey, "/ve", "/d", entry.label, "/f"]);
    await this.runReg([
      "add",
      entry.actionKey,
      "/v",
      "Icon",
      "/d",
      iconPath,
      "/f",
    ]);
    await this.runReg([
      "add",
      entry.actionKey,
      "/v",
      "Position",
      "/d",
      "Top",
      "/f",
    ]);
    await this.runReg([
      "add",
      entry.commandKey,
      "/ve",
      "/d",
      entry.command,
      "/f",
    ]);
  }

  /**
   * Resolves the path to the app icon (.ico or .exe) to display in the context menu.
   */
  private static getIconPath(): string {
    // In production, the executable itself contains the icon.
    if (app.isPackaged) {
      return process.execPath;
    }

    // In development, prefer .ico file if present.
    const devIconPath = path.join(process.cwd(), "build", "icon.ico");
    if (fs.existsSync(devIconPath)) {
      return devIconPath;
    }

    const assetsIconPath = path.join(
      process.cwd(),
      "assets",
      "icons",
      "icon.ico",
    );
    if (fs.existsSync(assetsIconPath)) {
      return assetsIconPath;
    }

    // Safe fallback to executable icon.
    return process.execPath;
  }
}
