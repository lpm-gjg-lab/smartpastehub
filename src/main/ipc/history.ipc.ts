import { IpcDependencies, SafeHandle } from "./contracts";

export function registerHistoryIpc(
  safeHandle: SafeHandle,
  deps: Pick<IpcDependencies, "historyRepo">,
): void {
  safeHandle("history:list", async (_, payload) => {
    const { page, search } = payload as { page: number; search?: string };
    return deps.historyRepo.list(page, search);
  });

  safeHandle("history:pin", async (_, payload) => {
    const { id, pinned } = payload as { id: number; pinned: boolean };
    deps.historyRepo.pin(id, pinned);
    return true;
  });

  safeHandle("history:delete", async (_, payload) => {
    const { id } = payload as { id: number };
    deps.historyRepo.delete(id);
    return true;
  });

  safeHandle("history:update", async (_, payload) => {
    const { id, cleanedText, aiMode } = payload as {
      id: number;
      cleanedText: string;
      aiMode?: string | null;
    };
    deps.historyRepo.updateCleanedText(id, cleanedText, aiMode ?? null);
    return true;
  });

  safeHandle("history:delete-many", async (_, payload) => {
    const { ids } = payload as { ids: number[] };
    deps.historyRepo.deleteMany(ids);
    return true;
  });

  safeHandle("history:clear", async () => {
    deps.historyRepo.clearAll();
    return true;
  });

  safeHandle("history:restore", async (_, payload) => {
    const { entries } = payload as {
      entries: Array<{
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
      }>;
    };
    deps.historyRepo.restoreMany(entries);
    return true;
  });

  safeHandle("history:export", async (_, payload) => {
    const { format } = payload as { format: "csv" | "json" };
    const rows = deps.historyRepo.getRecent(1000) as Array<
      Record<string, unknown>
    >;
    if (format === "json") {
      return {
        data: JSON.stringify(rows, null, 2),
        filename: "clipboard-audit.json",
      };
    }
    // CSV
    const headers = [
      "id",
      "original_text",
      "cleaned_text",
      "content_type",
      "source_app",
      "created_at",
      "is_pinned",
      "is_sensitive",
    ];
    const csvRows = rows.map((row) =>
      headers.map((h) => JSON.stringify(String(row[h] ?? ""))).join(","),
    );
    return {
      data: [headers.join(","), ...csvRows].join("\n"),
      filename: "clipboard-audit.csv",
    };
  });
}
