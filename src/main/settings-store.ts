import fs from "fs/promises";
import path from "path";
import { app, safeStorage } from "electron";
import { AppSettings } from "../shared/types";
import { DEFAULT_SETTINGS } from "../shared/constants";

const mutableDefaults = JSON.parse(
  JSON.stringify(DEFAULT_SETTINGS),
) as AppSettings;

function isSecurePlatform(): boolean {
  return process.platform === "win32" || process.platform === "darwin";
}

function isEncryptedApiKey(value: string): boolean {
  return value.startsWith("enc:");
}

function encryptApiKey(plaintext: string): string {
  const value = plaintext.trim();
  if (!value) {
    return plaintext;
  }

  // Already encrypted payload from disk; keep as-is.
  if (isEncryptedApiKey(value)) {
    return plaintext;
  }

  if (!safeStorage.isEncryptionAvailable()) {
    // Fail closed on platforms where secure storage is expected.
    if (isSecurePlatform()) {
      throw new Error("Secure storage is unavailable for API key encryption");
    }
    // Linux/headless fallback: keep plaintext to avoid total settings lockout.
    return plaintext;
  }

  const encrypted = safeStorage.encryptString(plaintext);
  return `enc:${encrypted.toString("base64")}`;
}

function decryptApiKey(stored: string): string {
  if (!stored.startsWith("enc:")) {
    return stored;
  }

  const encoded = stored.slice(4);
  if (!encoded) {
    return "";
  }

  try {
    const encrypted = Buffer.from(encoded, "base64");
    if (!safeStorage.isEncryptionAvailable()) {
      return stored;
    }
    return safeStorage.decryptString(encrypted);
  } catch {
    return stored;
  }
}

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
        firewallRedactionMode: "display_only",
        autoMutateOnPublicApps: false,
        mutateClipboardApps: [],
        neverPersistSensitive: true,
      }),
      ...(partial.privacy ?? {}),
    },
    diagnostics: {
      ...(base.diagnostics ?? {
        observabilityEnabled: false, // default OFF — user must opt-in
        maxEvents: 500,
        telemetryDeviceId: "",
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
    let shouldMigratePlainApiKey = false;

    if (parsed.ai?.apiKey) {
      const diskValue = String(parsed.ai.apiKey);
      if (isEncryptedApiKey(diskValue)) {
        parsed.ai = {
          ...parsed.ai,
          apiKey: decryptApiKey(diskValue),
        };
      } else if (safeStorage.isEncryptionAvailable()) {
        // Plaintext key found on disk while encryption is available.
        // Keep runtime behavior unchanged, then migrate the file atomically.
        shouldMigratePlainApiKey = true;
      }
    }

    const merged = mergeSettings(mutableDefaults, parsed);
    if (shouldMigratePlainApiKey) {
      try {
        await writeDiskSettings(merged);
      } catch {
        // If migration fails we still return a usable runtime config.
      }
    }

    return merged;
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
  const settingsToPersist: AppSettings = {
    ...settings,
    ai: {
      ...settings.ai,
      apiKey:
        settings.ai.apiKey && settings.ai.apiKey.trim()
          ? encryptApiKey(settings.ai.apiKey)
          : settings.ai.apiKey,
    },
  };
  const payload = JSON.stringify(settingsToPersist, null, 2);
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
