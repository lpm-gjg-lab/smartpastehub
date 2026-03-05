import { IpcDependencies, SafeHandle } from "./contracts";
import {
  expectArray,
  expectBoolean,
  expectNumber,
  expectOptionalString,
  expectRecord,
  expectString,
  expectStringUnion,
} from "./validation";

function validateHistoryListPayload(payload: unknown): {
  page: number;
  search?: string;
} {
  const record = expectRecord(payload);
  return {
    page: expectNumber(record.page, "page", { integer: true, min: 1 }),
    search:
      record.search === undefined
        ? undefined
        : expectString(record.search, "search", { allowEmpty: true }),
  };
}

function validateHistoryPinPayload(payload: unknown): {
  id: number;
  pinned: boolean;
} {
  const record = expectRecord(payload);
  return {
    id: expectNumber(record.id, "id", { integer: true, min: 1 }),
    pinned: expectBoolean(record.pinned, "pinned"),
  };
}

function validateHistoryDeletePayload(payload: unknown): { id: number } {
  const record = expectRecord(payload);
  return {
    id: expectNumber(record.id, "id", { integer: true, min: 1 }),
  };
}

function validateHistoryUpdatePayload(payload: unknown): {
  id: number;
  cleanedText: string;
  aiMode?: string | null;
} {
  const record = expectRecord(payload);
  return {
    id: expectNumber(record.id, "id", { integer: true, min: 1 }),
    cleanedText: expectString(record.cleanedText, "cleanedText", {
      allowEmpty: true,
    }),
    aiMode:
      record.aiMode === undefined
        ? undefined
        : expectOptionalString(record.aiMode, "aiMode"),
  };
}

function validateHistoryDeleteManyPayload(payload: unknown): { ids: number[] } {
  const record = expectRecord(payload);
  return {
    ids: expectArray(record.ids, "ids", (item, index) =>
      expectNumber(item, `ids[${index}]`, { integer: true, min: 1 }),
    ),
  };
}

type RestoreEntry = {
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
};

function validateRestoreEntry(payload: unknown, index: number): RestoreEntry {
  const record = expectRecord(payload, `entries[${index}]`);
  return {
    originalText: expectString(
      record.originalText,
      `entries[${index}].originalText`,
      {
        allowEmpty: true,
      },
    ),
    cleanedText: expectString(
      record.cleanedText,
      `entries[${index}].cleanedText`,
      {
        allowEmpty: true,
      },
    ),
    htmlContent:
      record.htmlContent === undefined
        ? undefined
        : expectOptionalString(
            record.htmlContent,
            `entries[${index}].htmlContent`,
          ),
    contentType: expectString(
      record.contentType,
      `entries[${index}].contentType`,
    ),
    sourceApp:
      record.sourceApp === undefined
        ? undefined
        : expectOptionalString(record.sourceApp, `entries[${index}].sourceApp`),
    presetUsed:
      record.presetUsed === undefined
        ? undefined
        : expectOptionalString(
            record.presetUsed,
            `entries[${index}].presetUsed`,
          ),
    charCount:
      record.charCount === undefined
        ? undefined
        : expectNumber(record.charCount, `entries[${index}].charCount`, {
            integer: true,
            min: 0,
          }),
    isPinned:
      record.isPinned === undefined
        ? undefined
        : expectBoolean(record.isPinned, `entries[${index}].isPinned`),
    isSensitive:
      record.isSensitive === undefined
        ? undefined
        : expectBoolean(record.isSensitive, `entries[${index}].isSensitive`),
    createdAt:
      record.createdAt === undefined
        ? undefined
        : expectString(record.createdAt, `entries[${index}].createdAt`),
  };
}

function validateHistoryRestorePayload(payload: unknown): {
  entries: RestoreEntry[];
} {
  const record = expectRecord(payload);
  return {
    entries: expectArray(record.entries, "entries", validateRestoreEntry),
  };
}

function validateHistoryExportPayload(payload: unknown): {
  format: "csv" | "json";
} {
  const record = expectRecord(payload);
  return {
    format: expectStringUnion(record.format, "format", ["csv", "json"]),
  };
}

export function registerHistoryIpc(
  safeHandle: SafeHandle,
  deps: Pick<IpcDependencies, "historyRepo">,
): void {
  safeHandle(
    "history:list",
    async (_, payload) => {
      const { page, search } = payload;
      return deps.historyRepo.list(page, search);
    },
    validateHistoryListPayload,
  );

  safeHandle(
    "history:pin",
    async (_, payload) => {
      const { id, pinned } = payload;
      deps.historyRepo.pin(id, pinned);
      return true;
    },
    validateHistoryPinPayload,
  );

  safeHandle(
    "history:delete",
    async (_, payload) => {
      const { id } = payload;
      deps.historyRepo.delete(id);
      return true;
    },
    validateHistoryDeletePayload,
  );

  safeHandle(
    "history:update",
    async (_, payload) => {
      const { id, cleanedText, aiMode } = payload;
      deps.historyRepo.updateCleanedText(id, cleanedText, aiMode ?? null);
      return true;
    },
    validateHistoryUpdatePayload,
  );

  safeHandle(
    "history:delete-many",
    async (_, payload) => {
      const { ids } = payload;
      deps.historyRepo.deleteMany(ids);
      return true;
    },
    validateHistoryDeleteManyPayload,
  );

  safeHandle("history:clear", async () => {
    deps.historyRepo.clearAll();
    return true;
  });

  safeHandle(
    "history:restore",
    async (_, payload) => {
      const { entries } = payload;
      deps.historyRepo.restoreMany(entries);
      return true;
    },
    validateHistoryRestorePayload,
  );

  safeHandle(
    "history:export",
    async (_, payload) => {
      const { format } = payload;
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
    },
    validateHistoryExportPayload,
  );
}
