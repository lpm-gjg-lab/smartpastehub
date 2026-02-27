import { beforeEach, describe, expect, it, vi } from "vitest";
import { registerClipperIpc } from "../../src/main/ipc/clipper.ipc";
import { registerQrIpc } from "../../src/main/ipc/qr.ipc";
import { registerRingIpc } from "../../src/main/ipc/ring.ipc";
import { registerDragDropIpc } from "../../src/main/ipc/dragdrop.ipc";
import { registerChartIpc } from "../../src/main/ipc/chart.ipc";

vi.mock("electron", () => ({
  clipboard: {
    writeText: vi.fn(),
  },
}));

type Handler = (event: unknown, payload: unknown) => Promise<unknown> | unknown;

function createSafeHandleRegistry() {
  const handlers = new Map<string, Handler>();
  const safeHandle = (channel: string, handler: Handler) => {
    handlers.set(channel, handler);
  };
  return { handlers, safeHandle };
}

describe("Feature IPC handlers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("clipper handlers extract and convert content", async () => {
    const { handlers, safeHandle } = createSafeHandleRegistry();
    registerClipperIpc(safeHandle);

    const clip = await handlers.get("clipper:clip-url")?.(
      {},
      {
        html: "<html><head><title>Doc</title></head><body><h1>Hi</h1><p>there</p></body></html>",
        url: "https://example.com",
      },
    );
    const markdown = await handlers.get("clipper:to-markdown")?.(
      {},
      "<h1>Hi</h1><p>there</p>",
    );

    expect(clip).toMatchObject({
      title: "Doc",
      textContent: expect.stringContaining("Hi"),
      length: expect.any(Number),
    });
    expect(markdown).toContain("Hi");
  });

  it("qr handler generates one or more data URLs", async () => {
    const { handlers, safeHandle } = createSafeHandleRegistry();
    registerQrIpc(safeHandle);

    const result = (await handlers.get("qr:generate")?.(
      {},
      {
        text: "hello world",
        options: { errorCorrection: "M", size: 256 },
      },
    )) as { dataUrls: string[]; chunks: number };

    expect(result.chunks).toBeGreaterThan(0);
    expect(result.dataUrls[0]).toContain("data:image");
  });

  it("ring handlers map history rows and support pin/delete/select", async () => {
    const { handlers, safeHandle } = createSafeHandleRegistry();
    const historyRepo = {
      getRecent: vi.fn().mockReturnValue([
        {
          id: 1,
          cleaned_text: "hello",
          content_type: "plain_text",
          created_at: new Date().toISOString(),
        },
      ]),
      list: vi.fn().mockReturnValue([
        {
          id: 2,
          cleaned_text: "matched",
          content_type: "plain_text",
          created_at: new Date().toISOString(),
        },
      ]),
      findById: vi.fn().mockReturnValue({ id: 1, cleaned_text: "hello" }),
      delete: vi.fn(),
      pin: vi.fn(),
    };

    registerRingIpc(safeHandle, {
      historyRepo: historyRepo as never,
    });

    const items = (await handlers.get("ring:get-items")?.(
      {},
      undefined,
    )) as Array<{
      id: number;
    }>;
    expect(items[0]?.id).toBe(1);

    await handlers.get("ring:search")?.({}, "mat");
    expect(historyRepo.list).toHaveBeenCalled();

    await handlers.get("ring:select")?.({}, 1);
    expect(historyRepo.findById).toHaveBeenCalledWith(1);

    await handlers.get("ring:pin")?.({}, 1);
    expect(historyRepo.pin).toHaveBeenCalledWith(1, true);

    await handlers.get("ring:delete")?.({}, 1);
    expect(historyRepo.delete).toHaveBeenCalledWith(1);
  });

  it("dragdrop handlers maintain transient collection", async () => {
    const { handlers, safeHandle } = createSafeHandleRegistry();
    registerDragDropIpc(safeHandle);

    await handlers.get("dragdrop:add-item")?.(
      {},
      {
        content: "one",
        contentType: "plain_text",
      },
    );
    await handlers.get("dragdrop:add-item")?.(
      {},
      {
        content: "two",
        contentType: "plain_text",
      },
    );

    const items = (await handlers.get("dragdrop:get-items")?.(
      {},
      undefined,
    )) as Array<{ id: number }>;
    expect(items.length).toBeGreaterThanOrEqual(2);

    const combine = (await handlers.get("dragdrop:combine")?.(
      {},
      {
        separator: "\n",
      },
    )) as string;
    expect(combine).toContain("one");
    expect(combine).toContain("two");

    await handlers.get("dragdrop:clear")?.({}, undefined);
    const cleared = (await handlers.get("dragdrop:get-items")?.(
      {},
      undefined,
    )) as unknown[];
    expect(cleared).toEqual([]);
  });

  it("chart handler summarizes numeric input", async () => {
    const { handlers, safeHandle } = createSafeHandleRegistry();
    registerChartIpc(safeHandle);

    const result = (await handlers.get("chart:generate")?.(
      {},
      {
        text: "10, 20, 30",
      },
    )) as {
      chartType: string;
      title: string;
      description: string;
    };

    expect(result.chartType).toBe("bar");
    expect(result.title).toContain("3 data points");
    expect(result.description).toContain("Avg");
  });
});
