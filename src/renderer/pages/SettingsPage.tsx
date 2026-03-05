import React, { useEffect, useState } from "react";
import styles from "../styles/pages/SettingsPage.module.css";
import { hasSmartPasteBridge, invokeIPC } from "../lib/ipc";
import { applyThemeToRoot, emitThemeChanged } from "../lib/theme-sync";
import { Button } from "../components/Button";
import { GeneralSettings } from "../components/settings/GeneralSettings";
import { HotkeySettings } from "../components/settings/HotkeySettings";
import { AiSettings } from "../components/settings/AiSettings";
import { SecuritySettings } from "../components/settings/SecuritySettings";
import { AutomationSettings } from "../components/settings/AutomationSettings";
import { AppearanceSettings } from "../components/settings/AppearanceSettings";
import { ContextMenuSettings } from "../components/settings/ContextMenuSettings";
import { ContextRulesSettings } from "../components/settings/ContextRulesSettings";
import { useToastStore } from "../stores/useToastStore";
import type { AppSettings } from "../../shared/types";
import {
  DEFAULT_SETTINGS,
  RECOMMENDED_PASTE_HOTKEYS,
} from "../../shared/constants";
import { useTranslation } from "react-i18next";

interface ContextMenuStatus {
  supported: boolean;
  installed: boolean;
  mode?: "top_level" | "submenu";
  installedCount: number;
}

// ── Common app list for dropdowns ────────────────────────────────────────────
const COMMON_APPS = [
  { label: "Google Chrome", value: "chrome" },
  { label: "Microsoft Edge", value: "msedge" },
  { label: "Mozilla Firefox", value: "firefox" },
  { label: "Microsoft Word", value: "winword" },
  { label: "Microsoft Excel", value: "excel" },
  { label: "Microsoft PowerPoint", value: "powerpnt" },
  { label: "Outlook", value: "outlook" },
  { label: "Notepad", value: "notepad" },
  { label: "Notepad++", value: "notepad++" },
  { label: "Visual Studio Code", value: "code" },
  { label: "Slack", value: "slack" },
  { label: "Discord", value: "discord" },
  { label: "Notion", value: "notion" },
  { label: "Telegram", value: "telegram" },
  { label: "WhatsApp", value: "whatsapp" },
  { label: "Windows Explorer", value: "explorer" },
  { label: "PowerShell", value: "powershell" },
];

// ── Preset options for dropdowns ──────────────────────────────────────────────
const PRESET_OPTIONS = [
  {
    label: "Keep Structure (Bersihkan HTML, jaga paragraf & list)",
    value: "keepStructure",
  },
  { label: "Plain Text (Bersihkan total, teks datar)", value: "plainText" },
  {
    label: "PDF Fix (Sambung baris yang terpotong dari PDF)",
    value: "pdfFix",
  },
  {
    label: "Markdown Table (Ubah tabel ke format Markdown)",
    value: "markdownTable",
  },
  {
    label: "Code / Data Passthrough (Untuk kode & JSON/YAML)",
    value: "codePassthrough",
  },
  {
    label: "Email Clean (Buang kutipan balasan email berulang)",
    value: "emailClean",
  },
];

export const SettingsPage: React.FC = () => {
  const { i18n } = useTranslation();
  const bridgeAvailable = hasSmartPasteBridge();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToastStore();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [activeTab, setActiveTab] = useState<
    | "general"
    | "hotkeys"
    | "ai"
    | "security"
    | "automation"
    | "appearance"
    | "context-rules"
    | "context-menu"
  >("general");
  const [testConnStatus, setTestConnStatus] = useState<
    "idle" | "loading" | "ok" | "error"
  >("idle");
  const [testConnMsg, setTestConnMsg] = useState("");
  // Local-only AI credential fields (saved only on explicit Save)
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiModel, setAiModel] = useState("");
  const [aiBaseUrl, setAiBaseUrl] = useState("");
  const [aiSaving, setAiSaving] = useState(false);
  const [aiUsageStats, setAiUsageStats] = useState<{
    totalRequests: number;
    totalTokens: number;
    totalPromptTokens: number;
    totalCompletionTokens: number;
    byModel: Record<string, { requests: number; tokens: number }>;
    byMode: Record<string, { requests: number; tokens: number }>;
  } | null>(null);
  const [appProfiles, setAppProfiles] = useState<
    Array<{
      appName: string;
      cleanMode: "plain" | "code" | "email" | "doc" | "default";
      autoTranslate?: boolean;
      targetLang?: "id" | "en";
    }>
  >([]);
  const [newProfileAppName, setNewProfileAppName] = useState("");
  const [portablePassphrase, setPortablePassphrase] = useState("");
  const [portablePayload, setPortablePayload] = useState("");
  const [diagnosticEvents, setDiagnosticEvents] = useState<
    Array<{ ts: string; kind: string; detail: string; app?: string }>
  >([]);
  const [timelineClusters, setTimelineClusters] = useState<
    Array<{
      id: string;
      startedAt: string;
      endedAt: string;
      items: number;
      topSourceApp?: string;
      topContentType?: string;
    }>
  >([]);
  const [fallbackMethods, setFallbackMethods] = useState<
    Array<{ app: string; method: string }>
  >([]);
  const [trustModeAppName, setTrustModeAppName] = useState("");
  const [trustModeValue, setTrustModeValue] = useState<
    "strict" | "balanced" | "passthrough"
  >("balanced");
  const [recipeSource, setRecipeSource] = useState("");
  const [recipeTarget, setRecipeTarget] = useState("");
  const [recipePreset, setRecipePreset] = useState("keepStructure");
  const [recipeSourceInput, setRecipeSourceInput] = useState("");
  const [recipeTargetInput, setRecipeTargetInput] = useState("");
  // Dynamic running apps list from backend
  const [runningApps, setRunningApps] = useState<
    Array<{ name: string; processName: string }>
  >([]);
  const [loadingApps, setLoadingApps] = useState(false);
  const [contextMenuStatus, setContextMenuStatus] =
    useState<ContextMenuStatus | null>(null);
  const [contextMenuBusy, setContextMenuBusy] = useState(false);

  const applyThemeToDocument = (themeValue: string | undefined) => {
    const normalizedTheme = applyThemeToRoot(themeValue);
    emitThemeChanged(normalizedTheme);
  };

  const loadContextMenuStatus = async () => {
    if (!bridgeAvailable) {
      setContextMenuStatus(null);
      return;
    }
    try {
      const status = await invokeIPC<ContextMenuStatus>(
        "settings:context-menu-status",
      );
      setContextMenuStatus(status);
    } catch {
      setContextMenuStatus(null);
    }
  };

  const loadRunningApps = async () => {
    if (!bridgeAvailable) return;
    setLoadingApps(true);
    try {
      const apps = await invokeIPC<
        Array<{ name: string; processName: string }>
      >("system:running-apps");
      setRunningApps(apps ?? []);
    } catch {
      setRunningApps([]);
    } finally {
      setLoadingApps(false);
    }
  };

  const loadAiUsage = async () => {
    if (!bridgeAvailable) return;
    try {
      const stats = await invokeIPC<typeof aiUsageStats>("ai:usage-stats");
      setAiUsageStats(stats);
    } catch {
      /* best-effort */
    }
  };

  const loadSettings = async () => {
    if (!bridgeAvailable) {
      setSettings(null);
      setLoading(false);
      return;
    }

    try {
      const data = await invokeIPC<AppSettings>("settings:get");
      setSettings(data);
      // Sync local AI credential state from loaded settings
      setAiApiKey(data?.ai?.apiKey ?? "");
      setAiModel(data?.ai?.model ?? "");
      setAiBaseUrl(data?.ai?.baseUrl ?? "");
      // Load app profiles
      try {
        const profiles = await invokeIPC<typeof appProfiles>(
          "settings:get-app-profiles",
        );
        setAppProfiles(profiles ?? []);
      } catch {
        /* best-effort */
      }

      // Keep theme application consistent across all renderer surfaces
      applyThemeToDocument(data?.general?.theme);
      await loadContextMenuStatus();
      void loadRunningApps();
      void loadAiUsage();
    } catch {
      setSettings(null);
    } finally {
      setLoading(false);
    }
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: initial settings bootstrap runs once on mount.
  useEffect(() => {
    loadSettings();
  }, []);

  const handleToggleContextMenu = async (enabled: boolean) => {
    if (!settings || contextMenuBusy) {
      return;
    }
    setContextMenuBusy(true);
    const previous = settings.general.enableContextMenu;
    const optimistic: AppSettings = {
      ...settings,
      general: {
        ...settings.general,
        enableContextMenu: enabled,
      },
    };
    setSettings(optimistic);

    try {
      const updated = await invokeIPC<AppSettings>("settings:update", {
        general: {
          enableContextMenu: enabled,
        },
      });
      setSettings(updated);
      await loadContextMenuStatus();
      addToast({
        title: enabled ? "Context menu enabled" : "Context menu disabled",
        type: "success",
        duration: 2000,
      });
    } catch (err) {
      setSettings({
        ...optimistic,
        general: {
          ...optimistic.general,
          enableContextMenu: previous,
        },
      });
      await loadContextMenuStatus();
      addToast({
        title: "Context menu update failed",
        message: String(err),
        type: "error",
      });
    } finally {
      setContextMenuBusy(false);
    }
  };

  const handleRepairContextMenu = async (mode?: "install" | "uninstall") => {
    if (contextMenuBusy) {
      return;
    }
    setContextMenuBusy(true);
    try {
      const status = await invokeIPC<ContextMenuStatus>(
        "settings:context-menu-repair",
        mode
          ? {
              mode,
              menuMode: (settings?.general.contextMenuMode ?? "top_level") as
                | "top_level"
                | "submenu",
            }
          : {
              menuMode: (settings?.general.contextMenuMode ?? "top_level") as
                | "top_level"
                | "submenu",
            },
      );
      setContextMenuStatus(status);
      addToast({
        title: "Context menu repaired",
        message: status.installed
          ? "Explorer entries are active"
          : "Explorer entries removed",
        type: "success",
      });
      const refreshed = await invokeIPC<AppSettings>("settings:get");
      setSettings(refreshed);
    } catch (err) {
      addToast({
        title: "Context menu repair failed",
        message: String(err),
        type: "error",
      });
    } finally {
      setContextMenuBusy(false);
    }
  };

  const handleContextMenuModeChange = async (
    menuMode: "top_level" | "submenu",
  ) => {
    if (!settings || contextMenuBusy) {
      return;
    }

    const previous = settings.general.contextMenuMode ?? "top_level";
    if (previous === menuMode) {
      return;
    }

    setContextMenuBusy(true);
    const optimistic: AppSettings = {
      ...settings,
      general: {
        ...settings.general,
        contextMenuMode: menuMode,
      },
    };
    setSettings(optimistic);

    try {
      const updated = await invokeIPC<AppSettings>("settings:update", {
        general: {
          contextMenuMode: menuMode,
        },
      });
      setSettings(updated);
      await loadContextMenuStatus();
      addToast({
        title: "Context menu mode updated",
        message:
          menuMode === "submenu"
            ? "Smart Paste Hub now appears as submenu"
            : "Smart Paste Hub now appears as top-level actions",
        type: "success",
        duration: 2200,
      });
    } catch (err) {
      setSettings({
        ...optimistic,
        general: {
          ...optimistic.general,
          contextMenuMode: previous,
        },
      });
      await loadContextMenuStatus();
      addToast({
        title: "Context menu mode update failed",
        message: String(err),
        type: "error",
      });
    } finally {
      setContextMenuBusy(false);
    }
  };

  const updateSetting = async (path: string, value: any) => {
    if (!bridgeAvailable) {
      addToast({
        title: "Not available in browser mode",
        message: "Run Settings inside Electron desktop app.",
        type: "warning",
      });
      return;
    }

    try {
      // Create nested object based on path (e.g. 'general.theme')
      const parts = path.split(".");
      const updatePayload: Record<string, any> = {};
      let current = updatePayload;

      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i] as string;
        current[key] = {};
        current = current[key];
      }
      const finalKey = parts[parts.length - 1] as string;
      current[finalKey] = value;

      // Optimistic UI update
      const newSettings = JSON.parse(JSON.stringify(settings));
      let target = newSettings;
      for (let i = 0; i < parts.length - 1; i++) {
        const tkey = parts[i] as string;
        if (!target[tkey]) target[tkey] = {};
        target = target[tkey];
      }
      target[finalKey] = value;
      setSettings(newSettings);

      // Handle theme change immediately
      if (path === "general.theme") {
        applyThemeToDocument(typeof value === "string" ? value : String(value));
      }

      await invokeIPC("settings:update", updatePayload);

      if (path === "general.language" && (value === "id" || value === "en")) {
        void i18n.changeLanguage(value);
        window.dispatchEvent(
          new CustomEvent("app:language-changed", {
            detail: { language: value },
          }),
        );
      }

      addToast({
        title: "Settings Saved",
        type: "success",
        duration: 2000,
      });
    } catch (err) {
      addToast({
        title: "Failed to save",
        message: String(err),
        type: "error",
      });
      loadSettings(); // revert
    }
  };

  const saveAiCredentials = async () => {
    setAiSaving(true);
    try {
      await invokeIPC("settings:update", {
        ai: {
          apiKey: aiApiKey || undefined,
          model: aiModel || undefined,
          baseUrl: aiBaseUrl || undefined,
        },
      });
      // Refresh settings in state
      const refreshed = await invokeIPC<AppSettings>("settings:get");
      setSettings(refreshed);
      addToast({ title: "AI Settings Saved", type: "success", duration: 2000 });
      setTestConnStatus("idle");
    } catch (err) {
      addToast({
        title: "Failed to save AI settings",
        message: String(err),
        type: "error",
      });
    } finally {
      setAiSaving(false);
    }
  };

  const testAiConnection = async () => {
    if (!bridgeAvailable) {
      setTestConnStatus("error");
      setTestConnMsg("Run this test inside Electron desktop app.");
      return;
    }

    setTestConnStatus("loading");
    setTestConnMsg("");
    try {
      const result = await invokeIPC<{ ok: boolean; message: string }>(
        "ai:test-connection",
      );
      setTestConnStatus(result.ok ? "ok" : "error");
      setTestConnMsg(result.message);
    } catch (err) {
      setTestConnStatus("error");
      setTestConnMsg(String(err));
    }
  };

  const applyRecommendedHotkeys = async () => {
    const recommended = RECOMMENDED_PASTE_HOTKEYS[0];
    if (!recommended) return;
    await updateSetting("hotkeys.pasteClean", recommended);
    addToast({
      title: "Recommended hotkey applied",
      message: `${recommended} is now your primary Smart Paste shortcut`,
      type: "success",
      duration: 2500,
    });
  };

  const applyQuickTestProfile = async () => {
    if (!settings) return;
    if (!bridgeAvailable) {
      addToast({
        title: "Not available in browser mode",
        message: "Run this action inside Electron desktop app.",
        type: "warning",
      });
      return;
    }

    const recommended = RECOMMENDED_PASTE_HOTKEYS[0];
    if (!recommended) return;

    try {
      const updatePayload = {
        hotkeys: { ...settings.hotkeys, pasteClean: recommended },
        general: { ...settings.general, autoCleanOnCopy: true },
      };
      const updated = await invokeIPC<AppSettings>(
        "settings:update",
        updatePayload,
      );
      setSettings(updated);
      addToast({
        title: "Quick test mode enabled",
        message: `Auto-clean ON, hotkey set to ${recommended}`,
        type: "success",
        duration: 2800,
      });
    } catch (err) {
      addToast({
        title: "Failed to enable quick test mode",
        message: String(err),
        type: "error",
      });
    }
  };

  const buildHotkeyFromKeydown = (
    e: React.KeyboardEvent<HTMLInputElement>,
  ): string | null => {
    if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) {
      return null;
    }
    const modifiers: string[] = [];
    if (e.ctrlKey) modifiers.push("Ctrl");
    if (e.altKey) modifiers.push("Alt");
    if (e.shiftKey) modifiers.push("Shift");
    if (e.metaKey) modifiers.push("Command");
    return [...modifiers, e.key.toUpperCase()].join("+");
  };

  const resolveHotkeyInputValue = (
    key: keyof AppSettings["hotkeys"],
  ): string => {
    const configured = settings?.hotkeys?.[key];
    if (typeof configured === "string" && configured.trim()) {
      return configured;
    }
    const fallback = DEFAULT_SETTINGS.hotkeys[key];
    return typeof fallback === "string" ? fallback : "";
  };

  const loadDiagnostics = async () => {
    if (!bridgeAvailable) return;
    try {
      const [events, clusters, fallback] = await Promise.all([
        invokeIPC<
          Array<{ ts: string; kind: string; detail: string; app?: string }>
        >("diagnostics:observability", { limit: 100 }),
        invokeIPC<
          Array<{
            id: string;
            startedAt: string;
            endedAt: string;
            items: number;
            topSourceApp?: string;
            topContentType?: string;
          }>
        >("timeline:clusters"),
        invokeIPC<Array<{ app: string; method: string }>>(
          "diagnostics:fallback-methods",
        ),
      ]);
      setDiagnosticEvents(events);
      setTimelineClusters(clusters);
      setFallbackMethods(fallback);
    } catch (err) {
      addToast({
        title: "Failed to load diagnostics",
        message: String(err),
        type: "error",
      });
    }
  };

  const exportPortable = async () => {
    if (!portablePassphrase.trim()) {
      addToast({ title: "Passphrase required", type: "warning" });
      return;
    }
    try {
      const payload = await invokeIPC<string>("settings:export-portable", {
        passphrase: portablePassphrase,
      });
      setPortablePayload(payload);
      addToast({ title: "Portable settings exported", type: "success" });
    } catch (err) {
      addToast({
        title: "Export failed",
        message: String(err),
        type: "error",
      });
    }
  };

  const importPortable = async () => {
    if (!portablePassphrase.trim() || !portablePayload.trim()) {
      addToast({
        title: "Passphrase and payload required",
        type: "warning",
      });
      return;
    }
    try {
      const updated = await invokeIPC<AppSettings>("settings:import-portable", {
        passphrase: portablePassphrase,
        data: portablePayload,
      });
      setSettings(updated);
      addToast({ title: "Portable settings imported", type: "success" });
    } catch (err) {
      addToast({
        title: "Import failed",
        message: String(err),
        type: "error",
      });
    }
  };

  const clearAiUsage = async () => {
    await invokeIPC("ai:clear-usage");
    void loadAiUsage();
  };

  const invokeSetAppProfile = async (payload: {
    appName: string;
    cleanMode: string;
    autoTranslate?: boolean;
    targetLang?: "id" | "en";
  }) => {
    try {
      const updated = await invokeIPC<typeof appProfiles>(
        "settings:set-app-profile",
        payload,
      );
      setAppProfiles(updated);
      if (payload.appName === newProfileAppName.trim()) {
        setNewProfileAppName("");
        addToast({ title: "Profile added", type: "success" });
      }
    } catch (err) {
      addToast({ title: "Failed", message: String(err), type: "error" });
    }
  };

  const invokeSetTrustMode = async (payload: {
    appName: string;
    mode: string;
  }) => {
    if (!payload.appName.trim()) return;
    try {
      await invokeIPC("settings:set-trust-mode", payload);
      addToast({ title: "Trust mode saved", type: "success" });
      setTrustModeAppName("");
    } catch (err) {
      addToast({
        title: "Failed to save trust mode",
        message: String(err),
        type: "error",
      });
    }
  };

  if (loading)
    return (
      <div className={styles.page}>
        <div className={styles.loading}>Loading settings…</div>
      </div>
    );
  if (!settings)
    return (
      <div className={styles.page}>
        <div className={styles.loading}>
          {bridgeAvailable
            ? "Failed to load settings. Please restart the app."
            : "Settings are available in Electron desktop app only."}
        </div>
      </div>
    );

  return (
    <div className={styles.page}>
      <h1 className={styles.title}>Settings</h1>
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Tabs</h2>
        <div className={styles.settingRowFull}>
          <div className={styles.buttonGroup}>
            <Button
              size="sm"
              variant={activeTab === "general" ? "primary" : "secondary"}
              onClick={() => setActiveTab("general")}
            >
              General
            </Button>
            <Button
              size="sm"
              variant={activeTab === "hotkeys" ? "primary" : "secondary"}
              onClick={() => setActiveTab("hotkeys")}
            >
              Hotkeys
            </Button>
            <Button
              size="sm"
              variant={activeTab === "ai" ? "primary" : "secondary"}
              onClick={() => setActiveTab("ai")}
            >
              AI
            </Button>
            <Button
              size="sm"
              variant={activeTab === "security" ? "primary" : "secondary"}
              onClick={() => setActiveTab("security")}
            >
              Security
            </Button>
            <Button
              size="sm"
              variant={activeTab === "automation" ? "primary" : "secondary"}
              onClick={() => setActiveTab("automation")}
            >
              Automation
            </Button>
            <Button
              size="sm"
              variant={activeTab === "appearance" ? "primary" : "secondary"}
              onClick={() => setActiveTab("appearance")}
            >
              Appearance
            </Button>
            <Button
              size="sm"
              variant={activeTab === "context-menu" ? "primary" : "secondary"}
              onClick={() => setActiveTab("context-menu")}
            >
              Context Menu
            </Button>
            <Button
              size="sm"
              variant={activeTab === "context-rules" ? "primary" : "secondary"}
              onClick={() => setActiveTab("context-rules")}
            >
              Context Rules
            </Button>
          </div>
        </div>
      </div>

      {activeTab === "general" && (
        <GeneralSettings
          settings={settings}
          showOnboarding={showOnboarding}
          setShowOnboarding={setShowOnboarding}
          resolveHotkeyInputValue={resolveHotkeyInputValue}
          updateSetting={updateSetting}
        />
      )}
      {activeTab === "hotkeys" && (
        <HotkeySettings
          resolveHotkeyInputValue={resolveHotkeyInputValue}
          buildHotkeyFromKeydown={buildHotkeyFromKeydown}
          updateSetting={updateSetting}
          applyRecommendedHotkeys={applyRecommendedHotkeys}
          applyQuickTestProfile={applyQuickTestProfile}
        />
      )}
      {activeTab === "ai" && (
        <AiSettings
          settings={settings}
          showApiKey={showApiKey}
          setShowApiKey={setShowApiKey}
          testConnStatus={testConnStatus}
          testConnMsg={testConnMsg}
          testAiConnection={testAiConnection}
          aiApiKey={aiApiKey}
          setAiApiKey={setAiApiKey}
          aiModel={aiModel}
          setAiModel={setAiModel}
          aiBaseUrl={aiBaseUrl}
          setAiBaseUrl={setAiBaseUrl}
          aiSaving={aiSaving}
          saveAiCredentials={saveAiCredentials}
          aiUsageStats={aiUsageStats}
          bridgeAvailable={bridgeAvailable}
          loadAiUsage={loadAiUsage}
          clearAiUsage={clearAiUsage}
          updateSetting={updateSetting}
        />
      )}
      {activeTab === "security" && (
        <SecuritySettings
          settings={settings}
          portablePassphrase={portablePassphrase}
          setPortablePassphrase={setPortablePassphrase}
          portablePayload={portablePayload}
          setPortablePayload={setPortablePayload}
          exportPortable={exportPortable}
          importPortable={importPortable}
          updateSetting={updateSetting}
        />
      )}
      {activeTab === "automation" && (
        <AutomationSettings
          settings={settings}
          runningApps={runningApps}
          loadingApps={loadingApps}
          loadRunningApps={loadRunningApps}
          recipeSource={recipeSource}
          setRecipeSource={setRecipeSource}
          recipeTarget={recipeTarget}
          setRecipeTarget={setRecipeTarget}
          recipePreset={recipePreset}
          setRecipePreset={setRecipePreset}
          recipeSourceInput={recipeSourceInput}
          setRecipeSourceInput={setRecipeSourceInput}
          recipeTargetInput={recipeTargetInput}
          setRecipeTargetInput={setRecipeTargetInput}
          appProfiles={appProfiles}
          setAppProfiles={setAppProfiles}
          newProfileAppName={newProfileAppName}
          setNewProfileAppName={setNewProfileAppName}
          trustModeAppName={trustModeAppName}
          setTrustModeAppName={setTrustModeAppName}
          trustModeValue={trustModeValue}
          setTrustModeValue={setTrustModeValue}
          diagnosticEvents={diagnosticEvents}
          timelineClusters={timelineClusters}
          fallbackMethods={fallbackMethods}
          loadDiagnostics={loadDiagnostics}
          commonApps={COMMON_APPS}
          presetOptions={PRESET_OPTIONS}
          updateSetting={updateSetting}
          invokeSetAppProfile={invokeSetAppProfile}
          invokeSetTrustMode={invokeSetTrustMode}
        />
      )}
      {activeTab === "appearance" && (
        <AppearanceSettings settings={settings} updateSetting={updateSetting} />
      )}
      {activeTab === "context-rules" && (
        <ContextRulesSettings presetOptions={PRESET_OPTIONS} />
      )}
      {activeTab === "context-menu" && (
        <ContextMenuSettings
          settings={settings}
          contextMenuStatus={contextMenuStatus}
          contextMenuBusy={contextMenuBusy}
          handleContextMenuModeChange={handleContextMenuModeChange}
          handleRepairContextMenu={handleRepairContextMenu}
          loadContextMenuStatus={loadContextMenuStatus}
          handleToggleContextMenu={handleToggleContextMenu}
        />
      )}
    </div>
  );
};
