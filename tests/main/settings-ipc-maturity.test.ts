import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  setLoginItemSettings: vi.fn(),
  getSettingsMock: vi.fn(),
  updateSettingsMock: vi.fn(),
  contextMenuInstallMock: vi.fn(),
  contextMenuUninstallMock: vi.fn(),
  contextRulesListMock: vi.fn(() => []),
  contextRulesCreateMock: vi.fn(),
  contextRulesUpdateMock: vi.fn(),
  contextRulesDeleteMock: vi.fn(),
  loggerErrorMock: vi.fn(),
  telemetryTrackMock: vi.fn(),
  pushObservabilityEventMock: vi.fn(),
}));

vi.mock("electron", () => ({
  app: {
    setLoginItemSettings: mocks.setLoginItemSettings,
    isPackaged: true,
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
  pushObservabilityEvent: mocks.pushObservabilityEventMock,
}));

vi.mock("../../src/shared/logger", () => ({
  logger: {
    error: mocks.loggerErrorMock,
  },
}));

vi.mock("../../src/main/telemetry", () => ({
  telemetry: {
    track: mocks.telemetryTrackMock,
  },
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

function createContextRulesRepo() {
  return {
    list: mocks.contextRulesListMock,
    create: mocks.contextRulesCreateMock,
    update: mocks.contextRulesUpdateMock,
    delete: mocks.contextRulesDeleteMock,
  };
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
      contextRulesRepo: createContextRulesRepo() as never,
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
      contextRulesRepo: createContextRulesRepo() as never,
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
      contextRulesRepo: createContextRulesRepo() as never,
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

  it("stores field-aware learning when paste feedback includes fieldIntent", async () => {
    const { handlers, safeHandle } = createRegistry();
    registerSettingsIpc(safeHandle as never, {
      reloadHotkeys: async () => undefined,
      contextRulesRepo: createContextRulesRepo() as never,
      getFallbackMethods: () => [],
      submitPasteFeedback: async () => ({
        appliedNow: false,
        expectedIntent: "plain_text",
      }),
    });

    const response = (await handlers.get("automation:paste-feedback")?.(
      {},
      {
        appName: "notion.exe",
        contentType: "md_text",
        fieldIntent: "search_box",
        expectedIntent: "plain_text",
        weight: 2,
      },
    )) as { rulesCount?: number };

    const payload = mocks.updateSettingsMock.mock.calls.at(-1)?.[0] as {
      autoLearnedRules?: Array<{ fieldIntent?: string }>;
    };

    expect(response.rulesCount).toBeGreaterThan(0);
    expect(payload.autoLearnedRules?.[0]?.fieldIntent).toBe("compact");
  });

  it("captures renderer error via diagnostics channel", async () => {
    const { handlers, safeHandle } = createRegistry();
    registerSettingsIpc(safeHandle as never, {
      reloadHotkeys: async () => undefined,
      contextRulesRepo: createContextRulesRepo() as never,
      getFallbackMethods: () => [],
      submitPasteFeedback: async () => ({
        appliedNow: false,
        expectedIntent: "plain_text",
      }),
    });

    const result = await handlers.get("diagnostics:renderer-error")?.(
      {},
      {
        message: "Renderer failed",
        source: "App.tsx",
        line: 10,
        column: 3,
        kind: "error",
      },
    );

    expect(result).toBe(true);
    expect(mocks.loggerErrorMock).toHaveBeenCalledWith(
      "Renderer error reported",
      expect.objectContaining({ message: "Renderer failed" }),
    );
    expect(mocks.telemetryTrackMock).toHaveBeenCalledWith(
      "app_error",
      expect.objectContaining({
        scope: "renderer",
        message: "Renderer failed",
      }),
    );
    expect(mocks.pushObservabilityEventMock).toHaveBeenCalled();
  });
});
