import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  simulatePaste: vi.fn(),
  simulateShiftInsert: vi.fn(),
  simulateTypeText: vi.fn(),
}));

vi.mock("../../src/main/paste-simulator", () => ({
  simulatePaste: mocks.simulatePaste,
  simulateShiftInsert: mocks.simulateShiftInsert,
  simulateTypeText: mocks.simulateTypeText,
}));

import { performPasteWithFallback } from "../../src/main/paste-fallback-engine";

describe("paste fallback engine", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("uses ctrl+v in basic mode", () => {
    const result = performPasteWithFallback("notepad.exe", "hello", "basic");

    expect(mocks.simulatePaste).toHaveBeenCalledTimes(1);
    expect(mocks.simulateShiftInsert).not.toHaveBeenCalled();
    expect(result.method).toBe("ctrl_v");
    expect(result.succeeded).toBe(true);
  });

  it("returns success metadata in full mode", () => {
    const result = performPasteWithFallback("rdpclip.exe", "hello", "full");

    expect(mocks.simulatePaste).toHaveBeenCalledTimes(1);
    expect(result.tried).toContain("ctrl_v");
    expect(result.method).toBe("ctrl_v");
    expect(result.succeeded).toBe(true);
  });
});
