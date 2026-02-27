import { Database } from "../db";

export interface CreateHistoryEntryInput {
  originalText: string;
  cleanedText: string;
  htmlContent?: string | null;
  contentType: string;
  sourceApp?: string | null;
  presetUsed: string;
  charCount: number;
  isSensitive: boolean;
  aiMode?: string | null;
}

export interface RestoreHistoryEntryInput {
  originalText: string;
  cleanedText: string;
  htmlContent?: string | null;
  contentType: string;
  sourceApp?: string | null;
  presetUsed?: string | null;
  charCount?: number;
  isPinned?: boolean;
  isSensitive?: boolean;
  createdAt?: string;
}

export class HistoryRepository {
  constructor(private readonly db: Database) {}

  findById(id: number): unknown | undefined {
    return this.db.get("SELECT * FROM clipboard_history WHERE id = ?", [id]);
  }

  create(entry: CreateHistoryEntryInput): void {
    this.db.run(
      `INSERT INTO clipboard_history (original_text, cleaned_text, html_content, content_type, source_app, preset_used, char_count, is_sensitive, ai_mode)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        entry.originalText,
        entry.cleanedText,
        entry.htmlContent ?? null,
        entry.contentType,
        entry.sourceApp ?? null,
        entry.presetUsed,
        entry.charCount,
        entry.isSensitive ? 1 : 0,
        entry.aiMode ?? null,
      ],
    );
  }

  list(page: number, search?: string): unknown[] {
    const limit = 20;
    const offset = (page - 1) * limit;

    if (search) {
      return this.db.all(
        `SELECT * FROM history_fts JOIN clipboard_history ON history_fts.rowid = clipboard_history.id
         WHERE history_fts MATCH ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [search, limit, offset],
      );
    }

    return this.db.all(
      "SELECT * FROM clipboard_history ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [limit, offset],
    );
  }

  pin(id: number, pinned: boolean): void {
    this.db.run("UPDATE clipboard_history SET is_pinned = ? WHERE id = ?", [
      pinned ? 1 : 0,
      id,
    ]);
  }

  delete(id: number): void {
    this.db.run("DELETE FROM clipboard_history WHERE id = ?", [id]);
  }

  updateCleanedText(
    id: number,
    cleanedText: string,
    aiMode?: string | null,
  ): void {
    this.db.run(
      "UPDATE clipboard_history SET cleaned_text = ?, char_count = ?, ai_mode = COALESCE(?, ai_mode) WHERE id = ?",
      [cleanedText, cleanedText.length, aiMode ?? null, id],
    );
  }

  deleteMany(ids: number[]): void {
    if (ids.length === 0) {
      return;
    }
    const placeholders = ids.map(() => "?").join(",");
    this.db.run(
      `DELETE FROM clipboard_history WHERE id IN (${placeholders})`,
      ids,
    );
  }

  clearAll(): void {
    this.db.run("DELETE FROM clipboard_history");
  }

  restoreMany(entries: RestoreHistoryEntryInput[]): void {
    for (const entry of entries) {
      this.db.run(
        `INSERT INTO clipboard_history (original_text, cleaned_text, html_content, content_type, source_app, preset_used, char_count, is_pinned, is_sensitive, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          entry.originalText,
          entry.cleanedText,
          entry.htmlContent ?? null,
          entry.contentType,
          entry.sourceApp ?? null,
          entry.presetUsed ?? "default",
          entry.charCount ?? entry.cleanedText.length,
          entry.isPinned ? 1 : 0,
          entry.isSensitive ? 1 : 0,
          entry.createdAt ?? new Date().toISOString(),
        ],
      );
    }
  }

  getRecent(limit: number): unknown[] {
    return this.db.all(
      "SELECT * FROM clipboard_history ORDER BY created_at DESC LIMIT ?",
      [limit],
    );
  }

  countAll(): number {
    const stats = this.db.get<{ total: number }>(
      "SELECT COUNT(*) as total FROM clipboard_history",
    );
    return stats?.total ?? 0;
  }

  countRecentDuplicates(cleanedText: string, withinDays: number): number {
    const row = this.db.get<{ cnt: number }>(
      `SELECT COUNT(*) as cnt FROM clipboard_history WHERE cleaned_text = ? AND created_at >= datetime('now', ? || ' days')`,
      [cleanedText, `-${withinDays}`],
    );
    return row?.cnt ?? 0;
  }
}
