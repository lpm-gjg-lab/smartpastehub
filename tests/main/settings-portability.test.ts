import { describe, expect, it } from "vitest";
import {
  exportPortableSettings,
  importPortableSettings,
} from "../../src/main/settings-portability";
import { DEFAULT_SETTINGS } from "../../src/shared/constants";
import type { AppSettings } from "../../src/shared/types";

describe("settings portability", () => {
  it("exports and imports encrypted settings payload", () => {
    const base = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as AppSettings;
    base.general.autoCleanOnCopy = false;
    base.automation = {
      ...(base.automation ?? {
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
      }),
      trustModeDefault: "strict",
    };

    const payload = exportPortableSettings(base, "pass-123");
    const restored = importPortableSettings(payload, "pass-123");

    expect(restored.general.autoCleanOnCopy).toBe(false);
    expect(restored.automation?.trustModeDefault).toBe("strict");
  });

  it("throws with wrong passphrase", () => {
    const base = JSON.parse(JSON.stringify(DEFAULT_SETTINGS)) as AppSettings;
    const payload = exportPortableSettings(base, "good-pass");

    expect(() => importPortableSettings(payload, "bad-pass")).toThrow();
  });
});
