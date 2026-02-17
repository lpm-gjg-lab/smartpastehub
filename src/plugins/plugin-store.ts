export interface PluginRecord {
  name: string;
  version: string;
  description: string;
  enabled: boolean;
}

const registry: PluginRecord[] = [];

export function listPlugins(): PluginRecord[] {
  return [...registry];
}

export function addPlugin(plugin: PluginRecord): void {
  registry.push(plugin);
}
