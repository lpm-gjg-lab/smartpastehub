import { clipboard } from 'electron';
import { EventEmitter } from 'events';
import { debounce } from '../shared/utils';

export interface ClipboardPayload {
  text: string;
  html?: string;
}

export class ClipboardWatcher extends EventEmitter {
  private lastText = '';
  private intervalId: NodeJS.Timeout | null = null;
  private pollInterval = 250;

  start() {
    const handler = debounce(() => this.checkClipboard(), 150);
    this.intervalId = setInterval(handler, this.pollInterval);
  }

  stop() {
    if (this.intervalId) clearInterval(this.intervalId);
    this.intervalId = null;
  }

  private checkClipboard() {
    const text = clipboard.readText();
    const html = clipboard.readHTML();
    if (text && text !== this.lastText) {
      this.lastText = text;
      this.emit('change', { text, html } as ClipboardPayload);
    }
  }
}
