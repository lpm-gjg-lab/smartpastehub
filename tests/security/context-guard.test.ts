import { describe, expect, it } from "vitest";
import { ActiveAppSignal } from "../../src/security/active-app-detector";
import { evaluateContextGuard } from "../../src/security/context-guard";

function signal(
  appType: ActiveAppSignal["appType"],
  appName: string,
): ActiveAppSignal {
  return {
    appName,
    appType,
    confidence: 0.8,
    platform: process.platform,
    detected: true,
  };
}

describe("context-guard", () => {
  it("allows when no sensitive data is detected", () => {
    const decision = evaluateContextGuard({
      hasSensitiveData: false,
      activeApp: signal("chat", "Slack"),
      autoClearEnabled: false,
      defaultAutoClearSeconds: 25,
    });

    expect(decision.action).toBe("allow");
    expect(decision.reason).toContain("No sensitive data");
    expect(decision.autoClearAfterSeconds).toBeUndefined();
    expect(decision.fallbackApplied).toBe(false);
  });

  it("includes auto clear for non-sensitive path when enabled and clamps invalid seconds", () => {
    const normal = evaluateContextGuard({
      hasSensitiveData: false,
      activeApp: signal("editor", "VSCode"),
      autoClearEnabled: true,
      defaultAutoClearSeconds: 12,
    });
    const zero = evaluateContextGuard({
      hasSensitiveData: false,
      activeApp: signal("editor", "VSCode"),
      autoClearEnabled: true,
      defaultAutoClearSeconds: 0,
    });
    const negative = evaluateContextGuard({
      hasSensitiveData: false,
      activeApp: signal("editor", "VSCode"),
      autoClearEnabled: true,
      defaultAutoClearSeconds: -10,
    });
    const notNumber = evaluateContextGuard({
      hasSensitiveData: false,
      activeApp: signal("editor", "VSCode"),
      autoClearEnabled: true,
      defaultAutoClearSeconds: Number.NaN,
    });

    expect(normal.autoClearAfterSeconds).toBe(12);
    expect(zero.autoClearAfterSeconds).toBe(30);
    expect(negative.autoClearAfterSeconds).toBe(30);
    expect(notNumber.autoClearAfterSeconds).toBe(30);
  });

  it("blocks sensitive data in chat applications", () => {
    const decision = evaluateContextGuard({
      hasSensitiveData: true,
      activeApp: signal("chat", "Telegram"),
      autoClearEnabled: true,
      defaultAutoClearSeconds: 45,
    });

    expect(decision.action).toBe("block");
    expect(decision.autoClearAfterSeconds).toBeUndefined();
    expect(decision.fallbackApplied).toBe(false);
  });

  it("warns for browser context and enforces auto-clear <= 30 seconds", () => {
    const decisionLong = evaluateContextGuard({
      hasSensitiveData: true,
      activeApp: signal("browser", "Chrome"),
      autoClearEnabled: false,
      defaultAutoClearSeconds: 60,
    });
    const decisionShort = evaluateContextGuard({
      hasSensitiveData: true,
      activeApp: signal("browser", "Chrome"),
      autoClearEnabled: true,
      defaultAutoClearSeconds: 10,
    });

    expect(decisionLong.action).toBe("warn");
    expect(decisionLong.autoClearAfterSeconds).toBe(30);
    expect(decisionShort.autoClearAfterSeconds).toBe(10);
    expect(decisionLong.fallbackApplied).toBe(false);
  });

  it("warns for editor context and follows autoClearEnabled setting", () => {
    const enabled = evaluateContextGuard({
      hasSensitiveData: true,
      activeApp: signal("editor", "Cursor"),
      autoClearEnabled: true,
      defaultAutoClearSeconds: 17,
    });
    const disabled = evaluateContextGuard({
      hasSensitiveData: true,
      activeApp: signal("editor", "Cursor"),
      autoClearEnabled: false,
      defaultAutoClearSeconds: 17,
    });

    expect(enabled.action).toBe("warn");
    expect(enabled.autoClearAfterSeconds).toBe(17);
    expect(disabled.action).toBe("warn");
    expect(disabled.autoClearAfterSeconds).toBeUndefined();
  });

  it("uses unknownContextAction for unknown app type with proper fallback behavior", () => {
    const warn = evaluateContextGuard({
      hasSensitiveData: true,
      activeApp: signal("unknown", "MysteryApp"),
      autoClearEnabled: true,
      defaultAutoClearSeconds: 9,
    });
    const allow = evaluateContextGuard({
      hasSensitiveData: true,
      activeApp: signal("unknown", "MysteryApp"),
      autoClearEnabled: true,
      defaultAutoClearSeconds: 9,
      unknownContextAction: "allow",
    });
    const block = evaluateContextGuard({
      hasSensitiveData: true,
      activeApp: signal("unknown", "MysteryApp"),
      autoClearEnabled: true,
      defaultAutoClearSeconds: 9,
      unknownContextAction: "block",
    });

    expect(warn.action).toBe("warn");
    expect(warn.autoClearAfterSeconds).toBe(30);
    expect(warn.fallbackApplied).toBe(true);

    expect(allow.action).toBe("allow");
    expect(allow.autoClearAfterSeconds).toBeUndefined();
    expect(allow.fallbackApplied).toBe(true);

    expect(block.action).toBe("block");
    expect(block.autoClearAfterSeconds).toBe(30);
    expect(block.fallbackApplied).toBe(true);
  });
});
