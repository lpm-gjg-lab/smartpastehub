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
import { getTimelineClusters } from "../timeline-cluster";
import { applyExplicitPasteFeedback } from "../../core/paste-intelligence";
import { ContentType } from "../../shared/types";
import { ContextMenuMode } from "../utils/context-menu";

interface SettingsIpcDeps {
  reloadHotkeys: () => Promise<void>;
  confirmPreview: () => Promise<boolean>;
  cancelPreview: () => void;
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
  safeHandle("settings:update", async (_, partial) => {
    const result = await updateSettings(partial as Record<string, unknown>);
    // Keep tray badge in sync when autoCleanOnCopy changes
    const p = partial as Record<string, unknown>;
    if (
      p["general"] &&
      typeof (p["general"] as Record<string, unknown>)["autoCleanOnCopy"] ===
        "boolean"
    ) {
      updateTrayAutoCleanState(
        (p["general"] as Record<string, unknown>)["autoCleanOnCopy"] as boolean,
      );
    }

    if (
      p["general"] &&
      typeof (p["general"] as Record<string, unknown>)["startOnBoot"] ===
        "boolean"
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
          throw new Error("Failed to enable Windows context menu integration");
        }
      } else {
        const ok = await ContextMenuManager.uninstall();
        if (!ok) {
          throw new Error("Failed to disable Windows context menu integration");
        }
      }
    }

    if (p["hotkeys"]) {
      await deps.reloadHotkeys();
    }

    return result;
  });

  safeHandle("settings:get-app-profiles", async () => {
    const settings = await getSettings();
    return settings.appProfiles ?? [];
  });

  safeHandle("settings:context-menu-status", async () => {
    const settings = await getSettings();
    const mode = (settings.general.contextMenuMode ??
      "top_level") as ContextMenuMode;
    return ContextMenuManager.getStatus(mode);
  });

  safeHandle("settings:context-menu-repair", async (_, payload) => {
    const parsed = payload as {
      mode?: "install" | "uninstall";
      menuMode?: ContextMenuMode;
    } | null;
    const mode = parsed?.mode;
    const menuMode = parsed?.menuMode;
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
  });

  safeHandle("settings:set-app-profile", async (_, payload) => {
    const { appName, cleanMode, autoTranslate, targetLang } = payload as {
      appName: string;
      cleanMode: "plain" | "code" | "email" | "doc" | "default";
      autoTranslate?: boolean;
      targetLang?: "id" | "en";
    };
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
    await updateSettings({ appProfiles: profiles } as Record<string, unknown>);
    return profiles;
  });

  safeHandle("settings:set-trust-mode", async (_, payload) => {
    const { appName, mode } = payload as {
      appName: string;
      mode: "strict" | "balanced" | "passthrough";
    };
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
  });

  safeHandle("settings:export-portable", async (_, payload) => {
    const passphrase = String(
      (payload as { passphrase?: string } | null)?.passphrase ?? "",
    );
    if (!passphrase) {
      throw new Error("Passphrase is required");
    }
    const settings = await getSettings();
    return exportPortableSettings(settings, passphrase);
  });

  safeHandle("settings:import-portable", async (_, payload) => {
    const parsed = payload as { passphrase?: string; data?: string } | null;
    const passphrase = String(parsed?.passphrase ?? "");
    const data = String(parsed?.data ?? "");
    if (!passphrase || !data) {
      throw new Error("Portable import requires passphrase and data");
    }
    const imported = importPortableSettings(data, passphrase);
    const updated = await updateSettings(imported);
    await deps.reloadHotkeys();
    return updated;
  });

  safeHandle("diagnostics:observability", async (_, payload) => {
    const limit = Number((payload as { limit?: number } | null)?.limit ?? 200);
    return listObservabilityEvents(limit);
  });

  safeHandle("timeline:clusters", async () => {
    const settings = await getSettings();
    return getTimelineClusters(
      settings.automation?.sessionClusterMinutes ?? 20,
    );
  });

  safeHandle("diagnostics:fallback-methods", async () => {
    return deps.getFallbackMethods();
  });

  safeHandle("automation:confirm-preview", async () => {
    return deps.confirmPreview();
  });

  safeHandle("automation:cancel-preview", async () => {
    deps.cancelPreview();
    return true;
  });

  safeHandle("automation:set-active-preset", async (_, payload) => {
    const parsed = payload as { presetId?: string; appName?: string } | null;
    const presetId = String(parsed?.presetId ?? "");
    const appName = String(parsed?.appName ?? "")
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
  });

  safeHandle("automation:paste-feedback", async (_, payload) => {
    const parsed = payload as {
      appName?: string;
      contentType?: ContentType;
      expectedIntent?: "plain_text" | "rich_text";
      weight?: number;
    } | null;

    const appName = String(parsed?.appName ?? "").trim();
    const contentType = parsed?.contentType;
    const expectedIntent = parsed?.expectedIntent;
    const weight = Number(parsed?.weight ?? 2);

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
  });

  safeHandle("automation:feedback-action", async (_, payload) => {
    const parsed = payload as {
      expectedIntent?: "plain_text" | "rich_text";
      applyNow?: boolean;
      weight?: number;
    } | null;

    const expectedIntent = parsed?.expectedIntent;
    if (expectedIntent !== "plain_text" && expectedIntent !== "rich_text") {
      throw new Error("expectedIntent must be plain_text or rich_text");
    }

    return deps.submitPasteFeedback({
      expectedIntent,
      applyNow: Boolean(parsed?.applyNow),
      weight: Number(parsed?.weight ?? 2),
    });
  });
}
