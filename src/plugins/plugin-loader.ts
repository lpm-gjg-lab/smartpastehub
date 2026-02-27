import { PluginAPI, SmartPastePlugin } from "./plugin-api";
import { logger } from "../shared/logger";

const plugins: SmartPastePlugin[] = [];

export function registerPlugin(
  plugin: SmartPastePlugin,
  api: PluginAPI,
): boolean {
  try {
    plugin.onActivate(api);
    plugins.push(plugin);
    return true;
  } catch (error) {
    logger.error("Plugin activation failed", { plugin: plugin.name, error });
    return false;
  }
}

export function unloadPlugin(pluginName: string): void {
  const index = plugins.findIndex((plugin) => plugin.name === pluginName);
  if (index >= 0) {
    const plugin = plugins[index];
    if (!plugin) return;
    try {
      plugin.onDeactivate();
    } finally {
      plugins.splice(index, 1);
    }
  }
}
