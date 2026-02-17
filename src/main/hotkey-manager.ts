import { globalShortcut } from 'electron';

export function registerHotkey(accelerator: string, handler: () => void): boolean {
  try {
    return globalShortcut.register(accelerator, handler);
  } catch {
    return false;
  }
}

export function unregisterAllHotkeys(): void {
  globalShortcut.unregisterAll();
}
