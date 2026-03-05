import { afterEach, describe, expect, it } from "vitest";
import { cleanContent } from "../../src/core/cleaner";
import { SmartPastePlugin } from "../../src/plugins/plugin-api";
import {
  registerBuiltinPlugins,
  resetBuiltinPluginsForTests,
} from "../../src/plugins/builtin";
import {
  getActiveBuiltinPluginNames,
  registerBuiltinPluginRuntime,
  resetPluginRuntimeForTests,
} from "../../src/plugins/plugin-runtime";

afterEach(() => {
  resetPluginRuntimeForTests();
  resetBuiltinPluginsForTests();
});

describe("Builtin plugin runtime", () => {
  it("applies before-clean, transform, and after-clean hooks", async () => {
    const plugin: SmartPastePlugin = {
      name: "test-hooks",
      version: "1.0.0",
      description: "test plugin",
      author: "tests",
      onActivate(api) {
        api.onBeforeClean((content) => ({
          ...content,
          text: `${content.text}\u200B`,
        }));
        api.registerTransform("uppercase", (text) => text.toUpperCase());
        api.onAfterClean((content) => ({
          ...content,
          text: `${content.text}!`,
        }));
      },
      onDeactivate() {
        // no-op
      },
    };

    registerBuiltinPluginRuntime(plugin);
    const result = await cleanContent({ text: "hello   world" });

    expect(result.cleaned).toBe("HELLO WORLD!");
    expect(result.appliedTransforms).toContain("whitespace-normalizer");
    expect(result.appliedTransforms).toContain("test-hooks:uppercase");
    expect(getActiveBuiltinPluginNames()).toEqual(["test-hooks"]);
  });

  it("blocks unsupported plugin surface in MVP mode", async () => {
    const plugin: SmartPastePlugin = {
      name: "blocked-surface",
      version: "1.0.0",
      description: "blocked plugin",
      author: "tests",
      onActivate(api) {
        api.registerSettingsPanel({ any: true });
      },
      onDeactivate() {
        // no-op
      },
    };

    registerBuiltinPluginRuntime(plugin);

    expect(getActiveBuiltinPluginNames()).toEqual([]);
    const result = await cleanContent({ text: "x" });
    expect(result.cleaned).toBe("x");
  });

  it("registers builtin plugin path end-to-end", async () => {
    registerBuiltinPlugins();

    const result = await cleanContent({ text: "abc\u200B" });

    expect(getActiveBuiltinPluginNames()).toEqual(["zero-width-cleaner"]);
    expect(result.cleaned).toBe("abc");
    // With "only report if changed" pipeline runner, unicode-cleaner already
    // strips zero-width chars before the plugin transform runs, so the plugin
    // transform returns unchanged text and is not reported. Verify the plugin
    // is active and the text was cleaned correctly instead.
    expect(result.appliedTransforms).toContain("unicode-cleaner");
  });
});
