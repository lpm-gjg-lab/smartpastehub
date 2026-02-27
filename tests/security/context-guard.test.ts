import { describe, expect, it } from "vitest";
import { evaluateContextGuard } from "../../src/security/context-guard";
import { ActiveAppSignal } from "../../src/security/active-app-detector";

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

describe("Context guard policy", () => {
  it("blocks sensitive data in chat apps", () => {
    const decision = evaluateContextGuard({
      hasSensitiveData: true,
      activeApp: signal("chat", "Telegram"),
      autoClearEnabled: true,
      defaultAutoClearSeconds: 45,
    });

    expect(decision.action).toBe("block");
    expect(decision.autoClearAfterSeconds).toBeUndefined();
  });

  it("warns and forces short auto-clear in browser", () => {
    const decision = evaluateContextGuard({
      hasSensitiveData: true,
      activeApp: signal("browser", "Chrome"),
      autoClearEnabled: true,
      defaultAutoClearSeconds: 60,
    });

    expect(decision.action).toBe("warn");
    expect(decision.autoClearAfterSeconds).toBe(30);
    expect(decision.fallbackApplied).toBe(false);
  });

  it("warns but allows in editor context", () => {
    const decision = evaluateContextGuard({
      hasSensitiveData: true,
      activeApp: signal("editor", "VSCode"),
      autoClearEnabled: false,
      defaultAutoClearSeconds: 30,
    });

    expect(decision.action).toBe("warn");
    expect(decision.autoClearAfterSeconds).toBeUndefined();
  });

  it("applies conservative fallback for unknown context", () => {
    const decision = evaluateContextGuard({
      hasSensitiveData: true,
      activeApp: signal("unknown", "UnknownApp"),
      autoClearEnabled: false,
      defaultAutoClearSeconds: 15,
    });

    expect(decision.action).toBe("warn");
    expect(decision.fallbackApplied).toBe(true);
    expect(decision.autoClearAfterSeconds).toBe(30);
  });

  it("supports user override for unknown context action", () => {
    const decision = evaluateContextGuard({
      hasSensitiveData: true,
      activeApp: signal("unknown", "UnknownApp"),
      autoClearEnabled: true,
      defaultAutoClearSeconds: 40,
      unknownContextAction: "block",
    });

    expect(decision.action).toBe("block");
    expect(decision.fallbackApplied).toBe(true);
  });

  it("allows non-sensitive data and respects configured auto-clear", () => {
    const decision = evaluateContextGuard({
      hasSensitiveData: false,
      activeApp: signal("chat", "Slack"),
      autoClearEnabled: true,
      defaultAutoClearSeconds: 12,
    });

    expect(decision.action).toBe("allow");
    expect(decision.autoClearAfterSeconds).toBe(12);
  });
});
