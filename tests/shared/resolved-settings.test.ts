import { describe, it, expect } from "vitest";
import { resolvedSettings } from "../../src/shared/resolved-settings";
import type { AppSettings } from "../../src/shared/types";

// Minimal valid AppSettings for testing
function makeSettings(overrides: Partial<AppSettings> = {}): AppSettings {
    return {
        general: { language: "en", theme: "system", startupEnabled: false },
        hotkeys: {
            pasteClean: "CommandOrControl+Shift+V",
            ghostWrite: "CommandOrControl+Shift+G",
            historyOpen: "CommandOrControl+Shift+H",
            ocrCapture: "CommandOrControl+Shift+O",
            screenshotCapture: "CommandOrControl+Shift+S",
            presetSwitch: "CommandOrControl+Shift+P",
            multiCopy: "CommandOrControl+Shift+M",
            undoLastPaste: "CommandOrControl+Shift+Z",
            translateClipboard: "CommandOrControl+Shift+T",
            commandPalette: "CommandOrControl+Shift+K",
        },
        security: {
            detectSensitive: true,
            autoClear: false,
            clearTimerSeconds: 30,
            unknownContextAction: "warn",
        },
        ai: {
            enabled: false,
            provider: "openai",
            apiKey: "",
            aiMode: "auto",
        },
        ocr: { languages: ["eng"], autoClean: false },
        presets: { custom: [], active: "default" },
        sync: { enabled: false },
        ...overrides,
    };
}

describe("resolvedSettings", () => {
    it("should fill automation defaults when automation is undefined", () => {
        const s = resolvedSettings(makeSettings());
        expect(s.automation.enableSmartUrlTransform).toBe(true);
        expect(s.automation.enableAutoLearning).toBe(true);
        expect(s.automation.enableUndo).toBe(true);
        expect(s.automation.trustModeDefault).toBe("balanced");
        expect(s.automation.previewHoldMs).toBe(250);
    });

    it("should preserve user-set automation values over defaults", () => {
        const s = resolvedSettings(
            makeSettings({
                automation: { enableSmartUrlTransform: false, enableUndo: false },
            }),
        );
        expect(s.automation.enableSmartUrlTransform).toBe(false);
        expect(s.automation.enableUndo).toBe(false);
        // Other defaults should still be filled
        expect(s.automation.enableAutoLearning).toBe(true);
    });

    it("should fill privacy defaults when privacy is undefined", () => {
        const s = resolvedSettings(makeSettings());
        expect(s.privacy.neverPersistSensitive).toBe(true);
        expect(s.privacy.enablePrivacyFirewall).toBe(true);
        expect(s.privacy.sensitiveTtlSeconds).toBe(90);
    });

    it("should preserve user-set privacy values over defaults", () => {
        const s = resolvedSettings(
            makeSettings({ privacy: { neverPersistSensitive: false, sensitiveTtlSeconds: 30 } }),
        );
        expect(s.privacy.neverPersistSensitive).toBe(false);
        expect(s.privacy.sensitiveTtlSeconds).toBe(30);
    });

    it("should default telemetry to OFF (observabilityEnabled: false)", () => {
        const s = resolvedSettings(makeSettings());
        expect(s.diagnostics.observabilityEnabled).toBe(false);
    });

    it("should allow telemetry to be enabled when explicitly set", () => {
        const s = resolvedSettings(
            makeSettings({ diagnostics: { observabilityEnabled: true, maxEvents: 100 } }),
        );
        expect(s.diagnostics.observabilityEnabled).toBe(true);
    });

    it("should return empty arrays for autoLearnedRules and recipes when not set", () => {
        const s = resolvedSettings(makeSettings());
        expect(s.autoLearnedRules).toEqual([]);
        expect(s.recipes).toEqual([]);
    });

    it("should preserve autoLearnedRules and recipes when already set", () => {
        const rules = [{ pattern: "foo", replacement: "bar" }];
        const s = resolvedSettings(makeSettings({ autoLearnedRules: rules as never }));
        expect(s.autoLearnedRules).toEqual(rules);
    });

    it("should not mutate the original settings object", () => {
        const original = makeSettings();
        resolvedSettings(original);
        expect(original.automation).toBeUndefined();
        expect(original.privacy).toBeUndefined();
        expect(original.diagnostics).toBeUndefined();
    });
});
