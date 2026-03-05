import { existsSync } from "node:fs";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { _electron as electron, type ElectronApplication } from "playwright";

declare global {
  interface Window {
    smartpaste: {
      invoke: (channel: string, payload?: unknown) => Promise<unknown>;
      on: (
        channel: string,
        listener: (event: unknown, payload: unknown) => void,
      ) => () => void;
    };
  }
}

const ELECTRON_ENTRY = path.resolve(process.cwd(), "dist/main/main/index.js");
const TOOL_ROUTES = [
  "/web-clipper",
  "/auto-chart",
  "/qr-bridge",
  "/drag-drop-zone",
  "/paste-history-ring",
  "/template-form",
  "/ocr",
] as const;

test.describe("Smart Paste Hub Electron runtime", () => {
  let electronApp: ElectronApplication;
  let page: Page;

  test.beforeAll(async () => {
    if (!existsSync(ELECTRON_ENTRY)) {
      test.skip(true, `Electron build not found at ${ELECTRON_ENTRY}`);
    }

    try {
      electronApp = await electron.launch({
        args: [ELECTRON_ENTRY],
      });
      page = await electronApp.firstWindow();
      await page.waitForLoadState("domcontentloaded");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      test.skip(true, `Electron runtime unavailable: ${message}`);
    }
  });

  test.afterAll(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test("app window loads with correct title", async () => {
    await expect(page).toHaveTitle(/Smart Paste Hub/i);
  });

  test("preload bridge exposes smartpaste API", async () => {
    const bridge = await page.evaluate(() => ({
      hasInvoke: typeof window.smartpaste?.invoke === "function",
      hasOn: typeof window.smartpaste?.on === "function",
    }));

    expect(bridge.hasInvoke).toBe(true);
    expect(bridge.hasOn).toBe(true);
  });

  test("allowed IPC channel succeeds", async () => {
    const result = await page.evaluate(
      () => window.smartpaste.invoke("settings:get") as Promise<unknown>,
    );
    expect(result).toBeDefined();
    expect(result).toMatchObject({
      ok: true,
      data: {
        general: expect.any(Object),
      },
    });
  });

  test("blocked IPC channel throws", async () => {
    const error = await page.evaluate(() => {
      try {
        void window.smartpaste.invoke("evil:channel");
        return "";
      } catch (e) {
        return e instanceof Error ? e.message : String(e);
      }
    });

    expect(error).toContain("Blocked IPC invoke channel");
  });

  test("settings round-trip works", async () => {
    const settingsShape = await page.evaluate(async () => {
      const settingsResponse = (await window.smartpaste.invoke(
        "settings:get",
      )) as {
        ok?: boolean;
        data?: {
          general?: { autoCleanOnCopy?: boolean };
          ai?: unknown;
          hotkeys?: unknown;
          security?: unknown;
        };
      };

      const settings = settingsResponse.data;
      if (!settingsResponse.ok || !settings) {
        return { hasStructure: false, toggled: false, restored: false };
      }

      const typedSettings = settings as {
        general?: { autoCleanOnCopy?: boolean };
        ai?: unknown;
        hotkeys?: unknown;
        security?: unknown;
      };

      const hasStructure = Boolean(
        typedSettings.general &&
        typedSettings.ai &&
        typedSettings.hotkeys &&
        typedSettings.security,
      );

      if (typeof typedSettings.general?.autoCleanOnCopy !== "boolean") {
        return { hasStructure, toggled: false, restored: false };
      }

      const originalValue = typedSettings.general.autoCleanOnCopy;
      const updatedEnvelope = (await window.smartpaste.invoke(
        "settings:update",
        {
          general: { autoCleanOnCopy: !originalValue },
        },
      )) as {
        ok?: boolean;
        data?: { general?: { autoCleanOnCopy?: boolean } };
      };

      const restoredEnvelope = (await window.smartpaste.invoke(
        "settings:update",
        {
          general: { autoCleanOnCopy: originalValue },
        },
      )) as {
        ok?: boolean;
        data?: { general?: { autoCleanOnCopy?: boolean } };
      };

      return {
        hasStructure,
        toggled:
          updatedEnvelope.ok === true &&
          updatedEnvelope.data?.general?.autoCleanOnCopy === !originalValue,
        restored:
          restoredEnvelope.ok === true &&
          restoredEnvelope.data?.general?.autoCleanOnCopy === originalValue,
      };
    });

    expect(settingsShape.hasStructure).toBe(true);
    expect(settingsShape.toggled).toBe(true);
    expect(settingsShape.restored).toBe(true);
  });

  test("system clipboard round-trip works via IPC", async () => {
    const marker = `os-e2e-${Date.now()}`;

    const writeEnvelope = (await page.evaluate(
      (payload) => window.smartpaste.invoke("clipboard:write", payload),
      { text: marker },
    )) as {
      ok?: boolean;
      data?: boolean;
    };

    expect(writeEnvelope.ok).toBe(true);
    expect(writeEnvelope.data).toBe(true);

    const clipboardValue = await electronApp.evaluate(({ clipboard }) =>
      clipboard.readText(),
    );
    expect(clipboardValue).toBe(marker);
  });

  test("can open and close floating tool windows", async () => {
    for (const route of TOOL_ROUTES) {
      const openEnvelope = (await page.evaluate(
        (payload) => window.smartpaste.invoke("window:open", payload),
        {
          route,
          width: 480,
          height: 620,
        },
      )) as {
        ok?: boolean;
        data?: boolean;
      };

      expect(openEnvelope.ok).toBe(true);
      expect(openEnvelope.data).toBe(true);

      await new Promise((r) => setTimeout(r, 1000));

      const windows = electronApp.windows();
      const targetWindow = windows.find((w) => w.url().includes(route));

      if (targetWindow && !targetWindow.isClosed()) {
        await targetWindow.evaluate(() => window.close());
        await expect.poll(() => targetWindow.isClosed()).toBe(true);
      }
      // Add short delay to prevent event loop queue pileup
      await new Promise((r) => setTimeout(r, 800));
    }
  });

  test("dragdrop IPC supports add reorder combine clear", async () => {
    const clearEnvelope = (await page.evaluate(() =>
      window.smartpaste.invoke("dragdrop:clear"),
    )) as {
      ok?: boolean;
      data?: boolean;
    };
    expect(clearEnvelope.ok).toBe(true);
    expect(clearEnvelope.data).toBe(true);

    const addFirst = (await page.evaluate(() =>
      window.smartpaste.invoke("dragdrop:add-item", {
        content: "alpha",
        contentType: "plain_text",
      }),
    )) as {
      ok?: boolean;
      data?: boolean;
    };
    expect(addFirst.ok).toBe(true);
    expect(addFirst.data).toBe(true);

    const addSecond = (await page.evaluate(() =>
      window.smartpaste.invoke("dragdrop:add-item", {
        content: "beta",
        contentType: "plain_text",
      }),
    )) as {
      ok?: boolean;
      data?: boolean;
    };
    expect(addSecond.ok).toBe(true);
    expect(addSecond.data).toBe(true);

    const initialItems = (await page.evaluate(() =>
      window.smartpaste.invoke("dragdrop:get-items"),
    )) as {
      ok?: boolean;
      data?: Array<{ id: number; content: string }>;
    };
    expect(initialItems.ok).toBe(true);
    expect(initialItems.data?.length).toBeGreaterThanOrEqual(2);

    const ids = (initialItems.data ?? []).map((item) => item.id);
    expect(ids.length).toBeGreaterThanOrEqual(2);

    const reversedIds = [...ids].reverse();
    const reorderEnvelope = (await page.evaluate(
      (orderedIds) => window.smartpaste.invoke("dragdrop:reorder", orderedIds),
      reversedIds,
    )) as {
      ok?: boolean;
      data?: boolean;
    };
    expect(reorderEnvelope.ok).toBe(true);
    expect(reorderEnvelope.data).toBe(true);

    const combined = (await page.evaluate(() =>
      window.smartpaste.invoke("dragdrop:combine", { separator: "|" }),
    )) as {
      ok?: boolean;
      data?: string;
    };
    expect(combined.ok).toBe(true);
    expect(combined.data).toContain("alpha");
    expect(combined.data).toContain("beta");
    expect(combined.data).toContain("|");

    const finalClear = (await page.evaluate(() =>
      window.smartpaste.invoke("dragdrop:clear"),
    )) as {
      ok?: boolean;
      data?: boolean;
    };
    expect(finalClear.ok).toBe(true);
    expect(finalClear.data).toBe(true);

    const finalItems = (await page.evaluate(() =>
      window.smartpaste.invoke("dragdrop:get-items"),
    )) as {
      ok?: boolean;
      data?: unknown[];
    };
    expect(finalItems.ok).toBe(true);
    expect(finalItems.data ?? []).toHaveLength(0);
  });

  test("ghost-write IPC reports truncation for very long text", async () => {
    const longText = "x".repeat(6000);
    const envelope = (await page.evaluate(
      (text) => window.smartpaste.invoke("clipboard:ghost-write", { text }),
      longText,
    )) as {
      ok?: boolean;
      data?: {
        ok?: boolean;
        typedChars?: number;
        truncated?: boolean;
        message?: string;
      };
    };

    expect(envelope.ok).toBe(true);
    expect(envelope.data?.typedChars).toBe(5000);
    expect(envelope.data?.truncated).toBe(true);
    expect(typeof envelope.data?.message).toBe("string");
  });

  test("floating tool window uses expected native flags", async () => {
    const route = "/web-clipper";
    const openEnvelope = (await page.evaluate(
      (payload) => window.smartpaste.invoke("window:open", payload),
      {
        route,
        width: 520,
        height: 640,
      },
    )) as {
      ok?: boolean;
      data?: boolean;
    };

    expect(openEnvelope.ok).toBe(true);
    expect(openEnvelope.data).toBe(true);

    await expect
      .poll(async () => {
        return electronApp.evaluate(({ BrowserWindow }) => {
          const win = BrowserWindow.getAllWindows().find((w) =>
            w.webContents.getURL().includes("/web-clipper"),
          );
          if (!win) return null;
          return {
            visible: win.isVisible(),
            alwaysOnTop: win.isAlwaysOnTop(),
            focusable: win.isFocusable(),
          };
        });
      })
      .toEqual({ visible: true, alwaysOnTop: true, focusable: true });

    const targetWindow = electronApp
      .windows()
      .find((w) => w.url().includes(route));
    if (targetWindow && !targetWindow.isClosed()) {
      await targetWindow.evaluate(() => window.close());
    }
  });

  test("opening multiple tool windows quickly remains stable", async () => {
    const burstRoutes = [
      "/web-clipper",
      "/qr-bridge",
      "/drag-drop-zone",
    ] as const;

    for (const route of burstRoutes) {
      const openEnvelope = (await page.evaluate(
        (payload) => window.smartpaste.invoke("window:open", payload),
        {
          route,
          width: 500,
          height: 620,
        },
      )) as { ok?: boolean; data?: boolean };
      expect(openEnvelope.ok).toBe(true);
      expect(openEnvelope.data).toBe(true);
    }

    await expect
      .poll(() => {
        const urls = electronApp.windows().map((w) => w.url());
        return burstRoutes.every((route) =>
          urls.some((url) => url.includes(route)),
        );
      })
      .toBe(true);

    for (const win of electronApp.windows()) {
      const url = win.url();
      if (burstRoutes.some((route) => url.includes(route)) && !win.isClosed()) {
        await win.evaluate(() => window.close());
      }
    }
  });
});
