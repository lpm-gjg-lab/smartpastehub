import { registerBuiltinPluginRuntime } from "../plugin-runtime";
import { zeroWidthCleanerPlugin } from "./zero-width-cleaner.plugin";

let initialized = false;

export function registerBuiltinPlugins(): void {
  if (initialized) {
    return;
  }
  registerBuiltinPluginRuntime(zeroWidthCleanerPlugin);
  initialized = true;
}

export function resetBuiltinPluginsForTests(): void {
  initialized = false;
}
