import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  setLoginItemSettings: vi.fn(),
  getSettingsMock: vi.fn(),
  updateSettingsMock: vi.fn(),
  contextMenuInstallMock: vi.fn(),
  contextMenuUninstallMock: vi.fn(),
}));

vi.mock("electron", () => ({
  app: {
    setLoginItemSettings: mocks.setLoginItemSettings,
  },
}));

vi.mock("../../src/main/settings-store", () => ({
  getSettings: mocks.getSettingsMock,
  updateSettings: mocks.updateSettingsMock,
}));

vi.mock("../../src/main/tray-manager", () => ({
  updateTrayAutoCleanState: vi.fn(),
}));

vi.mock("../../src/main/utils/context-menu", () => ({
  ContextMenuManager: {
    install: mocks.contextMenuInstallMock,
    uninstall: mocks.contextMenuUninstallMock,
    getStatus: vi.fn(async () => ({
      supported: true,
      installed: true,
      backgroundEntry: true,
      fileEntry: true,
      folderEntry: true,
      mode: "top_level",
    })),
  },
}));

vi.mock("../../src/main/settings-portability", () => ({
  exportPortableSettings: vi.fn(),
  importPortableSettings: vi.fn(),
}));

vi.mock("../../src/main/observability", () => ({
  listObservabilityEvents: vi.fn(() => []),
}));

vi.mock("../../src/main/timeline-cluster", () => ({
  getTimelineClusters: vi.fn(() => []),
}));

import { registerSettingsIpc } from "../../src/main/ipc/settings.ipc";

type Handler = (event: unknown, payload: unknown) => Promise<unknown> | unknown;

function createRegistry() {
  const handlers = new Map<string, Handler>();
  const safeHandle = (channel: string, handler: Handler) => {
    handlers.set(channel, handler);
  };
  return { handlers, safeHandle };
}

describe("settings IPC maturity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.contextMenuInstallMock.mockResolvedValue(true);
    mocks.contextMenuUninstallMock.mockResolvedValue(true);
    const base = {
      general: {
        autoCleanOnCopy: true,
        startOnBoot: true,
        enableContextMenu: true,
      },
      hotkeys: { pasteClean: "Alt+Shift+V" },
      presets: { active: "keepStructure", custom: [{ id: "customA" }] },
      automation: {
        trustModeDefault: "balanced",
        appTrustModes: [],
        enableUniversalFallback: true,
        enablePastePreview: true,
        previewHoldMs: 250,
        enableCommandPalette: true,
        enableIntentFieldDetection: true,
        enableSmartUrlTransform: true,
        enableLocaleAwareness: true,
        enableHealthGuard: true,
        enableAutoLearning: true,
        enableRecipes: true,
        enableUndo: true,
        sessionClusterMinutes: 20,
        paletteFavorites: [],
      },
    };
    mocks.getSettingsMock.mockResolvedValue(base);
    mocks.updateSettingsMock.mockImplementation(
      async (partial: Record<string, unknown>) => ({
        ...base,
        ...partial,
        presets: { ...base.presets, ...(partial["presets"] as object) },
        automation: {
          ...base.automation,
          ...(partial["automation"] as object),
        },
      }),
    );
  });

  it("stores per-app MRU favorite when setting active preset", async () => {
    const { handlers, safeHandle } = createRegistry();
    registerSettingsIpc(safeHandle as never, {
      reloadHotkeys: async () => undefined,
      confirmPreview: async () => true,
      cancelPreview: () => undefined,
      getFallbackMethods: () => [],
      submitPasteFeedback: async () => ({
        appliedNow: false,
        expectedIntent: "plain_text",
      }),
    });

    const result = await handlers.get("automation:set-active-preset")?.(
      {},
      {
        presetId: "codePassthrough",
        appName: "slack.exe",
      },
    );

    expect(result).toBe("codePassthrough");
    expect(mocks.updateSettingsMock).toHaveBeenCalled();
    const payload = mocks.updateSettingsMock.mock.calls[0]?.[0] as {
      automation?: {
        paletteFavorites?: Array<{ appName: string; presets: string[] }>;
      };
    };
    expect(payload.automation?.paletteFavorites?.[0]?.appName).toBe(
      "slack.exe",
    );
    expect(payload.automation?.paletteFavorites?.[0]?.presets?.[0]).toBe(
      "codePassthrough",
    );
  });

  it("rejects unknown preset id", async () => {
    const { handlers, safeHandle } = createRegistry();
    registerSettingsIpc(safeHandle as never, {
      reloadHotkeys: async () => undefined,
      confirmPreview: async () => true,
      cancelPreview: () => undefined,
      getFallbackMethods: () => [],
      submitPasteFeedback: async () => ({
        appliedNow: false,
        expectedIntent: "plain_text",
      }),
    });

    await expect(
      handlers.get("automation:set-active-preset")?.(
        {},
        { presetId: "does-not-exist" },
      ),
    ).rejects.toThrow("Unknown preset");
  });

  it("reinstalls context menu when mode changes and integration enabled", async () => {
    const { handlers, safeHandle } = createRegistry();
    registerSettingsIpc(safeHandle as never, {
      reloadHotkeys: async () => undefined,
      confirmPreview: async () => true,
      cancelPreview: () => undefined,
      getFallbackMethods: () => [],
      submitPasteFeedback: async () => ({
        appliedNow: false,
        expectedIntent: "plain_text",
      }),
    });

    await handlers.get("settings:update")?.(
      {},
      {
        general: {
          enableContextMenu: true,
          contextMenuMode: "submenu",
        },
      },
    );

    expect(mocks.contextMenuInstallMock).toHaveBeenCalledWith("submenu");
  });
});
