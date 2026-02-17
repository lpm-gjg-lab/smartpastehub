import { BrowserWindow, clipboard, ipcMain } from 'electron';
import { cleanContent } from '../core/cleaner';
import { detectContentType } from '../core/content-detector';
import { maskData } from '../security/data-masker';
import { detectSensitiveData } from '../security/sensitive-detector';
import { Database } from './db';
import { getSettings, updateSettings } from './settings-store';
import { ContentType, SensitiveMatch } from '../shared/types';
import { fillTemplate, Template } from '../productivity/template-engine';

export function registerIpcHandlers(mainWindow: BrowserWindow, db: Database) {
  ipcMain.handle('settings:get', async () => getSettings());
  ipcMain.handle('settings:update', async (_, partial) =>
    updateSettings(partial),
  );
  ipcMain.handle('clipboard:write', async (_, { text }) => {
    clipboard.writeText(String(text ?? ''));
    return true;
  });

  ipcMain.handle('clipboard:paste', async (_, payload) => {
    const { preset, text, html } = payload as {
      preset: string;
      text: string;
      html?: string;
    };
    const content = { text, html };
    const result = await cleanContent(content);
    db.run(
      `INSERT INTO clipboard_history (original_text, cleaned_text, html_content, content_type, preset_used, char_count, is_sensitive)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        content.text,
        result.cleaned,
        content.html ?? null,
        detectContentType(content.text, content.html).type,
        preset,
        result.cleaned.length,
        result.securityAlert ? 1 : 0,
      ],
    );
    mainWindow.webContents.send('clipboard:cleaned', {
      original: content.text,
      cleaned: result.cleaned,
      type: detectContentType(content.text, content.html).type,
    });
    if (result.securityAlert) {
      mainWindow.webContents.send('security:alert', result.securityAlert);
    }
    return result;
  });

  ipcMain.handle('security:mask', async (_, payload) => {
    const { mode, matches, text } = payload as {
      mode: 'full' | 'partial' | 'skip';
      matches: SensitiveMatch[];
      text: string;
    };
    return maskData(text, matches, mode);
  });

  ipcMain.handle('history:list', async (_, { page, search }) => {
    const limit = 20;
    const offset = (page - 1) * limit;
    if (search) {
      return db.all(
        `SELECT * FROM history_fts JOIN clipboard_history ON history_fts.rowid = clipboard_history.id
         WHERE history_fts MATCH ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [search, limit, offset],
      );
    }
    return db.all(
      'SELECT * FROM clipboard_history ORDER BY created_at DESC LIMIT ? OFFSET ?',
      [limit, offset],
    );
  });

  ipcMain.handle('history:pin', async (_, { id, pinned }) => {
    db.run('UPDATE clipboard_history SET is_pinned = ? WHERE id = ?', [
      pinned ? 1 : 0,
      id,
    ]);
    return true;
  });

  ipcMain.handle('history:delete', async (_, { id }) => {
    db.run('DELETE FROM clipboard_history WHERE id = ?', [id]);
    return true;
  });

  ipcMain.handle('snippet:list', async (_, { category }) => {
    if (category) {
      return db.all(
        'SELECT * FROM snippets WHERE category = ? ORDER BY created_at DESC',
        [category],
      );
    }
    return db.all('SELECT * FROM snippets ORDER BY created_at DESC');
  });

  ipcMain.handle(
    'snippet:create',
    async (_, { name, content, tags, category }) => {
      db.run(
        'INSERT INTO snippets (name, content, tags, category) VALUES (?, ?, ?, ?)',
        [name, content, tags ? JSON.stringify(tags) : null, category ?? null],
      );
      return true;
    },
  );

  ipcMain.handle('template:fill', async (_, { id, values }) => {
    const template = db.get<Template>('SELECT * FROM templates WHERE id = ?', [
      id,
    ]);
    if (!template) return null;
    return fillTemplate(
      {
        ...template,
        variables: JSON.parse(template.variables as unknown as string),
        tags: template.tags
          ? JSON.parse(template.tags as unknown as string)
          : [],
      } as Template,
      values as Record<string, string>,
    );
  });

  ipcMain.handle('security:scan', async (_, { text }) => {
    return detectSensitiveData(text as string);
  });

  ipcMain.handle('clipboard:detect', async (_, { text, html }) => {
    return detectContentType(text as string, html as string | undefined) as {
      type: ContentType;
    };
  });
}
