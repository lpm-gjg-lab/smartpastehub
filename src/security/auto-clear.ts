import { clipboard } from 'electron';

export function scheduleClipboardClear(seconds: number): NodeJS.Timeout {
  return setTimeout(() => {
    clipboard.clear();
  }, seconds * 1000);
}
