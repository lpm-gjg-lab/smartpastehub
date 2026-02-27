import fs from "fs/promises";
import path from "path";
import { app } from "electron";
import { SafeHandle } from "./contracts";

interface DragDropItem {
  id: number;
  content: string;
  contentType: string;
}

let nextId = 1;
const items: DragDropItem[] = [];
let initialized = false;
let writeQueue: Promise<void> = Promise.resolve();

function isPersistenceEnabled(): boolean {
  return process.env["NODE_ENV"] !== "test";
}

function getStoragePath(): string {
  const userDataPath = app?.getPath?.("userData");
  const baseDir =
    typeof userDataPath === "string" && userDataPath.length > 0
      ? userDataPath
      : process.cwd();
  return path.join(baseDir, "dragdrop-items.json");
}

function normalizeLoadedItem(raw: unknown): DragDropItem | null {
  const record = raw as Partial<DragDropItem>;
  const id = Number(record.id ?? 0);
  const content = String(record.content ?? "").trim();
  const contentType = String(record.contentType ?? "plain_text");
  if (!Number.isFinite(id) || id <= 0 || !content) {
    return null;
  }
  return {
    id,
    content,
    contentType,
  };
}

async function loadStateIfNeeded(): Promise<void> {
  if (initialized) {
    return;
  }
  initialized = true;

  if (!isPersistenceEnabled()) {
    return;
  }

  try {
    const raw = await fs.readFile(getStoragePath(), "utf8");
    const parsed = JSON.parse(raw) as {
      nextId?: number;
      items?: unknown[];
    };

    const loadedItems = (parsed.items ?? [])
      .map((item) => normalizeLoadedItem(item))
      .filter((item): item is DragDropItem => item !== null);

    items.splice(0, items.length, ...loadedItems);

    const maxId = loadedItems.reduce((max, item) => Math.max(max, item.id), 0);
    const parsedNextId = Number(parsed.nextId ?? 0);
    nextId = Math.max(
      maxId + 1,
      Number.isFinite(parsedNextId) ? parsedNextId : 1,
    );
  } catch {
    items.length = 0;
    nextId = 1;
  }
}

async function persistState(): Promise<void> {
  if (!isPersistenceEnabled()) {
    return;
  }

  const payload = JSON.stringify(
    {
      nextId,
      items,
    },
    null,
    2,
  );

  writeQueue = writeQueue
    .catch(() => undefined)
    .then(() => fs.writeFile(getStoragePath(), payload, "utf8"));
  await writeQueue;
}

export function registerDragDropIpc(safeHandle: SafeHandle): void {
  safeHandle("dragdrop:get-items", async () => {
    await loadStateIfNeeded();
    return [...items];
  });

  safeHandle("dragdrop:add-item", async (_, payload) => {
    await loadStateIfNeeded();

    const { content, contentType } = payload as {
      content: string;
      contentType?: string;
    };

    const text = String(content ?? "").trim();
    if (!text) {
      return false;
    }

    items.unshift({
      id: nextId++,
      content: text,
      contentType: String(contentType ?? "plain_text"),
    });
    await persistState();
    return true;
  });

  safeHandle("dragdrop:reorder", async (_, payload) => {
    await loadStateIfNeeded();

    const orderedIds = (payload as number[]) ?? [];
    const idSet = new Set(orderedIds.map((id) => Number(id)));
    const reordered: DragDropItem[] = [];

    for (const id of orderedIds) {
      const found = items.find((item) => item.id === Number(id));
      if (found) {
        reordered.push(found);
      }
    }

    for (const item of items) {
      if (!idSet.has(item.id)) {
        reordered.push(item);
      }
    }

    items.splice(0, items.length, ...reordered);
    await persistState();
    return true;
  });

  safeHandle("dragdrop:combine", async (_, payload) => {
    await loadStateIfNeeded();

    const { separator } = (payload as { separator?: string }) ?? {};
    const joiner = typeof separator === "string" ? separator : "\n";
    return items.map((item) => item.content).join(joiner);
  });

  safeHandle("dragdrop:clear", async () => {
    await loadStateIfNeeded();

    items.length = 0;
    await persistState();
    return true;
  });
}
