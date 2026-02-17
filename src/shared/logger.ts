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
  private logDir: string;
  private currentFile: string;
  private maxFileSize = 5 * 1024 * 1024;
  private maxFiles = 5;

  constructor() {
    this.logDir = path.join(app.getPath('userData'), 'logs');
    fs.mkdirSync(this.logDir, { recursive: true });
    this.currentFile = this.getLogFileName();
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
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      context: this.sanitizeContext(context),
    };
    const line = JSON.stringify(entry) + '\n';
    fs.appendFileSync(this.currentFile, line);
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
    return path.join(this.logDir, `smartpaste-${date}.log`);
  }

  private rotateIfNeeded() {
    try {
      const stats = fs.statSync(this.currentFile);
      if (stats.size < this.maxFileSize) return;
      const files = fs
        .readdirSync(this.logDir)
        .filter((file) => file.startsWith('smartpaste-'))
        .sort();
      while (files.length >= this.maxFiles) {
        const oldest = files.shift();
        if (oldest) fs.unlinkSync(path.join(this.logDir, oldest));
      }
      this.currentFile = this.getLogFileName();
    } catch {
      return;
    }
  }
}

export const logger = new Logger();
