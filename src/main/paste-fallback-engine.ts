import {
  simulateAccessibilityPaste,
  simulatePaste,
  simulateShiftInsert,
  simulateTypeText,
} from "./paste-simulator";

export type PasteMethod =
  | "ctrl_v"
  | "shift_insert"
  | "simulated_typing"
  | "accessibility_api";

const learnedMethodByApp = new Map<string, PasteMethod>();

function normalizeAppName(appName: string | undefined): string {
  return (
    String(appName ?? "unknown")
      .trim()
      .toLowerCase() || "unknown"
  );
}

function runMethod(method: PasteMethod, textForTyping: string): boolean {
  if (method === "ctrl_v") {
    simulatePaste();
    return true;
  }
  if (method === "shift_insert") {
    simulateShiftInsert();
    return true;
  }
  if (method === "simulated_typing") {
    return simulateTypeText(textForTyping);
  }
  if (method === "accessibility_api") {
    return simulateAccessibilityPaste(textForTyping);
  }
  return false;
}

export function performPasteWithFallback(
  targetApp: string | undefined,
  textForTyping: string,
  mode: "full" | "basic" = "full",
): { method: PasteMethod; tried: PasteMethod[]; succeeded: boolean } {
  const appKey = normalizeAppName(targetApp);
  const preferred = learnedMethodByApp.get(appKey);
  const chain: PasteMethod[] =
    mode === "basic"
      ? ["ctrl_v"]
      : preferred
        ? [
            preferred,
            "ctrl_v",
            "shift_insert",
            "simulated_typing",
            "accessibility_api",
          ]
        : ["ctrl_v", "shift_insert", "simulated_typing", "accessibility_api"];

  const tried: PasteMethod[] = [];
  for (const method of chain) {
    if (tried.includes(method)) {
      continue;
    }
    tried.push(method);
    const ok = runMethod(method, textForTyping);
    if (ok) {
      learnedMethodByApp.set(appKey, method);
      return { method, tried, succeeded: true };
    }
  }

  return {
    method: preferred ?? "ctrl_v",
    tried,
    succeeded: false,
  };
}

export function getLearnedPasteMethods(): Array<{
  app: string;
  method: PasteMethod;
}> {
  return [...learnedMethodByApp.entries()].map(([app, method]) => ({
    app,
    method,
  }));
}
