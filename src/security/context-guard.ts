import { ActiveAppSignal } from "./active-app-detector";

export type SecurityAction = "allow" | "warn" | "block";

export interface ContextGuardInput {
  hasSensitiveData: boolean;
  activeApp: ActiveAppSignal;
  autoClearEnabled: boolean;
  defaultAutoClearSeconds: number;
  unknownContextAction?: SecurityAction;
}

export interface ContextGuardDecision {
  action: SecurityAction;
  reason: string;
  autoClearAfterSeconds?: number;
  fallbackApplied: boolean;
}

function clampPositive(seconds: number): number {
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return 30;
  }
  return Math.max(1, Math.floor(seconds));
}

export function evaluateContextGuard(
  input: ContextGuardInput,
): ContextGuardDecision {
  const fallbackSeconds = clampPositive(input.defaultAutoClearSeconds || 30);

  if (!input.hasSensitiveData) {
    return {
      action: "allow",
      reason: "No sensitive data detected",
      autoClearAfterSeconds: input.autoClearEnabled
        ? fallbackSeconds
        : undefined,
      fallbackApplied: false,
    };
  }

  if (input.activeApp.appType === "chat") {
    return {
      action: "block",
      reason: "Sensitive data blocked for chat applications",
      fallbackApplied: false,
    };
  }

  if (input.activeApp.appType === "browser") {
    return {
      action: "warn",
      reason: "Sensitive data allowed in browser with forced auto-clear",
      autoClearAfterSeconds: Math.min(30, fallbackSeconds),
      fallbackApplied: false,
    };
  }

  if (input.activeApp.appType === "editor") {
    return {
      action: "warn",
      reason: "Sensitive data allowed in editor with reminder",
      autoClearAfterSeconds: input.autoClearEnabled
        ? fallbackSeconds
        : undefined,
      fallbackApplied: false,
    };
  }

  return {
    action: input.unknownContextAction ?? "warn",
    reason: "Unknown app context; applying conservative fallback",
    autoClearAfterSeconds:
      (input.unknownContextAction ?? "warn") === "allow" ? undefined : 30,
    fallbackApplied: true,
  };
}
