import { BrowserWindow, clipboard, ipcMain } from "electron";
import { cleanContent } from "../core/cleaner";
import { detectContentType } from "../core/content-detector";
import { maskData } from "../security/data-masker";
import { detectSensitiveData } from "../security/sensitive-detector";
import { Database } from "./db";
import { getSettings, updateSettings } from "./settings-store";
import { ContentType, SensitiveMatch } from "../shared/types";
import { fillTemplate, Template } from "../productivity/template-engine";
import { rewriteText, RewriteOptions } from "../ai/ai-rewriter";
import { recognizeText, OCROptions } from "../ocr/ocr-engine";
import { enqueue, dequeue, peek, size, clearQueue } from "../productivity/paste-queue";
import { startCollecting, addItem, mergeAndPaste, clear as clearMulti, getMultiClipboard } from "../productivity/multi-clipboard";

import { IPCResponseEnvelope } from "../shared/ipc-response";

/**
 * Wraps an IPC handler with a try/catch block to prevent main process
 * unhandled promise rejections from crashing the renderer.
 * Normalizes all returns into an IPCResponseEnvelope.
 */
function safeHandle<T>(
  channel: string,
  handler: (event: Electron.IpcMainInvokeEvent, payload: any) => Promise<T> | T
) {
  ipcMain.handle(
    channel,
    async (event, payload): Promise<IPCResponseEnvelope<T>> => {
      try {
        const data = await handler(event, payload);
        return { ok: true, data };
      } catch (error) {
        console.error(`[IPC Error] ${channel}:`, error);
        return {
          ok: false,
          error: {
            code: "INTERNAL_ERROR",
            message: error instanceof Error ? error.message : String(error),
            recoverable: true,
          },
        };
      }
    }
  );
}

export function registerIpcHandlers(
  mainWindow: BrowserWindow, 
  db: Database,
  createFloatingWindow: (route: string, width?: number, height?: number) => BrowserWindow
) {
  safeHandle("settings:get", async () => getSettings());
  safeHandle("settings:update", async (_, partial) =>
    updateSettings(partial),
  );
  safeHandle("clipboard:write", async (_, { text }) => {
    clipboard.writeText(String(text ?? ""));
    return true;
  });

  safeHandle("clipboard:paste", async (_, payload) => {
    const { preset, text, html } = payload as {
      preset: string;
      text: string;
      html?: string;
    };
    const content = { text, html };
    const result = await cleanContent(content);
    const detected = detectContentType(content.text, content.html);
    db.run(
      `INSERT INTO clipboard_history (original_text, cleaned_text, html_content, content_type, preset_used, char_count, is_sensitive)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        content.text,
        result.cleaned,
        content.html ?? null,
        detected.type,
        preset,
        result.cleaned.length,
        result.securityAlert ? 1 : 0,
      ],
    );
    mainWindow.webContents.send("clipboard:cleaned", {
      original: content.text,
      cleaned: result.cleaned,
      type: detected.type,
    });
    if (result.securityAlert) {
      mainWindow.webContents.send("security:alert", result.securityAlert);
    }
    return result;
  });

  safeHandle("security:mask", async (_, payload) => {
    const { mode, matches, text } = payload as {
      mode: "full" | "partial" | "skip";
      matches: SensitiveMatch[];
      text: string;
    };
    return maskData(text, matches, mode);
  });

  safeHandle("history:list", async (_, { page, search }) => {
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
      "SELECT * FROM clipboard_history ORDER BY created_at DESC LIMIT ? OFFSET ?",
      [limit, offset],
    );
  });

  safeHandle("history:pin", async (_, { id, pinned }) => {
    db.run("UPDATE clipboard_history SET is_pinned = ? WHERE id = ?", [
      pinned ? 1 : 0,
      id,
    ]);
    return true;
  });

  safeHandle("history:delete", async (_, { id }) => {
    db.run("DELETE FROM clipboard_history WHERE id = ?", [id]);
    return true;
  });

  safeHandle("snippet:list", async (_, { category }) => {
    if (category) {
      return db.all(
        "SELECT * FROM snippets WHERE category = ? ORDER BY created_at DESC",
        [category],
      );
    }
    return db.all("SELECT * FROM snippets ORDER BY created_at DESC");
  });

  safeHandle(
    "snippet:create",
    async (_, { name, content, tags, category }) => {
      db.run(
        "INSERT INTO snippets (name, content, tags, category) VALUES (?, ?, ?, ?)",
        [name, content, tags ? JSON.stringify(tags) : null, category ?? null],
      );
      return true;
    },
  );

  safeHandle("snippet:update", async (_, { id, name, content, tags, category }) => {
    db.run(
      "UPDATE snippets SET name = ?, content = ?, tags = ?, category = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [name, content, tags ? JSON.stringify(tags) : null, category ?? null, id]
    );
    return true;
  });

  safeHandle("snippet:delete", async (_, { id }) => {
    db.run("DELETE FROM snippets WHERE id = ?", [id]);
    return true;
  });

  safeHandle("template:fill", async (_, { id, values }) => {
    const template = db.get<Template>("SELECT * FROM templates WHERE id = ?", [
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

  safeHandle("template:list", async () => {
    return db.all("SELECT * FROM templates ORDER BY created_at DESC");
  });

  safeHandle("template:create", async (_, { name, content, variables, tags }) => {
    db.run(
      "INSERT INTO templates (name, content, variables, tags) VALUES (?, ?, ?, ?)",
      [name, content, JSON.stringify(variables || []), tags ? JSON.stringify(tags) : null]
    );
    return true;
  });

  safeHandle("template:update", async (_, { id, name, content, variables, tags }) => {
    db.run(
      "UPDATE templates SET name = ?, content = ?, variables = ?, tags = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
      [name, content, JSON.stringify(variables || []), tags ? JSON.stringify(tags) : null, id]
    );
    return true;
  });

  safeHandle("template:delete", async (_, { id }) => {
    db.run("DELETE FROM templates WHERE id = ?", [id]);
    return true;
  });

  safeHandle("security:scan", async (_, { text }) => {
    return detectSensitiveData(text as string);
  });

  safeHandle("clipboard:detect", async (_, { text, html }) => {
    return detectContentType(text as string, html as string | undefined) as {
      type: ContentType;
    };
  });

  safeHandle("ai:rewrite", async (_, { text, options }) => {
    return rewriteText(text, options as RewriteOptions);
  });

  safeHandle("ocr:recognize", async (_, { image, options }) => {
    return recognizeText(image, options as OCROptions);
  });

  // Productivity: Paste Queue
  safeHandle("queue:enqueue", async (_, { text }) => { enqueue(text); return true; });
  safeHandle("queue:dequeue", async () => dequeue());
  safeHandle("queue:peek", async () => peek());
  safeHandle("queue:size", async () => size());
  safeHandle("queue:clear", async () => { clearQueue(); return true; });

  // Productivity: Multi-Clipboard
  safeHandle("multi:start", async () => { startCollecting(); return true; });
  safeHandle("multi:add", async (_, { text }) => { addItem(text); return true; });
  safeHandle("multi:merge", async (_, { separator }) => mergeAndPaste(separator));
  safeHandle("multi:clear", async () => { clearMulti(); return true; });
  safeHandle("multi:state", async () => getMultiClipboard());

  safeHandle("window:open", async (_, { route, width, height }) => {
    createFloatingWindow(route, width, height);
    return true;
  });
}
