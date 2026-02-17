import { PluginAPI, SmartPastePlugin } from './plugin-api';
import { logger } from '../shared/logger';

const plugins: SmartPastePlugin[] = [];

export function registerPlugin(plugin: SmartPastePlugin, api: PluginAPI): void {
  try {
    plugin.onActivate(api);
    plugins.push(plugin);
  } catch (error) {
    logger.error('Plugin activation failed', { plugin: plugin.name, error });
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
