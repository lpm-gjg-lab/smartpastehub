import { ClipboardContent } from "../shared/types";
import { logger } from "../shared/logger";
import { PipelineMiddleware } from "../core/pipeline/types";
import { PluginAPI, SmartPastePlugin } from "./plugin-api";
import { addPlugin, clearPlugins, listPlugins } from "./plugin-store";
import { registerPlugin, unloadPlugin } from "./plugin-loader";

type CleanHook = (content: ClipboardContent) => ClipboardContent;

interface PluginTransform {
  id: string;
  fn: (text: string) => string;
}

const beforeCleanHooks: CleanHook[] = [];
const afterCleanHooks: CleanHook[] = [];
const transforms: PluginTransform[] = [];
const storage = new Map<string, unknown>();
const activeBuiltinPlugins = new Set<string>();

function createPluginApi(pluginName: string): PluginAPI {
  const markUnsupported = (capability: string) => {
    logger.warn(`${capability} ignored: builtin-only MVP plugin runtime`, {
      plugin: pluginName,
    });
  };

  return {
    onBeforeClean(callback) {
      beforeCleanHooks.push(callback);
    },
    onAfterClean(callback) {
      afterCleanHooks.push(callback);
    },
    registerTransform(name, fn) {
      transforms.push({ id: `${pluginName}:${name}`, fn });
    },
    registerPreset() {
      markUnsupported("registerPreset");
    },
    registerContextRule() {
      markUnsupported("registerContextRule");
    },
    registerSettingsPanel() {
      markUnsupported("registerSettingsPanel");
    },
    storage: {
      async get(key: string) {
        return storage.get(`${pluginName}:${key}`);
      },
      async set(key: string, value: unknown) {
        storage.set(`${pluginName}:${key}`, value);
      },
    },
    log: {
      info(message: string) {
        logger.info(message, { plugin: pluginName });
      },
      warn(message: string) {
        logger.warn(message, { plugin: pluginName });
      },
      error(message: string) {
        logger.error(message, { plugin: pluginName });
      },
    },
  };
}

export function registerBuiltinPluginRuntime(plugin: SmartPastePlugin): void {
  if (activeBuiltinPlugins.has(plugin.name)) {
    return;
  }

  let usedUnsupportedSurface = false;
  const pluginApi = createPluginApi(plugin.name);
  const apiProxy: PluginAPI = {
    ...pluginApi,
    registerPreset(preset) {
      usedUnsupportedSurface = true;
      pluginApi.registerPreset(preset);
    },
    registerContextRule(rule) {
      usedUnsupportedSurface = true;
      pluginApi.registerContextRule(rule);
    },
    registerSettingsPanel(component) {
      usedUnsupportedSurface = true;
      pluginApi.registerSettingsPanel(component);
    },
  };

  const ok = registerPlugin(plugin, apiProxy);
  if (!ok) {
    return;
  }

  if (usedUnsupportedSurface) {
    unloadPlugin(plugin.name);
    return;
  }

  addPlugin({
    name: plugin.name,
    version: plugin.version,
    description: plugin.description,
    enabled: true,
  });
  activeBuiltinPlugins.add(plugin.name);
}

export function applyBeforeCleanHooks(
  content: ClipboardContent,
): ClipboardContent {
  return beforeCleanHooks.reduce((current, hook) => hook(current), content);
}

export function applyAfterCleanHooks(cleanedText: string): string {
  const input: ClipboardContent = { text: cleanedText };
  const transformed = afterCleanHooks.reduce(
    (current, hook) => hook(current),
    input,
  );
  return transformed.text;
}

export function getPluginTransformMiddlewares(): PipelineMiddleware[] {
  return transforms.map((transform) => ({
    id: transform.id,
    supports: () => true,
    run: (input) => transform.fn(input),
  }));
}

export function getActiveBuiltinPluginNames(): string[] {
  return listPlugins()
    .filter((plugin) => plugin.enabled)
    .map((plugin) => plugin.name);
}

export function resetPluginRuntimeForTests(): void {
  for (const pluginName of activeBuiltinPlugins) {
    unloadPlugin(pluginName);
  }
  activeBuiltinPlugins.clear();
  beforeCleanHooks.length = 0;
  afterCleanHooks.length = 0;
  transforms.length = 0;
  storage.clear();
  clearPlugins();
}
