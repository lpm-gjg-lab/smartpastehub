import { app } from "electron";
import { execFile } from "child_process";
import { promisify } from "util";
import * as path from "path";
import fs from "fs";

const execFileAsync = promisify(execFile);

// HKEY_CURRENT_USER\Software\Classes
const BG_PARENT_KEY = "HKCU\\Software\\Classes\\Directory\\Background\\shell";
const FILE_PARENT_KEY = "HKCU\\Software\\Classes\\*\\shell";
const FOLDER_PARENT_KEY = "HKCU\\Software\\Classes\\Directory\\shell";

export type ContextMenuMode = "top_level" | "submenu";

export interface EntrySpec {
  parentKey: string;
  actionKey: string;
  commandKey: string;
  label: string;
  command: string;
  groupKey?: string;
}

export interface ContextMenuConfig {
  mode: ContextMenuMode;
  entries: EntrySpec[];
}

export interface ContextMenuStatus {
  supported: boolean;
  installed: boolean;
  mode?: ContextMenuMode;
  installedCount: number;
}

export class ContextMenuManager {
  private static get isWindows(): boolean {
    return process.platform === "win32";
  }

  private static get execPath(): string {
    if (!app.isPackaged) {
      return `"${process.execPath}" "${app.getAppPath()}"`;
    }
    return `"${process.execPath}"`;
  }

  private static configFor(mode: ContextMenuMode): ContextMenuConfig {
    const bgGroupKey = `${BG_PARENT_KEY}\\SmartPasteHub`;
    const fileGroupKey = `${FILE_PARENT_KEY}\\SmartPasteHub`;
    const folderGroupKey = `${FOLDER_PARENT_KEY}\\SmartPasteHub`;

    const entries: EntrySpec[] = [];

    if (mode === "submenu") {
      // 1. Directory Background Commands
      entries.push({
        parentKey: BG_PARENT_KEY,
        groupKey: bgGroupKey,
        actionKey: `${bgGroupKey}\\shell\\PasteNewFile`,
        commandKey: `${bgGroupKey}\\shell\\PasteNewFile\\command`,
        label: "Paste Cleaned as New File",
        command: `${this.execPath} --smart-paste-dir "%V"`,
      });
      entries.push({
        parentKey: BG_PARENT_KEY,
        groupKey: bgGroupKey,
        actionKey: `${bgGroupKey}\\shell\\PasteAIFixed`,
        commandKey: `${bgGroupKey}\\shell\\PasteAIFixed\\command`,
        label: "Paste AI-Fixed as New File",
        command: `${this.execPath} --smart-paste-ai-fix "%V"`,
      });
      entries.push({
        parentKey: BG_PARENT_KEY,
        groupKey: bgGroupKey,
        actionKey: `${bgGroupKey}\\shell\\PasteTranslated`,
        commandKey: `${bgGroupKey}\\shell\\PasteTranslated\\command`,
        label: "Paste Translated as New File",
        command: `${this.execPath} --smart-paste-translate "%V"`,
      });

      // 2. File Context Commands
      entries.push({
        parentKey: FILE_PARENT_KEY,
        groupKey: fileGroupKey,
        actionKey: `${fileGroupKey}\\shell\\CleanCopy`,
        commandKey: `${fileGroupKey}\\shell\\CleanCopy\\command`,
        label: "Clean & Copy File Content",
        command: `${this.execPath} --smart-clean-file "%1"`,
      });
      entries.push({
        parentKey: FILE_PARENT_KEY,
        groupKey: fileGroupKey,
        actionKey: `${fileGroupKey}\\shell\\SummarizeFile`,
        commandKey: `${fileGroupKey}\\shell\\SummarizeFile\\command`,
        label: "Summarize File to Clipboard",
        command: `${this.execPath} --smart-summarize-file "%1"`,
      });
      entries.push({
        parentKey: FILE_PARENT_KEY,
        groupKey: fileGroupKey,
        actionKey: `${fileGroupKey}\\shell\\TranslateFile`,
        commandKey: `${fileGroupKey}\\shell\\TranslateFile\\command`,
        label: "Translate File to Clipboard",
        command: `${this.execPath} --smart-translate-file "%1"`,
      });

      // 3. Folder Context Command
      entries.push({
        parentKey: FOLDER_PARENT_KEY,
        groupKey: folderGroupKey,
        actionKey: `${folderGroupKey}\\shell\\PasteIntoFolder`,
        commandKey: `${folderGroupKey}\\shell\\PasteIntoFolder\\command`,
        label: "Paste in This Folder",
        command: `${this.execPath} --smart-paste-dir "%1"`,
      });

    } else {
      // Top Level mode
      entries.push({
        parentKey: BG_PARENT_KEY,
        actionKey: `${BG_PARENT_KEY}\\SmartPasteHub.PasteNewFile`,
        commandKey: `${BG_PARENT_KEY}\\SmartPasteHub.PasteNewFile\\command`,
        label: "SmartPasteHub: Paste as New File",
        command: `${this.execPath} --smart-paste-dir "%V"`,
      });
      entries.push({
        parentKey: BG_PARENT_KEY,
        actionKey: `${BG_PARENT_KEY}\\SmartPasteHub.PasteAIFixed`,
        commandKey: `${BG_PARENT_KEY}\\SmartPasteHub.PasteAIFixed\\command`,
        label: "SmartPasteHub: Paste AI-Fixed",
        command: `${this.execPath} --smart-paste-ai-fix "%V"`,
      });
      entries.push({
        parentKey: FILE_PARENT_KEY,
        actionKey: `${FILE_PARENT_KEY}\\SmartPasteHub.CleanCopy`,
        commandKey: `${FILE_PARENT_KEY}\\SmartPasteHub.CleanCopy\\command`,
        label: "SmartPasteHub: Clean & Copy File",
        command: `${this.execPath} --smart-clean-file "%1"`,
      });
      entries.push({
        parentKey: FILE_PARENT_KEY,
        actionKey: `${FILE_PARENT_KEY}\\SmartPasteHub.SummarizeFile`,
        commandKey: `${FILE_PARENT_KEY}\\SmartPasteHub.SummarizeFile\\command`,
        label: "SmartPasteHub: Summarize File",
        command: `${this.execPath} --smart-summarize-file "%1"`,
      });
      entries.push({
        parentKey: FOLDER_PARENT_KEY,
        actionKey: `${FOLDER_PARENT_KEY}\\SmartPasteHub.PasteIntoFolder`,
        commandKey: `${FOLDER_PARENT_KEY}\\SmartPasteHub.PasteIntoFolder\\command`,
        label: "SmartPasteHub: Paste in This Folder",
        command: `${this.execPath} --smart-paste-dir "%1"`,
      });
    }

    return { mode, entries };
  }

  static async install(mode: ContextMenuMode = "top_level"): Promise<boolean> {
    if (!this.isWindows) return false;

    try {
      const config = this.configFor(mode);
      await this.removeLegacySmartPasteEntries(config);
      const iconPath = this.getIconPath();

      for (const entry of config.entries) {
        await this.installEntry(entry, iconPath, mode);
      }

      const status = await this.getStatus(mode);
      if (status.installed) {
        return true;
      }

      await this.uninstall();
      for (const entry of config.entries) {
        await this.installEntry(entry, iconPath, mode);
      }
      const repaired = await this.getStatus(mode);
      return repaired.installed;
    } catch (error) {
      console.error("Failed to install context menu:", error);
      return false;
    }
  }

  static async uninstall(): Promise<boolean> {
    if (!this.isWindows) return false;
    try {
      await this.removeLegacySmartPasteEntries(undefined, true);
      return true;
    } catch (error) {
      console.error("Failed to uninstall context menu:", error);
      return false;
    }
  }

  static async isInstalled(): Promise<boolean> {
    if (!this.isWindows) return false;
    const status = await this.getStatus();
    return status.installed;
  }

  static async getStatus(mode: ContextMenuMode = "top_level"): Promise<ContextMenuStatus> {
    if (!this.isWindows) {
      return { supported: false, installed: false, installedCount: 0 };
    }

    const config = this.configFor(mode);
    let installedCount = 0;

    for (const entry of config.entries) {
      const exists = await this.queryKeyExists(entry.actionKey);
      const cmd = await this.queryValue(entry.commandKey);
      const cmdMatch = this.normalizeCommand(cmd) === this.normalizeCommand(entry.command);
      if (exists && cmdMatch) {
        installedCount++;
      }
    }

    return {
      supported: true,
      mode,
      installed: installedCount === config.entries.length,
      installedCount,
    };
  }

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

  private static async queryValue(key: string, valueName?: string): Promise<string | null> {
    const args = valueName ? ["query", key, "/v", valueName] : ["query", key, "/ve"];
    try {
      const output = await this.runReg(args);
      const valueLabel = valueName ?? "(Default)";
      const escaped = valueLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const match = output.match(new RegExp(`${escaped}\\s+REG_\\w+\\s+(.+)$`, "im"));
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
    if (!exists) return;
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

    for (const c of configs) {
      for (const entry of c.entries) {
        keep.add(entry.actionKey.toLowerCase());
        if (entry.groupKey) keep.add(entry.groupKey.toLowerCase());
      }
    }

    const keepActiveOnly = purgeAll ? new Set<string>() : keep;
    if (activeConfig && !purgeAll) {
      keepActiveOnly.clear();
      for (const entry of activeConfig.entries) {
        keepActiveOnly.add(entry.actionKey.toLowerCase());
        if (entry.groupKey) keepActiveOnly.add(entry.groupKey.toLowerCase());
      }
    }

    const parents = [BG_PARENT_KEY, FILE_PARENT_KEY, FOLDER_PARENT_KEY];
    for (const parent of parents) {
      const keys = await this.listSubKeys(parent);
      for (const key of keys) {
        const normalizedSrc = key.toLowerCase();
        const normalized = normalizedSrc.replace(/^hkey_current_user\\/, "hkcu\\");
        const isSmartPasteKey =
          normalized.includes("\\smartpastehub") ||
          normalized.includes("\\smartpaste");

        if (!isSmartPasteKey) continue;
        if (!purgeAll && keepActiveOnly.has(normalized)) continue;
        await this.deleteKeyIfExists(key);
      }
    }
  }

  private static async installEntry(
    entry: EntrySpec,
    iconPath: string,
    mode: ContextMenuMode,
  ): Promise<void> {
    if (mode === "submenu" && entry.groupKey) {
      await this.runReg(["add", entry.groupKey, "/ve", "/d", "SmartPasteHub", "/f"]);
      await this.runReg(["add", entry.groupKey, "/v", "Icon", "/d", iconPath, "/f"]);
      await this.runReg(["add", entry.groupKey, "/v", "MUIVerb", "/d", "SmartPasteHub", "/f"]);
      await this.runReg(["add", entry.groupKey, "/v", "Position", "/d", "Top", "/f"]);

      // Extended menus to avoid blocking immediate context menu rendering
      await this.runReg(["add", entry.groupKey, "/v", "ExtendedSubCommandsKey", "/d", entry.groupKey, "/f"]);
    }

    await this.runReg(["add", entry.actionKey, "/ve", "/d", entry.label, "/f"]);
    await this.runReg(["add", entry.actionKey, "/v", "Icon", "/d", iconPath, "/f"]);
    await this.runReg(["add", entry.commandKey, "/ve", "/d", entry.command, "/f"]);
  }

  private static getIconPath(): string {
    if (app.isPackaged) return process.execPath;
    const devIconPath = path.join(process.cwd(), "build", "icon.ico");
    if (fs.existsSync(devIconPath)) return devIconPath;
    const assetsIconPath = path.join(process.cwd(), "assets", "icons", "icon.ico");
    if (fs.existsSync(assetsIconPath)) return assetsIconPath;
    return process.execPath;
  }
}
