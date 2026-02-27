import { clipboard } from "electron";
import { IpcDependencies, SafeHandle } from "./contracts";

interface RingItem {
  id: number;
  slotIndex: number;
  content: string;
  originalText: string;
  hasBeenCleaned: boolean;
  contentType: string;
  timestamp: number;
}

function toRingItems(rows: unknown[]): RingItem[] {
  return rows
    .map((row, idx) => {
      const entry = row as Record<string, unknown>;
      const id = Number(entry.id ?? 0);
      const content = String(entry.cleaned_text ?? entry.cleanedText ?? "");
      const originalText = String(entry.original_text ?? entry.originalText ?? content);
      const hasBeenCleaned = content !== originalText && originalText.length > 0;
      const contentType = String(
        entry.content_type ?? entry.contentType ?? "plain_text",
      );
      const createdAt = String(entry.created_at ?? entry.createdAt ?? "");
      const ts = Date.parse(createdAt);

      return {
        id,
        slotIndex: idx,
        content,
        originalText,
        hasBeenCleaned,
        contentType,
        timestamp: Number.isFinite(ts) ? ts : Date.now(),
      };
    })
    .filter((item) => item.id > 0 && item.content.length > 0);
}

export function registerRingIpc(
  safeHandle: SafeHandle,
  deps: Pick<IpcDependencies, "historyRepo">,
): void {
  safeHandle("ring:get-items", async () => {
    const rows = deps.historyRepo.getRecent(25) as unknown[];
    return toRingItems(rows);
  });

  safeHandle("ring:search", async (_, payload) => {
    const query = String(payload ?? "").trim();
    if (!query) {
      const rows = deps.historyRepo.getRecent(25) as unknown[];
      return toRingItems(rows);
    }

    const rows = deps.historyRepo.list(1, query) as unknown[];
    return toRingItems(rows);
  });

  safeHandle("ring:select", async (_, payload) => {
    const id = Number(payload ?? 0);
    if (!Number.isFinite(id) || id <= 0) {
      return false;
    }

    const found = deps.historyRepo.findById(id) as
      | Record<string, unknown>
      | undefined;
    if (!found) {
      return false;
    }

    const text = String(found.cleaned_text ?? found.cleanedText ?? "");
    if (!text) {
      return false;
    }

    clipboard.writeText(text);
    return true;
  });

  safeHandle("ring:select-original", async (_, payload) => {
    const id = Number(payload ?? 0);
    if (!Number.isFinite(id) || id <= 0) {
      return false;
    }

    const found = deps.historyRepo.findById(id) as
      | Record<string, unknown>
      | undefined;
    if (!found) {
      return false;
    }

    const text = String(found.original_text ?? found.originalText ?? "");
    if (!text) {
      return false;
    }

    clipboard.writeText(text);
    return true;
  });

  safeHandle("ring:delete", async (_, payload) => {
    const id = Number(payload ?? 0);
    if (!Number.isFinite(id) || id <= 0) {
      return false;
    }
    deps.historyRepo.delete(id);
    return true;
  });

  safeHandle("ring:pin", async (_, payload) => {
    const id = Number(payload ?? 0);
    if (!Number.isFinite(id) || id <= 0) {
      return false;
    }
    deps.historyRepo.pin(id, true);
    return true;
  });
}
