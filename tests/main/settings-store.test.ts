/**
 * Unit tests for settings-store public API.
 *
 * Uses vi.hoisted + vi.mock to stub out Electron and fs/promises before
 * the module-under-test is resolved. This mirrors the existing pattern
 * in tests/main/settings-ipc-maturity.test.ts.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

// â”€â”€ Hoisted mocks â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const mocks = vi.hoisted(() => ({
    getPath: vi.fn((_name: string) => "/tmp/smartpaste-test"),
    isEncryptionAvailable: vi.fn(() => false),
    encryptString: vi.fn((s: string) => Buffer.from(s, "utf8")),
    decryptString: vi.fn((b: Buffer) => b.toString("utf8")),
    readFile: vi.fn(),
    writeFile: vi.fn().mockResolvedValue(undefined),
    rename: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("electron", () => ({
    app: { getPath: mocks.getPath },
    safeStorage: {
        isEncryptionAvailable: mocks.isEncryptionAvailable,
        encryptString: mocks.encryptString,
        decryptString: mocks.decryptString,
    },
}));

vi.mock("fs/promises", () => ({
    default: {
        readFile: mocks.readFile,
        writeFile: mocks.writeFile,
        rename: mocks.rename,
    },
}));

// â”€â”€ Imports (after mocks) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
import type { AppSettings } from "../../src/shared/types";

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
async function freshStore() {
    vi.resetModules();
    return import("../../src/main/settings-store");
}

// â”€â”€ Tests â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
describe("settings-store", () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default: no config file on disk (ENOENT)
        mocks.readFile.mockRejectedValue(
            Object.assign(new Error("ENOENT"), { code: "ENOENT" }),
        );
    });

    describe("getSettings()", () => {
        it("returns default settings when no config file exists", async () => {
            const { getSettings } = await freshStore();
            const s = await getSettings();
            expect(s.general).toBeDefined();
            expect(s.ai).toBeDefined();
            expect(s.security).toBeDefined();
            expect(s.hotkeys).toBeDefined();
        });

        it("defaults observabilityEnabled to false (telemetry opt-in)", async () => {
            const { getSettings } = await freshStore();
            const s = await getSettings();
            expect(s.diagnostics?.observabilityEnabled ?? false).toBe(false);
        });

        it("returns cached result on subsequent calls", async () => {
            const { getSettings } = await freshStore();
            await getSettings();
            await getSettings();
            // readFile called once â€” second call hits cache
            expect(mocks.readFile).toHaveBeenCalledTimes(1);
        });

        it("parses and merges settings from disk", async () => {
            const diskSettings: Partial<AppSettings> = {
                general: { language: "id", theme: "dark", startOnBoot: true },
            };
            mocks.readFile.mockResolvedValue(JSON.stringify(diskSettings));

            const { getSettings } = await freshStore();
            const s = await getSettings();

            expect(s.general.language).toBe("id");
            expect(s.general.theme).toBe("dark");
            // Keys not on disk still have defaults
            expect(s.ai).toBeDefined();
        });
    });

    describe("updateSettings()", () => {
        it("merges a partial update without clobbering unrelated keys", async () => {
            const { getSettings, updateSettings } = await freshStore();
            const original = await getSettings();

            const updated = await updateSettings({
                general: { language: "id", theme: "system", startOnBoot: false },
            });

            expect(updated.general.language).toBe("id");
            // AI settings must be unchanged
            expect(updated.ai).toEqual(original.ai);
        });

        it("hotkey partial update preserves other hotkeys", async () => {
            const { getSettings, updateSettings } = await freshStore();
            const original = await getSettings();

            const updated = await updateSettings({
                hotkeys: {
                    ...original.hotkeys,
                    pasteClean: "CommandOrControl+Alt+V",
                },
            });

            expect(updated.hotkeys.pasteClean).toBe("CommandOrControl+Alt+V");
            expect(updated.hotkeys.ghostWrite).toBe(original.hotkeys.ghostWrite);
        });

        it("schedules a disk write on each update", async () => {
            const { getSettings, updateSettings } = await freshStore();
            await getSettings();      // first read (ENOENT â†’ write defaults â†’ 1 write)
            mocks.writeFile.mockClear();
            mocks.rename.mockClear();

            await updateSettings({
                general: { language: "en", theme: "system", startOnBoot: false },
            });

            expect(mocks.writeFile).toHaveBeenCalledTimes(1);
            expect(mocks.rename).toHaveBeenCalledTimes(1);
        });
    });

    describe("API key handling", () => {
        it("encrypts API key when safeStorage is available (adds enc: prefix)", async () => {
            // Mock encryption as available and working
            mocks.isEncryptionAvailable.mockReturnValue(true);
            mocks.encryptString.mockImplementation((s: string) => Buffer.from(s, "utf8"));

            const { getSettings, updateSettings } = await freshStore();
            const base = await getSettings();
            mocks.writeFile.mockClear();

            await updateSettings({ ai: { ...base.ai, apiKey: "my-secret-key" } });

            const savedText = mocks.writeFile.mock.calls[0]?.[1] as string;
            const saved = JSON.parse(savedText) as AppSettings;
            // Encrypted keys should be wrapped with enc: prefix
            expect(saved.ai.apiKey).toMatch(/^enc:/);
        });

        it("stores empty apiKey as empty string (no encryption attempted)", async () => {
            mocks.isEncryptionAvailable.mockReturnValue(true);

            const { getSettings, updateSettings } = await freshStore();
            const base = await getSettings();
            mocks.writeFile.mockClear();

            await updateSettings({ ai: { ...base.ai, apiKey: "" } });

            const savedText = mocks.writeFile.mock.calls[0]?.[1] as string;
            const saved = JSON.parse(savedText) as AppSettings;
            // Empty key should remain empty â€” nothing to encrypt
            expect(saved.ai.apiKey).toBe("");
        });
    });
});

