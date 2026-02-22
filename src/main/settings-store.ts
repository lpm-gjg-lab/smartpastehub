import fs from "fs/promises";
import path from "path";
import { app } from "electron";
import { AppSettings } from "../shared/types";
import { DEFAULT_SETTINGS } from "../shared/constants";

const mutableDefaults = JSON.parse(
  JSON.stringify(DEFAULT_SETTINGS),
) as AppSettings;

function getConfigPath(): string {
  return path.join(app.getPath("userData"), "config.json");
}

function mergeSettings(
  base: AppSettings,
  partial: Partial<AppSettings>,
): AppSettings {
  return {
    ...base,
    ...partial,
    general: { ...base.general, ...partial.general },
    hotkeys: { ...base.hotkeys, ...partial.hotkeys },
    presets: { ...base.presets, ...partial.presets },
    security: { ...base.security, ...partial.security },
    history: { ...base.history, ...partial.history },
    ai: { ...base.ai, ...partial.ai },
    ocr: { ...base.ocr, ...partial.ocr },
    sync: { ...base.sync, ...partial.sync },
    license: { ...base.license, ...partial.license },
  };
}

async function readDiskSettings(): Promise<AppSettings> {
  const configPath = getConfigPath();

  try {
    const raw = await fs.readFile(configPath, "utf8");
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return mergeSettings(mutableDefaults, parsed);
  } catch (error) {
    const maybeError = error as NodeJS.ErrnoException;
    if (maybeError.code !== "ENOENT") {
      return { ...mutableDefaults };
    }

    await writeDiskSettings(mutableDefaults);
    return { ...mutableDefaults };
  }
}

async function writeDiskSettings(settings: AppSettings): Promise<void> {
  const configPath = getConfigPath();
  const tempPath = `${configPath}.tmp`;
  const payload = JSON.stringify(settings, null, 2);
  await fs.writeFile(tempPath, payload, "utf8");
  await fs.rename(tempPath, configPath);
}

let cachedSettings: AppSettings | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function scheduleWrite(settings: AppSettings): Promise<void> {
  writeQueue = writeQueue
    .catch(() => undefined)
    .then(() => writeDiskSettings(settings));
  return writeQueue;
}

export async function getSettings(): Promise<AppSettings> {
  if (!cachedSettings) {
    cachedSettings = await readDiskSettings();
  }
  return cachedSettings;
}

export async function updateSettings(
  partial: Partial<AppSettings>,
): Promise<AppSettings> {
  const current = await getSettings();
  const updated = mergeSettings(current, partial);
  cachedSettings = updated;
  await scheduleWrite(updated);
  return updated;
}
