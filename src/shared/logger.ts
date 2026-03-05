import { app } from 'electron';
import fs from 'fs';
import path from 'path';

export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'fatal';

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: Record<string, unknown>;
  source?: string;
}

const SENSITIVE_KEYS = ['password', 'apiKey', 'token', 'secret', 'key'] as const;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB
const MAX_FILES = 5;
const FLUSH_INTERVAL_MS = 2000;

class Logger {
  private _logDir?: string;
  private _currentFile?: string;
  private _stream?: fs.WriteStream;
  private _pendingLines: string[] = [];
  private _flushTimer?: ReturnType<typeof setTimeout>;
  private _streamSize = 0;

  constructor() { }

  private init(): void {
    if (this._logDir) return;
    try {
      this._logDir = path.join(app.getPath('userData'), 'logs');
    } catch {
      this._logDir = path.join(process.cwd(), '.logs');
    }
    fs.mkdirSync(this._logDir, { recursive: true });
    this._currentFile = this.getLogFileName();
    this.openStream();
  }

  private getLogFileName(): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this._logDir!, `smartpaste-${date}.log`);
  }

  private openStream(): void {
    if (!this._currentFile) return;
    try {
      this._stream = fs.createWriteStream(this._currentFile, { flags: 'a' });
      this._stream.on('error', () => {
        this._stream = undefined;
      });
      // Track file size for rotation, starting from current size
      try {
        this._streamSize = fs.statSync(this._currentFile).size;
      } catch {
        this._streamSize = 0;
      }
    } catch {
      this._stream = undefined;
    }
  }

  private scheduleFlush(): void {
    if (this._flushTimer) return;
    this._flushTimer = setTimeout(() => {
      this._flushTimer = undefined;
      this.flushPending();
    }, FLUSH_INTERVAL_MS);
  }

  private flushPending(): void {
    if (!this._stream || this._pendingLines.length === 0) return;
    const chunk = this._pendingLines.join('');
    this._pendingLines = [];
    this._streamSize += Buffer.byteLength(chunk, 'utf8');
    this._stream.write(chunk, 'utf8');

    if (this._streamSize >= MAX_FILE_SIZE) {
      this.rotate();
    }
  }

  private rotate(): void {
    if (!this._logDir || !this._currentFile) return;
    try {
      this._stream?.end();
      this._stream = undefined;
      const files = fs
        .readdirSync(this._logDir)
        .filter((f) => f.startsWith('smartpaste-'))
        .sort();
      while (files.length >= MAX_FILES) {
        const oldest = files.shift();
        if (oldest) {
          try {
            fs.unlinkSync(path.join(this._logDir, oldest));
          } catch { /* best effort */ }
        }
      }
      this._currentFile = this.getLogFileName();
      this._streamSize = 0;
      this.openStream();
    } catch { /* best effort */ }
  }

  private sanitizeContext(
    ctx?: Record<string, unknown>,
  ): Record<string, unknown> | undefined {
    if (!ctx) return undefined;
    const sanitized = { ...ctx };
    for (const k of Object.keys(sanitized)) {
      if (SENSITIVE_KEYS.some((sk) => k.toLowerCase().includes(sk))) {
        sanitized[k] = '[REDACTED]';
      }
    }
    return sanitized;
  }

  private write(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
  ): void {
    this.init();
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.sanitizeContext(context),
    };
    const line = JSON.stringify(entry) + '\n';

    this._pendingLines.push(line);
    this.scheduleFlush();

    if (process.env['NODE_ENV'] === 'development') {
      console.log(`[${level.toUpperCase()}] ${message}`, context ?? '');
    }
  }

  debug(msg: string, ctx?: Record<string, unknown>): void {
    this.write('debug', msg, ctx);
  }
  info(msg: string, ctx?: Record<string, unknown>): void {
    this.write('info', msg, ctx);
  }
  warn(msg: string, ctx?: Record<string, unknown>): void {
    this.write('warn', msg, ctx);
  }
  error(msg: string, ctx?: Record<string, unknown>): void {
    this.write('error', msg, ctx);
  }
  fatal(msg: string, ctx?: Record<string, unknown>): void {
    this.write('fatal', msg, ctx);
    // Flush immediately for fatal events — we may not have time
    this.flushPending();
  }

  /** Flush any remaining buffered log lines (call on app quit). */
  flush(): void {
    if (this._flushTimer) {
      clearTimeout(this._flushTimer);
      this._flushTimer = undefined;
    }
    this.flushPending();
    this._stream?.end();
    this._stream = undefined;
  }
}

export const logger = new Logger();
