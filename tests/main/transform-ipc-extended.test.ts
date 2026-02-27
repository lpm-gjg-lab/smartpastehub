import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { registerTransformIpc } from "../../src/main/ipc/transform.ipc";

vi.mock("electron", () => ({
  shell: {
    openExternal: vi.fn().mockResolvedValue(undefined),
  },
}));

type Handler = (event: unknown, payload: unknown) => Promise<unknown> | unknown;

describe("Extended transform IPC", () => {
  const handlers = new Map<string, Handler>();
  const safeHandle = (channel: string, handler: Handler) => {
    handlers.set(channel, handler);
  };

  afterEach(() => {
    handlers.clear();
  });

  it("handles math and color conversions", async () => {
    registerTransformIpc(safeHandle);

    const math = (await handlers.get("transform:math")?.({}, "10 + 5 * 2")) as {
      result: string;
    };
    const colorHexToRgb = (await handlers.get("transform:color")?.(
      {},
      "#FF0000",
    )) as { result: string };
    const colorRgbToHex = (await handlers.get("transform:color")?.(
      {},
      "rgb(0, 128, 255)",
    )) as { result: string };

    expect(math.result).toBe("20");
    expect(colorHexToRgb.result).toBe("rgb(255, 0, 0)");
    expect(colorRgbToHex.result).toBe("#0080FF");
  });

  it("handles markdown, links, file extraction, and secret links", async () => {
    registerTransformIpc(safeHandle);

    const markdown = (await handlers.get("transform:md-to-rtf")?.(
      {},
      "# Title\n**Bold** text",
    )) as { result: string };

    const links = (await handlers.get("transform:open-links")?.(
      {},
      "visit https://a.com and https://b.com",
    )) as { result: string };

    const tempFile = path.join(os.tmpdir(), `smartpaste-${Date.now()}.txt`);
    await fs.writeFile(tempFile, "hello from file", "utf8");
    const extracted = (await handlers.get("transform:extract-file")?.(
      {},
      tempFile,
    )) as { result: string | null };
    await fs.unlink(tempFile);

    const secret = (await handlers.get("transform:make-secret")?.(
      {},
      "super secret text",
    )) as { result: string };

    expect(markdown.result).toContain("Title");
    expect(markdown.result).toContain("Bold");
    expect(links.result).toContain("Opened 2 links");
    expect(extracted.result).toBe("hello from file");
    expect(secret.result.startsWith("https://secret.local/#")).toBe(true);
  });
});
