import { app } from "electron";
import { getSettings, updateSettings } from "../settings-store";
import { SafeHandle } from "./contracts";
import { updateTrayAutoCleanState } from "../tray-manager";
import { ContextMenuManager } from "../utils/context-menu";
import {
  exportPortableSettings,
  importPortableSettings,
} from "../settings-portability";
import { listObservabilityEvents } from "../observability";
import { pushObservabilityEvent } from "../observability";
import { getTimelineClusters } from "../timeline-cluster";
import { applyExplicitPasteFeedback } from "../../core/paste-intelligence";
import { ContentType } from "../../shared/types";
import { ContextMenuMode } from "../utils/context-menu";
import { logger } from "../../shared/logger";
import { telemetry } from "../telemetry";
import {
  ContextRuleRow,
  ContextRulesRepository,
} from "../repositories/context-rules.repo";
import {
  expectArray,
  expectBoolean,
  expectNumber,
  expectOptionalString,
  expectRecord,
  expectString,
  expectStringUnion,
} from "./validation";

interface ContextRuleDTO {
  id: number;
  name: string;
  sourceApp: string | null;
  targetApp: string | null;
  contentType: string | null;
  preset: string;
  transforms: string[];
  priority: number;
  enabled: boolean;
  createdAt: string;
}

function mapContextRuleRow(row: ContextRuleRow): ContextRuleDTO {
  let transforms: string[] = [];
  try {
    const parsed = JSON.parse(row.transforms);
    if (Array.isArray(parsed)) {
      transforms = parsed
        .map((item) => String(item ?? "").trim())
        .filter((item) => item.length > 0);
    }
  } catch {
    transforms = [];
  }

  return {
    id: row.id,
    name: row.name,
    sourceApp: row.source_app,
    targetApp: row.target_app,
    contentType: row.content_type,
    preset: row.preset,
    transforms,
    priority: row.priority,
    enabled: row.enabled === 1,
    createdAt: row.created_at,
  };
}

interface ContextRuleInputPayload {
  name: string;
  sourceApp: string | null;
  targetApp: string | null;
  contentType: string | null;
  preset: string;
  transforms: string[];
  priority: number;
  enabled: boolean;
}

interface ContextRuleUpdateInputPayload extends ContextRuleInputPayload {
  id: number;
}

interface ContextRuleDeletePayload {
  id: number;
}

interface AppProfilePayload {
  appName: string;
  cleanMode: "plain" | "code" | "email" | "doc" | "default";
  autoTranslate?: boolean;
  targetLang?: "id" | "en";
}

interface TrustModePayload {
  appName: string;
  mode: "strict" | "balanced" | "passthrough";
}

interface PortableExportPayload {
  passphrase: string;
}

interface PortableImportPayload {
  passphrase: string;
  data: string;
}

interface DiagnosticsObservabilityPayload {
  limit?: number;
}

interface RendererErrorPayload {
  message: string;
  stack?: string;
  source?: string;
  line?: number;
  column?: number;
  kind?: "error" | "unhandledrejection";
}

interface AutomationSetActivePresetPayload {
  presetId: string;
  appName?: string;
}

interface AutomationPasteFeedbackPayload {
  appName: string;
  contentType: ContentType;
  fieldIntent?: string;
  expectedIntent: "plain_text" | "rich_text";
  weight?: number;
}

interface AutomationFeedbackActionPayload {
  expectedIntent: "plain_text" | "rich_text";
  applyNow?: boolean;
  weight?: number;
}

interface ContextMenuRepairPayload {
  mode?: "install" | "uninstall";
  menuMode?: ContextMenuMode;
}

function sanitizeTransforms(value: unknown, name: string): string[] {
  if (value === undefined || value === null) {
    return [];
  }
  return expectArray(value, name, (item, index) =>
    expectString(item, `${name}[${index}]`).trim(),
  ).filter((item) => item.length > 0);
}

function validateContextRuleCreatePayload(
  payload: unknown,
): ContextRuleInputPayload {
  const record = expectRecord(payload);
  return {
    name: expectString(record.name, "name").trim(),
    sourceApp: expectOptionalString(record.sourceApp, "sourceApp"),
    targetApp: expectOptionalString(record.targetApp, "targetApp"),
    contentType: expectOptionalString(record.contentType, "contentType"),
    preset: expectString(record.preset, "preset").trim(),
    transforms: sanitizeTransforms(record.transforms, "transforms"),
    priority:
      record.priority === undefined
        ? 0
        : expectNumber(record.priority, "priority", { integer: true }),
    enabled:
      record.enabled === undefined
        ? true
        : expectBoolean(record.enabled, "enabled"),
  };
}

function validateContextRuleUpdatePayload(
  payload: unknown,
): ContextRuleUpdateInputPayload {
  const record = expectRecord(payload);
  return {
    id: expectNumber(record.id, "id", { integer: true, min: 1 }),
    ...validateContextRuleCreatePayload(payload),
  };
}

function validateContextRuleDeletePayload(
  payload: unknown,
): ContextRuleDeletePayload {
  const record = expectRecord(payload);
  return {
    id: expectNumber(record.id, "id", { integer: true, min: 1 }),
  };
}

function validateSettingsUpdatePayload(
  payload: unknown,
): Record<string, unknown> {
  return expectRecord(payload);
}

function validateContextMenuRepairPayload(
  payload: unknown,
): ContextMenuRepairPayload {
  const record = expectRecord(payload);
  const mode =
    record.mode === undefined
      ? undefined
      : expectStringUnion(record.mode, "mode", ["install", "uninstall"]);

  const menuMode =
    record.menuMode === undefined
      ? undefined
      : expectStringUnion(record.menuMode, "menuMode", [
        "top_level",
        "submenu",
      ] as const);

  return { mode, menuMode };
}

function validateAppProfilePayload(payload: unknown): AppProfilePayload {
  const record = expectRecord(payload);
  return {
    appName: expectString(record.appName, "appName").trim(),
    cleanMode: expectStringUnion(record.cleanMode, "cleanMode", [
      "plain",
      "code",
      "email",
      "doc",
      "default",
    ] as const),
    autoTranslate:
      record.autoTranslate === undefined
        ? undefined
        : expectBoolean(record.autoTranslate, "autoTranslate"),
    targetLang:
      record.targetLang === undefined
        ? undefined
        : expectStringUnion(record.targetLang, "targetLang", [
          "id",
          "en",
        ] as const),
  };
}

function validateTrustModePayload(payload: unknown): TrustModePayload {
  const record = expectRecord(payload);
  return {
    appName: expectString(record.appName, "appName").trim(),
    mode: expectStringUnion(record.mode, "mode", [
      "strict",
      "balanced",
      "passthrough",
    ] as const),
  };
}

function validatePortableExportPayload(
  payload: unknown,
): PortableExportPayload {
  const record = expectRecord(payload);
  return {
    passphrase: expectString(record.passphrase, "passphrase"),
  };
}

function validatePortableImportPayload(
  payload: unknown,
): PortableImportPayload {
  const record = expectRecord(payload);
  return {
    passphrase: expectString(record.passphrase, "passphrase"),
    data: expectString(record.data, "data"),
  };
}

function validateDiagnosticsObservabilityPayload(
  payload: unknown,
): DiagnosticsObservabilityPayload {
  const record = expectRecord(payload);
  return {
    limit:
      record.limit === undefined
        ? undefined
        : expectNumber(record.limit, "limit", { integer: true, min: 1 }),
  };
}

function validateRendererErrorPayload(payload: unknown): RendererErrorPayload {
  const record = expectRecord(payload);
  return {
    message: expectString(record.message, "message").slice(0, 2000),
    stack:
      record.stack === undefined
        ? undefined
        : expectString(record.stack, "stack", { allowEmpty: true }).slice(
          0,
          4000,
        ),
    source:
      record.source === undefined
        ? undefined
        : expectString(record.source, "source", { allowEmpty: true }).slice(
          0,
          500,
        ),
    line:
      record.line === undefined
        ? undefined
        : expectNumber(record.line, "line", { integer: true, min: 0 }),
    column:
      record.column === undefined
        ? undefined
        : expectNumber(record.column, "column", { integer: true, min: 0 }),
    kind:
      record.kind === undefined
        ? undefined
        : expectStringUnion(record.kind, "kind", [
          "error",
          "unhandledrejection",
        ] as const),
  };
}

function validateAutomationSetActivePresetPayload(
  payload: unknown,
): AutomationSetActivePresetPayload {
  const record = expectRecord(payload);
  return {
    presetId: expectString(record.presetId, "presetId"),
    appName:
      record.appName === undefined
        ? undefined
        : expectString(record.appName, "appName", { allowEmpty: true }),
  };
}

function validateAutomationPasteFeedbackPayload(
  payload: unknown,
): AutomationPasteFeedbackPayload {
  const record = expectRecord(payload);
  return {
    appName: expectString(record.appName, "appName").trim(),
    contentType: expectString(record.contentType, "contentType") as ContentType,
    fieldIntent:
      record.fieldIntent === undefined
        ? undefined
        : expectString(record.fieldIntent, "fieldIntent", { allowEmpty: true }),
    expectedIntent: expectStringUnion(record.expectedIntent, "expectedIntent", [
      "plain_text",
      "rich_text",
    ] as const),
    weight:
      record.weight === undefined
        ? undefined
        : expectNumber(record.weight, "weight"),
  };
}

function validateAutomationFeedbackActionPayload(
  payload: unknown,
): AutomationFeedbackActionPayload {
  const record = expectRecord(payload);
  return {
    expectedIntent: expectStringUnion(record.expectedIntent, "expectedIntent", [
      "plain_text",
      "rich_text",
    ] as const),
    applyNow:
      record.applyNow === undefined
        ? undefined
        : expectBoolean(record.applyNow, "applyNow"),
    weight:
      record.weight === undefined
        ? undefined
        : expectNumber(record.weight, "weight"),
  };
}

interface SettingsIpcDeps {
  reloadHotkeys: () => Promise<void>;
  contextRulesRepo: ContextRulesRepository;
  getFallbackMethods: () => Array<{ app: string; method: string }>;
  submitPasteFeedback: (payload: {
    expectedIntent: "plain_text" | "rich_text";
    applyNow?: boolean;
    weight?: number;
  }) => Promise<{
    appliedNow: boolean;
    expectedIntent: "plain_text" | "rich_text";
    appName?: string;
    contentType?: string;
  }>;
}

export function registerSettingsIpc(
  safeHandle: SafeHandle,
  deps: SettingsIpcDeps,
): void {
  safeHandle("settings:get", async () => getSettings());
  safeHandle(
    "settings:update",
    async (_, partial) => {
      const result = await updateSettings(partial);
      // Keep tray badge in sync when autoCleanOnCopy changes
      const p = partial;
      if (
        p["general"] &&
        typeof (p["general"] as Record<string, unknown>)["autoCleanOnCopy"] ===
        "boolean"
      ) {
        updateTrayAutoCleanState(
          (p["general"] as Record<string, unknown>)[
          "autoCleanOnCopy"
          ] as boolean,
        );
      }

      if (
        p["general"] &&
        typeof (p["general"] as Record<string, unknown>)["startOnBoot"] ===
        "boolean" &&
        app.isPackaged
      ) {
        app.setLoginItemSettings({
          openAtLogin: (p["general"] as Record<string, unknown>)[
            "startOnBoot"
          ] as boolean,
        });
      }

      const generalPatch =
        (p["general"] as Record<string, unknown> | undefined) ?? undefined;
      const contextMenuEnabledPatched =
        typeof generalPatch?.["enableContextMenu"] === "boolean";
      const contextMenuModePatched =
        generalPatch?.["contextMenuMode"] === "top_level" ||
        generalPatch?.["contextMenuMode"] === "submenu";

      if (contextMenuEnabledPatched || contextMenuModePatched) {
        const enabled = contextMenuEnabledPatched
          ? Boolean(generalPatch?.["enableContextMenu"])
          : Boolean(result.general.enableContextMenu);
        const mode = (
          contextMenuModePatched
            ? generalPatch?.["contextMenuMode"]
            : (result.general.contextMenuMode ?? "top_level")
        ) as ContextMenuMode;

        if (enabled) {
          const ok = await ContextMenuManager.install(mode);
          if (!ok) {
            throw new Error(
              "Failed to enable Windows context menu integration",
            );
          }
        } else {
          const ok = await ContextMenuManager.uninstall();
          if (!ok) {
            throw new Error(
              "Failed to disable Windows context menu integration",
            );
          }
        }
      }

      if (p["hotkeys"]) {
        await deps.reloadHotkeys();
      }

      return result;
    },
    validateSettingsUpdatePayload,
  );

  safeHandle("settings:get-app-profiles", async () => {
    const settings = await getSettings();
    return settings.appProfiles ?? [];
  });

  safeHandle("settings:context-rules:list", async () => {
    return deps.contextRulesRepo.list().map(mapContextRuleRow);
  });

  safeHandle(
    "settings:context-rules:create",
    async (_, payload) => {
      deps.contextRulesRepo.create({
        name: payload.name,
        sourceApp: payload.sourceApp,
        targetApp: payload.targetApp,
        contentType: payload.contentType,
        preset: payload.preset,
        transforms: payload.transforms,
        priority: payload.priority,
        enabled: payload.enabled,
      });

      return deps.contextRulesRepo.list().map(mapContextRuleRow);
    },
    validateContextRuleCreatePayload,
  );

  safeHandle(
    "settings:context-rules:update",
    async (_, payload) => {
      deps.contextRulesRepo.update({
        id: payload.id,
        name: payload.name,
        sourceApp: payload.sourceApp,
        targetApp: payload.targetApp,
        contentType: payload.contentType,
        preset: payload.preset,
        transforms: payload.transforms,
        priority: payload.priority,
        enabled: payload.enabled,
      });

      return deps.contextRulesRepo.list().map(mapContextRuleRow);
    },
    validateContextRuleUpdatePayload,
  );

  safeHandle(
    "settings:context-rules:delete",
    async (_, payload) => {
      deps.contextRulesRepo.delete(payload.id);
      return deps.contextRulesRepo.list().map(mapContextRuleRow);
    },
    validateContextRuleDeletePayload,
  );

  safeHandle("settings:context-menu-status", async () => {
    const settings = await getSettings();
    const mode = (settings.general.contextMenuMode ??
      "top_level") as ContextMenuMode;
    return ContextMenuManager.getStatus(mode);
  });

  safeHandle(
    "settings:context-menu-repair",
    async (_, payload) => {
      const mode = payload.mode;
      const menuMode = payload.menuMode;
      const settings = await getSettings();
      const effectiveMode =
        menuMode ??
        ((settings.general.contextMenuMode ?? "top_level") as ContextMenuMode);

      if (mode === "uninstall") {
        const ok = await ContextMenuManager.uninstall();
        if (!ok) {
          throw new Error("Context menu uninstall repair failed");
        }
        return ContextMenuManager.getStatus(effectiveMode);
      }

      const ok = await ContextMenuManager.install(effectiveMode);
      if (!ok) {
        throw new Error("Context menu install repair failed");
      }
      return ContextMenuManager.getStatus(effectiveMode);
    },
    validateContextMenuRepairPayload,
  );

  safeHandle(
    "settings:set-app-profile",
    async (_, payload) => {
      const { appName, cleanMode, autoTranslate, targetLang } = payload;
      const settings = await getSettings();
      const profiles = [...(settings.appProfiles ?? [])];
      const idx = profiles.findIndex(
        (p) => p.appName.toLowerCase() === appName.toLowerCase(),
      );
      const entry = { appName, cleanMode, autoTranslate, targetLang };
      if (idx >= 0) {
        profiles[idx] = entry;
      } else {
        profiles.push(entry);
      }
      await updateSettings({ appProfiles: profiles } as Record<
        string,
        unknown
      >);
      return profiles;
    },
    validateAppProfilePayload,
  );

  safeHandle(
    "settings:set-trust-mode",
    async (_, payload) => {
      const { appName, mode } = payload;
      const settings = await getSettings();
      const existing = [...(settings.automation?.appTrustModes ?? [])];
      const idx = existing.findIndex(
        (entry) => entry.appName.toLowerCase() === appName.toLowerCase(),
      );
      const next = { appName, mode };
      if (idx >= 0) {
        existing[idx] = next;
      } else {
        existing.push(next);
      }
      await updateSettings({
        automation: {
          ...(settings.automation ?? {
            trustModeDefault: "balanced",
            appTrustModes: [],
            enableUniversalFallback: true,
            enablePastePreview: true,
            previewHoldMs: 250,
            enableCommandPalette: true,
            enableIntentFieldDetection: true,
            enableSmartUrlTransform: true,
            enableLocaleAwareness: true,
            enableHealthGuard: true,
            enableAutoLearning: true,
            enableRecipes: true,
            enableUndo: true,
            sessionClusterMinutes: 20,
          }),
          appTrustModes: existing,
        },
      });
      return existing;
    },
    validateTrustModePayload,
  );

  safeHandle(
    "settings:export-portable",
    async (_, payload) => {
      const passphrase = payload.passphrase;
      if (!passphrase) {
        throw new Error("Passphrase is required");
      }
      const settings = await getSettings();
      return exportPortableSettings(settings, passphrase);
    },
    validatePortableExportPayload,
  );

  safeHandle(
    "settings:import-portable",
    async (_, payload) => {
      const passphrase = payload.passphrase;
      const data = payload.data;
      if (!passphrase || !data) {
        throw new Error("Portable import requires passphrase and data");
      }
      const imported = importPortableSettings(data, passphrase);
      const updated = await updateSettings(imported);
      await deps.reloadHotkeys();
      return updated;
    },
    validatePortableImportPayload,
  );

  safeHandle(
    "diagnostics:observability",
    async (_, payload) => {
      const limit = payload.limit ?? 200;
      return listObservabilityEvents(limit);
    },
    validateDiagnosticsObservabilityPayload,
  );

  safeHandle("timeline:clusters", async () => {
    const settings = await getSettings();
    return getTimelineClusters(
      settings.automation?.sessionClusterMinutes ?? 20,
    );
  });

  safeHandle("diagnostics:fallback-methods", async () => {
    return deps.getFallbackMethods();
  });

  safeHandle(
    "diagnostics:renderer-error",
    async (_, payload) => {
      logger.error("Renderer error reported", {
        message: payload.message,
        source: payload.source,
        line: payload.line,
        column: payload.column,
        kind: payload.kind,
      });
      telemetry.track("app_error", {
        scope: "renderer",
        message: payload.message,
        source: payload.source,
        line: payload.line,
        column: payload.column,
        kind: payload.kind,
      });
      pushObservabilityEvent({
        ts: new Date().toISOString(),
        kind: "policy",
        detail: "Renderer error captured",
        metadata: {
          message: payload.message,
          source: payload.source,
          line: payload.line,
          column: payload.column,
          kind: payload.kind,
        },
      });
      return true;
    },
    validateRendererErrorPayload,
  );

  safeHandle(
    "automation:set-active-preset",
    async (_, payload) => {
      const presetId = payload.presetId;
      const appName = String(payload.appName ?? "")
        .trim()
        .toLowerCase();
      if (!presetId) {
        throw new Error("presetId is required");
      }
      const settings = await getSettings();
      const allowed = new Set([
        "keepStructure",
        "codePassthrough",
        "emailClean",
        ...settings.presets.custom.map((preset) => preset.id),
      ]);
      if (!allowed.has(presetId)) {
        throw new Error(`Unknown preset: ${presetId}`);
      }

      const existingFavorites = [
        ...(settings.automation?.paletteFavorites ?? []),
      ];
      if (appName) {
        const idx = existingFavorites.findIndex(
          (entry) => entry.appName.toLowerCase() === appName,
        );
        if (idx >= 0) {
          const current = existingFavorites[idx]!;
          const nextPresets = [
            presetId,
            ...current.presets.filter((value) => value !== presetId),
          ].slice(0, 8);
          existingFavorites[idx] = {
            appName: current.appName,
            presets: nextPresets,
          };
        } else {
          existingFavorites.push({ appName, presets: [presetId] });
        }
      }

      const updated = await updateSettings({
        presets: {
          ...settings.presets,
          active: presetId,
        },
        automation: {
          ...(settings.automation ?? {
            trustModeDefault: "balanced",
            appTrustModes: [],
            enableUniversalFallback: true,
            enablePastePreview: true,
            previewHoldMs: 250,
            enableCommandPalette: true,
            enableIntentFieldDetection: true,
            enableSmartUrlTransform: true,
            enableLocaleAwareness: true,
            enableHealthGuard: true,
            enableAutoLearning: true,
            enableRecipes: true,
            enableUndo: true,
            sessionClusterMinutes: 20,
            paletteFavorites: [],
          }),
          paletteFavorites: existingFavorites,
        },
      });
      return updated.presets.active;
    },
    validateAutomationSetActivePresetPayload,
  );

  safeHandle(
    "automation:paste-feedback",
    async (_, payload) => {
      const appName = payload.appName;
      const contentType = payload.contentType;
      const fieldIntent = payload.fieldIntent ?? "";
      const expectedIntent = payload.expectedIntent;
      const weight = payload.weight ?? 2;

      if (!appName) {
        throw new Error("appName is required");
      }
      if (!contentType) {
        throw new Error("contentType is required");
      }
      if (expectedIntent !== "plain_text" && expectedIntent !== "rich_text") {
        throw new Error("expectedIntent must be plain_text or rich_text");
      }

      const settings = await getSettings();
      const nextRules = applyExplicitPasteFeedback(settings.autoLearnedRules, {
        appName,
        contentType,
        fieldIntent,
        expectedIntent,
        weight: Number.isFinite(weight) ? weight : 2,
      });

      const updated = await updateSettings({ autoLearnedRules: nextRules });
      return {
        appName,
        contentType,
        expectedIntent,
        rulesCount: updated.autoLearnedRules?.length ?? 0,
      };
    },
    validateAutomationPasteFeedbackPayload,
  );

  safeHandle(
    "automation:feedback-action",
    async (_, payload) => {
      return deps.submitPasteFeedback({
        expectedIntent: payload.expectedIntent,
        applyNow: Boolean(payload.applyNow),
        weight: Number(payload.weight ?? 2),
      });
    },
    validateAutomationFeedbackActionPayload,
  );

  // ── Detect running apps (for Settings dropdowns) ─────────────────────────
  safeHandle("system:running-apps", async () => {
    const { execFile } = await import("child_process");
    const { promisify } = await import("util");
    const execFileAsync = promisify(execFile);
    try {
      // Get processes that have a visible window title
      const { stdout } = await execFileAsync(
        "powershell",
        [
          "-NoProfile",
          "-Command",
          "Get-Process | Where-Object {$_.MainWindowTitle -ne ''} | Select-Object @{N='name';E={$_.MainWindowTitle}}, @{N='processName';E={$_.ProcessName}} | Sort-Object processName -Unique | ConvertTo-Json",
        ],
        { windowsHide: true, timeout: 8000 },
      );
      const parsed = JSON.parse(stdout.trim());
      // Normalize: can be array or single object
      const items = Array.isArray(parsed) ? parsed : [parsed];
      return items
        .filter(
          (p: { name?: string; processName?: string }) =>
            p.processName && p.processName.trim(),
        )
        .map((p: { name?: string; processName?: string }) => ({
          name: (p.name ?? p.processName ?? "").trim(),
          processName: (p.processName ?? "").trim().toLowerCase(),
        }));
    } catch {
      return [];
    }
  });
}
