import { clipboard } from "electron";
import { EventEmitter } from "events";

export interface ClipboardPayload {
  text: string;
  html?: string;
}

export class ClipboardWatcher extends EventEmitter {
  private lastText = "";
  private intervalId: NodeJS.Timeout | null = null;
  private pollInterval = 250;

  start() {
    this.intervalId = setInterval(
      () => this.checkClipboard(),
      this.pollInterval,
    );
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
  }

  private checkClipboard() {
    const text = clipboard.readText();
    if (text && text !== this.lastText) {
      const html = clipboard.readHTML();
      this.lastText = text;
      this.emit("change", { text, html } as ClipboardPayload);
    }
  }
}
