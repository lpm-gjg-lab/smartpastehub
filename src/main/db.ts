import DatabaseDriver from 'better-sqlite3';
import { app } from 'electron';
import path from 'path';

export class Database {
  private db: DatabaseDriver.Database;

  constructor() {
    const dbPath = path.join(app.getPath('userData'), 'smartpastehub.db');
    this.db = new DatabaseDriver(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.db.pragma('synchronous = NORMAL');
    this.db.pragma('mmap_size = 268435456');
    this.db.pragma('cache_size = -8000');
    this.initialize();
    this.migrateSchema();
  }

  private initialize() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS clipboard_history (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          original_text TEXT NOT NULL,
          cleaned_text TEXT NOT NULL,
          html_content TEXT,
          content_type TEXT NOT NULL DEFAULT 'plain_text',
          source_app TEXT,
          preset_used TEXT,
          char_count INTEGER NOT NULL,
          is_pinned INTEGER NOT NULL DEFAULT 0,
          is_sensitive INTEGER NOT NULL DEFAULT 0,
          tags TEXT,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_history_created ON clipboard_history(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_history_type ON clipboard_history(content_type);
      CREATE INDEX IF NOT EXISTS idx_history_pinned ON clipboard_history(is_pinned);
      CREATE VIRTUAL TABLE IF NOT EXISTS history_fts USING fts5(
          original_text, cleaned_text, tags,
          content='clipboard_history',
          content_rowid='id'
      );
      CREATE TABLE IF NOT EXISTS snippets (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          content TEXT NOT NULL,
          tags TEXT,
          category TEXT,
          use_count INTEGER NOT NULL DEFAULT 0,
          last_used_at DATETIME,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE INDEX IF NOT EXISTS idx_snippets_category ON snippets(category);
      CREATE TABLE IF NOT EXISTS templates (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          content TEXT NOT NULL,
          variables TEXT NOT NULL,
          tags TEXT,
          use_count INTEGER NOT NULL DEFAULT 0,
          last_used_at DATETIME,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS usage_daily (
          date TEXT PRIMARY KEY,
          chars_cleaned INTEGER NOT NULL DEFAULT 0,
          paste_count INTEGER NOT NULL DEFAULT 0,
          table_converts INTEGER NOT NULL DEFAULT 0,
          ocr_count INTEGER NOT NULL DEFAULT 0,
          ai_rewrites INTEGER NOT NULL DEFAULT 0
      );
      CREATE TABLE IF NOT EXISTS context_rules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          source_app TEXT,
          target_app TEXT,
          content_type TEXT,
          preset TEXT NOT NULL,
          transforms TEXT NOT NULL,
          priority INTEGER NOT NULL DEFAULT 0,
          enabled INTEGER NOT NULL DEFAULT 1,
          created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
      CREATE TABLE IF NOT EXISTS regex_rules (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          pattern TEXT NOT NULL,
          replacement TEXT NOT NULL,
          flags TEXT DEFAULT 'g',
          enabled INTEGER NOT NULL DEFAULT 1,
          sort_order INTEGER NOT NULL DEFAULT 0
      );
    `);

    const existing = this.db.prepare('SELECT COUNT(*) as count FROM regex_rules').get() as { count: number };
    if (existing.count === 0) {
      this.db.prepare(
        `INSERT INTO regex_rules (name, pattern, replacement, flags) VALUES
          ('Hapus URL', 'https?://\\S+', '', 'g'),
          ('Hapus Emoji', '[\\u{1F600}-\\u{1F64F}\\u{1F300}-\\u{1F5FF}\\u{1F680}-\\u{1F6FF}]', '', 'gu'),
          ('Format Nomor HP', '(\\+62|62|0)(8\\d{2})(\\d{4})(\\d{3,4})', '+62 $2-$3-$4', 'g')
        `,
      ).run();
    }
  }

  private migrateSchema() {
    // Add ai_mode column if it doesn't exist yet (safe migration)
    try {
      this.db.exec("ALTER TABLE clipboard_history ADD COLUMN ai_mode TEXT");
    } catch {
      // Column already exists — safe to ignore
    }
  }
  run(sql: string, params?: unknown[]) {
    return this.db.prepare(sql).run(params ?? []);
  }

  all<T>(sql: string, params?: unknown[]): T[] {
    return this.db.prepare(sql).all(params ?? []) as T[];
  }

  get<T>(sql: string, params?: unknown[]): T | undefined {
    return this.db.prepare(sql).get(params ?? []) as T | undefined;
  }
}
