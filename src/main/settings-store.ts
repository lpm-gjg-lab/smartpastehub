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
  const mergedAppFilter = {
    ...(base.appFilter ?? { mode: "off" as const, apps: [] as string[] }),
    ...(partial.appFilter ?? {}),
  };

  return {
    general: { ...base.general, ...partial.general },
    hotkeys: { ...base.hotkeys, ...partial.hotkeys },
    presets: { ...base.presets, ...partial.presets },
    security: { ...base.security, ...partial.security },
    history: { ...base.history, ...partial.history },
    ai: { ...base.ai, ...partial.ai },
    ocr: { ...base.ocr, ...partial.ocr },
    sync: { ...base.sync, ...partial.sync },
    appFilter: mergedAppFilter,
    appProfiles: partial.appProfiles ?? base.appProfiles,
    automation: {
      ...(base.automation ?? {
        trustModeDefault: "balanced",
        appTrustModes: [],
        enableUniversalFallback: true,
        enablePastePreview: true,
        previewHoldMs: 250,
        enableCommandPalette: true,
        enableIntentFieldDetection: true,
        enableSmartUrlTransform: true,
        enableLocaleAwareness: true,
        enableHealthGuard: true,
        enableAutoLearning: true,
        enableRecipes: true,
        enableUndo: true,
        sessionClusterMinutes: 20,
      }),
      ...(partial.automation ?? {}),
    },
    privacy: {
      ...(base.privacy ?? {
        enableEphemeralSensitiveClips: true,
        sensitiveTtlSeconds: 90,
        sensitiveAllowlistApps: [],
        enablePrivacyFirewall: true,
        neverPersistSensitive: true,
      }),
      ...(partial.privacy ?? {}),
    },
    diagnostics: {
      ...(base.diagnostics ?? {
        observabilityEnabled: true,
        maxEvents: 500,
      }),
      ...(partial.diagnostics ?? {}),
    },
    recipes: partial.recipes ?? base.recipes,
    autoLearnedRules: partial.autoLearnedRules ?? base.autoLearnedRules,
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
