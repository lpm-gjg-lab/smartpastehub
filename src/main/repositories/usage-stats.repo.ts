import { Database } from "../db";
import { logger } from "../../shared/logger";

export interface UsageSummary {
  recentClips: unknown[];
  totalPastes: number;
  today: {
    date: string;
    charsCleaned: number;
    pasteCount: number;
    tableConverts: number;
    ocrCount: number;
    aiRewrites: number;
  };
}

type UsageDailyMetric =
  | "chars_cleaned"
  | "paste_count"
  | "table_converts"
  | "ocr_count"
  | "ai_rewrites";

interface IncrementUsageDailyInput {
  charsCleaned?: number;
  pasteCount?: number;
  tableConverts?: number;
  ocrCount?: number;
  aiRewrites?: number;
}

export class UsageStatsRepository {
  constructor(private readonly db: Database) {}

  private getTodayDate(): string {
    return new Date().toISOString().slice(0, 10);
  }

  private ensureTodayRow(date: string): void {
    this.db.run("INSERT OR IGNORE INTO usage_daily (date) VALUES (?)", [date]);
  }

  private incrementMetric(
    date: string,
    metric: UsageDailyMetric,
    amount: number,
  ): void {
    if (!Number.isFinite(amount) || amount <= 0) {
      return;
    }
    this.db.run(
      `UPDATE usage_daily SET ${metric} = ${metric} + ? WHERE date = ?`,
      [Math.floor(amount), date],
    );
  }

  incrementDaily(input: IncrementUsageDailyInput): void {
    try {
      const date = this.getTodayDate();
      this.ensureTodayRow(date);

      this.incrementMetric(date, "chars_cleaned", input.charsCleaned ?? 0);
      this.incrementMetric(date, "paste_count", input.pasteCount ?? 0);
      this.incrementMetric(date, "table_converts", input.tableConverts ?? 0);
      this.incrementMetric(date, "ocr_count", input.ocrCount ?? 0);
      this.incrementMetric(date, "ai_rewrites", input.aiRewrites ?? 0);
    } catch (error) {
      logger.warn("Usage analytics increment failed; skipping", { error });
    }
  }

  getSummary(): UsageSummary {
    const recentClips = this.db.all(
      "SELECT * FROM clipboard_history ORDER BY created_at DESC LIMIT 50",
    );
    const todayDate = this.getTodayDate();
    const stats = this.db.get<{
      total: number;
      chars_cleaned: number;
      paste_count: number;
      table_converts: number;
      ocr_count: number;
      ai_rewrites: number;
    }>(
      `SELECT
         (SELECT COUNT(*) FROM clipboard_history) AS total,
         COALESCE((SELECT chars_cleaned FROM usage_daily WHERE date = ?), 0) AS chars_cleaned,
         COALESCE((SELECT paste_count FROM usage_daily WHERE date = ?), 0) AS paste_count,
         COALESCE((SELECT table_converts FROM usage_daily WHERE date = ?), 0) AS table_converts,
         COALESCE((SELECT ocr_count FROM usage_daily WHERE date = ?), 0) AS ocr_count,
         COALESCE((SELECT ai_rewrites FROM usage_daily WHERE date = ?), 0) AS ai_rewrites`,
      [todayDate, todayDate, todayDate, todayDate, todayDate],
    );

    return {
      recentClips,
      totalPastes: stats?.total ?? 0,
      today: {
        date: todayDate,
        charsCleaned: stats?.chars_cleaned ?? 0,
        pasteCount: stats?.paste_count ?? 0,
        tableConverts: stats?.table_converts ?? 0,
        ocrCount: stats?.ocr_count ?? 0,
        aiRewrites: stats?.ai_rewrites ?? 0,
      },
    };
  }
}
