import { AppSettings } from '../shared/types';
import { Database } from '../main/db';

export async function dailyCleanup(db: Database, settings: AppSettings): Promise<void> {
  const { maxItems, retentionDays } = settings.history;

  db.run(
    `DELETE FROM clipboard_history 
     WHERE created_at < datetime('now', '-${retentionDays} days')
     AND is_pinned = 0`,
  );

  db.run(
    `DELETE FROM clipboard_history 
     WHERE id NOT IN (
       SELECT id FROM clipboard_history 
       WHERE is_pinned = 0 
       ORDER BY created_at DESC 
       LIMIT ${maxItems}
     ) AND is_pinned = 0`,
  );

  db.run("INSERT INTO history_fts(history_fts) VALUES('rebuild')");
  db.run('VACUUM');
}
