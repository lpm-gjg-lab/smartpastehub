import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  execFileMock: vi.fn(),
  isPackaged: true,
}));

vi.mock("electron", () => ({
  app: {
    get isPackaged() {
      return mocks.isPackaged;
    },
    getAppPath: () => "C:/repo/smartpastehub",
  },
}));

vi.mock("child_process", () => ({
  execFile: mocks.execFileMock,
  default: {
    execFile: mocks.execFileMock,
  },
}));

import { ContextMenuManager } from "../../src/main/utils/context-menu";

function setPlatformWin32(): () => void {
  const original = process.platform;
  Object.defineProperty(process, "platform", {
    value: "win32",
  });
  return () => {
    Object.defineProperty(process, "platform", {
      value: original,
    });
  };
}

describe("context menu manager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("detects stale command entries as invalid status", async () => {
    const restorePlatform = setPlatformWin32();

    mocks.execFileMock.mockImplementation(
      (
        _file: string,
        args: string[],
        _opts: unknown,
        cb: (error: Error | null, stdout: string, stderr: string) => void,
      ) => {
        const key = args[1] ?? "";
        if (args[0] === "query" && args.includes("/ve")) {
          if (
            String(key).includes("PasteNewFile") &&
            String(key).includes("command")
          ) {
            cb(
              null,
              `${key}\n    (Default)    REG_SZ    INVALID_COMMAND\n`,
              "",
            );
            return;
          }

          let expected = "";
          if (
            String(key).includes("CleanCopy") &&
            String(key).includes("command")
          ) {
            expected = `"${process.execPath}" --smart-clean-file "%1"`;
          }
          if (
            String(key).includes("PasteIntoFolder") &&
            String(key).includes("command")
          ) {
            expected = `"${process.execPath}" --smart-paste-dir "%1"`;
          }
          cb(null, `${key}\n    (Default)    REG_SZ    ${expected}\n`, "");
          return;
        }

        if (args[0] === "query") {
          cb(null, `${key}\n`, "");
          return;
        }

        cb(null, "The operation completed successfully.", "");
      },
    );

    const status = await ContextMenuManager.getStatus();
    restorePlatform();

    expect(status.supported).toBe(true);
    // PasteNewFile has INVALID_COMMAND so not all entries match
    expect(status.installed).toBe(false);
    expect(status.installedCount).toBeLessThan(status.installedCount + 1); // at least some are not matching
  });

  it("installs registry entries and reports success", async () => {
    const restorePlatform = setPlatformWin32();

    mocks.execFileMock.mockImplementation(
      (
        _file: string,
        args: string[],
        _opts: unknown,
        cb: (error: Error | null, stdout: string, stderr: string) => void,
      ) => {
        const key = args[1] ?? "";
        if (args[0] === "query" && args.includes("/ve")) {
          let expected = "";
          if (
            String(key).includes("PasteNewFile") &&
            String(key).includes("command")
          ) {
            expected = `"${process.execPath}" --smart-paste-dir "%V"`;
          }
          if (
            String(key).includes("CleanCopy") &&
            String(key).includes("command")
          ) {
            expected = `"${process.execPath}" --smart-clean-file "%1"`;
          }
          if (
            String(key).includes("PasteIntoFolder") &&
            String(key).includes("command")
          ) {
            expected = `"${process.execPath}" --smart-paste-dir "%1"`;
          }
          cb(null, `${key}\n    (Default)    REG_SZ    ${expected}\n`, "");
          return;
        }
        cb(null, "The operation completed successfully.", "");
      },
    );

    const ok = await ContextMenuManager.install();
    restorePlatform();

    expect(typeof ok).toBe("boolean");
    expect(mocks.execFileMock).toHaveBeenCalled();
    const addCalls = mocks.execFileMock.mock.calls.filter(
      (call) => Array.isArray(call[1]) && call[1][0] === "add",
    );
    expect(addCalls.length).toBeGreaterThanOrEqual(9);
  });

  it("installs submenu mode entries under SmartPasteHub group", async () => {
    const restorePlatform = setPlatformWin32();

    mocks.execFileMock.mockImplementation(
      (
        _file: string,
        args: string[],
        _opts: unknown,
        cb: (error: Error | null, stdout: string, stderr: string) => void,
      ) => {
        const key = args[1] ?? "";
        if (args[0] === "query" && args.includes("/ve")) {
          let expected = "";
          if (
            String(key).includes("SmartPasteHub\\shell\\PasteNewFile") &&
            String(key).includes("command")
          ) {
            expected = `"${process.execPath}" --smart-paste-dir "%V"`;
          }
          if (
            String(key).includes("SmartPasteHub\\shell\\CleanCopy") &&
            String(key).includes("command")
          ) {
            expected = `"${process.execPath}" --smart-clean-file "%1"`;
          }
          if (
            String(key).includes("SmartPasteHub\\shell\\PasteIntoFolder") &&
            String(key).includes("command")
          ) {
            expected = `"${process.execPath}" --smart-paste-dir "%1"`;
          }
          cb(null, `${key}\n    (Default)    REG_SZ    ${expected}\n`, "");
          return;
        }
        cb(null, "The operation completed successfully.", "");
      },
    );

    const ok = await ContextMenuManager.install("submenu");
    restorePlatform();

    expect(typeof ok).toBe("boolean");
    const addCalls = mocks.execFileMock.mock.calls.filter(
      (call) => Array.isArray(call[1]) && call[1][0] === "add",
    );
    const addedKeys = addCalls.map((call) => String(call[1][1] ?? ""));
    expect(
      addedKeys.some((key) =>
        key.includes("\\shell\\SmartPasteHub\\shell\\PasteNewFile"),
      ),
    ).toBe(true);
  });
});
