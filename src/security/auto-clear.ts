import { clipboard } from "electron";

export function scheduleClipboardClear(
  seconds: number,
  onCleared?: () => void,
): NodeJS.Timeout {
  return setTimeout(() => {
    clipboard.clear();
    onCleared?.();
  }, seconds * 1000);
}
