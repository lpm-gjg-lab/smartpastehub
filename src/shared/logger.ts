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

class Logger {
  private _logDir?: string;
  private _currentFile?: string;
  private maxFileSize = 5 * 1024 * 1024;
  private maxFiles = 5;

  constructor() {}

  private init() {
    if (this._logDir) return;
    try {
      this._logDir = path.join(app.getPath('userData'), 'logs');
      fs.mkdirSync(this._logDir, { recursive: true });
      this._currentFile = this.getLogFileName();
    } catch (e) {
      this._logDir = path.join(process.cwd(), '.logs');
      fs.mkdirSync(this._logDir, { recursive: true });
      this._currentFile = this.getLogFileName();
    }
  }

  debug(msg: string, ctx?: Record<string, unknown>) {
    this.write('debug', msg, ctx);
  }
  info(msg: string, ctx?: Record<string, unknown>) {
    this.write('info', msg, ctx);
  }
  warn(msg: string, ctx?: Record<string, unknown>) {
    this.write('warn', msg, ctx);
  }
  error(msg: string, ctx?: Record<string, unknown>) {
    this.write('error', msg, ctx);
  }
  fatal(msg: string, ctx?: Record<string, unknown>) {
    this.write('fatal', msg, ctx);
  }

  private write(
    level: LogLevel,
    message: string,
    context?: Record<string, unknown>,
  ) {
    this.init();
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.sanitizeContext(context),
    };
    const line = JSON.stringify(entry) + '\n';
    if (this._currentFile) {
      fs.appendFileSync(this._currentFile, line);
    }
    if (process.env['NODE_ENV'] === 'development') {
      console.log(`[${level.toUpperCase()}] ${message}`, context || '');
    }
    this.rotateIfNeeded();
  }

  private sanitizeContext(ctx?: Record<string, unknown>) {
    if (!ctx) return undefined;
    const sanitized = { ...ctx };
    const sensitiveKeys = ['password', 'apiKey', 'token', 'secret', 'key'];
    for (const k of Object.keys(sanitized)) {
      if (sensitiveKeys.some((sk) => k.toLowerCase().includes(sk))) {
        sanitized[k] = '[REDACTED]';
      }
    }
    return sanitized;
  }

  private getLogFileName(): string {
    const date = new Date().toISOString().split('T')[0];
    return path.join(this._logDir!, `smartpaste-${date}.log`);
  }

  private rotateIfNeeded() {
    if (!this._currentFile || !this._logDir) return;
    try {
      const stats = fs.statSync(this._currentFile);
      if (stats.size < this.maxFileSize) return;
      const files = fs
        .readdirSync(this._logDir)
        .filter((file) => file.startsWith('smartpaste-'))
        .sort();
      while (files.length >= this.maxFiles) {
        const oldest = files.shift();
        if (oldest) fs.unlinkSync(path.join(this._logDir, oldest));
      }
      this._currentFile = this.getLogFileName();
    } catch {
      return;
    }
  }
}

export const logger = new Logger();
