import { SmartPastePlugin } from "../plugin-api";

export const zeroWidthCleanerPlugin: SmartPastePlugin = {
  name: "zero-width-cleaner",
  version: "1.0.0",
  description: "Removes zero-width Unicode artifacts in cleaned text.",
  author: "SmartPasteHub",
  onActivate(api) {
    api.registerTransform("remove-zero-width", (text: string) =>
      text.replace(/[\u200B-\u200D\uFEFF]/g, ""),
    );
  },
  onDeactivate() {
    // No-op for builtin transform plugin.
  },
};
