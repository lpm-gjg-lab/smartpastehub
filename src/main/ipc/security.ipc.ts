import { maskData } from "../../security/data-masker";
import { detectSensitiveData } from "../../security/sensitive-detector";
import { SensitiveMatch } from "../../shared/types";
import { SafeHandle } from "./contracts";

export function registerSecurityIpc(safeHandle: SafeHandle): void {
  safeHandle("security:mask", async (_, payload) => {
    const { mode, matches, text } = payload as {
      mode: "full" | "partial" | "skip";
      matches: SensitiveMatch[];
      text: string;
    };
    return maskData(text, matches, mode);
  });

  safeHandle("security:scan", async (_, payload) => {
    const { text } = payload as { text: string };
    return detectSensitiveData(text);
  });
}
