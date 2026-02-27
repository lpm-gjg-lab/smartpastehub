import { describe, expect, it, vi } from "vitest";
import { registerHistoryIpc } from "../../src/main/ipc/history.ipc";

type Handler = (event: unknown, payload?: unknown) => Promise<unknown>;

describe("history IPC", () => {
  it("handles delete-many and clear channels", async () => {
    const handlers = new Map<string, Handler>();
    const safeHandle = (channel: string, handler: Handler) => {
      handlers.set(channel, handler);
    };

    const historyRepo = {
      list: vi.fn(() => []),
      pin: vi.fn(),
      delete: vi.fn(),
      updateCleanedText: vi.fn(),
      deleteMany: vi.fn(),
      clearAll: vi.fn(),
      restoreMany: vi.fn(),
      getRecent: vi.fn(() => []),
    };

    registerHistoryIpc(safeHandle as never, { historyRepo } as never);

    await handlers.get("history:delete-many")?.({}, { ids: [1, 2, 3] });
    await handlers.get("history:update")?.(
      {},
      { id: 7, cleanedText: "rewritten", aiMode: "rephrase" },
    );
    await handlers.get("history:clear")?.({}, undefined);

    expect(historyRepo.deleteMany).toHaveBeenCalledWith([1, 2, 3]);
    expect(historyRepo.updateCleanedText).toHaveBeenCalledWith(
      7,
      "rewritten",
      "rephrase",
    );
    expect(historyRepo.clearAll).toHaveBeenCalledTimes(1);
  });
});
