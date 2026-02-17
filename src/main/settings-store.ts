import fs from 'fs';
import path from 'path';
import { app } from 'electron';
import { AppSettings } from '../shared/types';
import { DEFAULT_SETTINGS } from '../shared/constants';

const mutableDefaults = JSON.parse(
  JSON.stringify(DEFAULT_SETTINGS),
) as AppSettings;

function getConfigPath(): string {
  return path.join(app.getPath('userData'), 'config.json');
}

function readDiskSettings(): AppSettings {
  const configPath = getConfigPath();
  if (!fs.existsSync(configPath)) {
    fs.writeFileSync(
      configPath,
      JSON.stringify(mutableDefaults, null, 2),
      'utf8',
    );
    return { ...mutableDefaults };
  }

  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<AppSettings>;
    return {
      ...mutableDefaults,
      ...parsed,
      general: { ...mutableDefaults.general, ...parsed.general },
      hotkeys: { ...mutableDefaults.hotkeys, ...parsed.hotkeys },
      presets: { ...mutableDefaults.presets, ...parsed.presets },
      security: { ...mutableDefaults.security, ...parsed.security },
      history: { ...mutableDefaults.history, ...parsed.history },
      ai: { ...mutableDefaults.ai, ...parsed.ai },
      ocr: { ...mutableDefaults.ocr, ...parsed.ocr },
      sync: { ...mutableDefaults.sync, ...parsed.sync },
      license: { ...mutableDefaults.license, ...parsed.license },
    };
  } catch {
    return { ...mutableDefaults };
  }
}

function writeDiskSettings(settings: AppSettings): void {
  fs.writeFileSync(getConfigPath(), JSON.stringify(settings, null, 2), 'utf8');
}

export function getSettings(): AppSettings {
  return readDiskSettings();
}

export function updateSettings(partial: Partial<AppSettings>): AppSettings {
  const current = readDiskSettings();
  const updated: AppSettings = {
    ...current,
    ...partial,
    general: { ...current.general, ...partial.general },
    hotkeys: { ...current.hotkeys, ...partial.hotkeys },
    presets: { ...current.presets, ...partial.presets },
    security: { ...current.security, ...partial.security },
    history: { ...current.history, ...partial.history },
    ai: { ...current.ai, ...partial.ai },
    ocr: { ...current.ocr, ...partial.ocr },
    sync: { ...current.sync, ...partial.sync },
    license: { ...current.license, ...partial.license },
  };
  writeDiskSettings(updated);
  return updated;
}
