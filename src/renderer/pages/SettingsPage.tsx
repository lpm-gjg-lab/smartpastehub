import React, { useEffect, useState } from "react";
import styles from "../styles/pages/SettingsPage.module.css";
import { hasSmartPasteBridge, invokeIPC } from "../lib/ipc";
import { Button } from "../components/Button";
import { useToastStore } from "../stores/useToastStore";
import type { AppSettings } from "../../shared/types";
import { RECOMMENDED_PASTE_HOTKEYS } from "../../shared/constants";

interface ContextMenuStatus {
  supported: boolean;
  installed: boolean;
  mode?: "top_level" | "submenu";
  backgroundEntry: boolean;
  fileEntry: boolean;
  folderEntry?: boolean;
  backgroundCommandMatch?: boolean;
  fileCommandMatch?: boolean;
  folderCommandMatch?: boolean;
  actualBackgroundCommand?: string;
  actualFileCommand?: string;
  actualFolderCommand?: string;
  expectedBackgroundCommand?: string;
  expectedFileCommand?: string;
  expectedFolderCommand?: string;
}

export const SettingsPage: React.FC = () => {
  const bridgeAvailable = hasSmartPasteBridge();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const { addToast } = useToastStore();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [testConnStatus, setTestConnStatus] = useState<
    "idle" | "loading" | "ok" | "error"
  >("idle");
  const [testConnMsg, setTestConnMsg] = useState("");
  // Local-only AI credential fields (saved only on explicit Save)
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiModel, setAiModel] = useState("");
  const [aiBaseUrl, setAiBaseUrl] = useState("");
  const [aiSaving, setAiSaving] = useState(false);
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
  const [contextMenuStatus, setContextMenuStatus] =
    useState<ContextMenuStatus | null>(null);
  const [contextMenuBusy, setContextMenuBusy] = useState(false);

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

      // Update DOM theme if needed
      if (data?.general?.theme === "light") {
        document.documentElement.setAttribute("data-theme", "light");
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
      await loadContextMenuStatus();
    } catch {
      setSettings(null);
    } finally {
      setLoading(false);
    }
  };

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
        if (value === "light")
          document.documentElement.setAttribute("data-theme", "light");
        else document.documentElement.removeAttribute("data-theme");
      }

      await invokeIPC("settings:update", updatePayload);

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

      {/* ── Getting Started (F no.22) ─────────────────────────────────────── */}
      <div className={styles.section}>
        <h2
          className={styles.sectionTitle}
          style={{ cursor: "pointer" }}
          onClick={() => setShowOnboarding((prev) => !prev)}
        >
          {showOnboarding ? "\u25BC" : "\u25B6"} Getting Started
        </h2>
        {showOnboarding && (
          <div
            style={{
              padding: "12px 0",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div>
              <strong>Step 1:</strong> Copy any text.{" "}
              {settings.general.autoCleanOnCopy
                ? "SmartPasteHub auto-cleans in background."
                : "Turn on Auto-clean on copy below to feel instant benefit."}
            </div>
            <div>
              <strong>Step 2:</strong> Paste dengan <code>Ctrl+V</code> —
              hasilnya sudah bersih otomatis.
            </div>
            <div>
              <strong>Bonus:</strong> Tekan{" "}
              <code>
                {settings.hotkeys?.pasteClean || RECOMMENDED_PASTE_HOTKEYS[0]}
              </code>{" "}
              untuk SmartPaste manual — atau OCR otomatis jika clipboard berisi
              gambar.
            </div>
            <div style={{ fontSize: "12px", opacity: 0.6 }}>
              Tip: Type <code>;​snippet-name</code> anywhere to instantly expand
              saved snippets.
            </div>
          </div>
        )}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>General</h2>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Auto-clean on copy</h3>
            <p>
              Saat aktif, setiap <code>Ctrl+C</code> otomatis membersihkan teks
              di clipboard — <code>Ctrl+V</code> biasa sudah menghasilkan teks
              bersih. Matikan jika ingin paste original tanpa proses.
            </p>
          </div>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={settings.general.autoCleanOnCopy}
              onChange={(e) =>
                updateSetting("general.autoCleanOnCopy", e.target.checked)
              }
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Enable Windows context menu</h3>
            <p>
              Adds "Smart Paste as New File" and "Clean & Copy" options when
              right-clicking files or folders in Windows Explorer.
            </p>
            <div className={styles.buttonGroup}>
              <select
                className={styles.input}
                value={settings.general.contextMenuMode ?? "top_level"}
                onChange={(e) =>
                  void handleContextMenuModeChange(
                    e.target.value as "top_level" | "submenu",
                  )
                }
                disabled={
                  contextMenuBusy ||
                  !(settings.general.enableContextMenu ?? true)
                }
              >
                <option value="top_level">Top-level actions</option>
                <option value="submenu">
                  Single submenu (Smart Paste Hub)
                </option>
              </select>
            </div>
            {contextMenuStatus && (
              <div className={styles.statusMetaRow}>
                <span
                  className={`${styles.statusBadge} ${
                    contextMenuStatus.installed
                      ? styles.statusBadgeOk
                      : styles.statusBadgeWarn
                  }`}
                >
                  {contextMenuStatus.installed ? "Installed" : "Not Installed"}
                </span>
                {contextMenuStatus.supported ? (
                  <>
                    <span
                      className={`${styles.statusBadge} ${
                        contextMenuStatus.backgroundEntry
                          ? styles.statusBadgeOk
                          : styles.statusBadgeWarn
                      }`}
                    >
                      Background{" "}
                      {contextMenuStatus.backgroundEntry ? "OK" : "Missing"}
                    </span>
                    <span
                      className={`${styles.statusBadge} ${
                        contextMenuStatus.fileEntry
                          ? styles.statusBadgeOk
                          : styles.statusBadgeWarn
                      }`}
                    >
                      File {contextMenuStatus.fileEntry ? "OK" : "Missing"}
                    </span>
                    <span
                      className={`${styles.statusBadge} ${
                        contextMenuStatus.folderEntry
                          ? styles.statusBadgeOk
                          : styles.statusBadgeWarn
                      }`}
                    >
                      Folder {contextMenuStatus.folderEntry ? "OK" : "Missing"}
                    </span>
                    <span
                      className={`${styles.statusBadge} ${
                        contextMenuStatus.backgroundCommandMatch
                          ? styles.statusBadgeOk
                          : styles.statusBadgeWarn
                      }`}
                    >
                      BG Cmd{" "}
                      {contextMenuStatus.backgroundCommandMatch
                        ? "OK"
                        : "Mismatch"}
                    </span>
                    <span
                      className={`${styles.statusBadge} ${
                        contextMenuStatus.fileCommandMatch
                          ? styles.statusBadgeOk
                          : styles.statusBadgeWarn
                      }`}
                    >
                      File Cmd{" "}
                      {contextMenuStatus.fileCommandMatch ? "OK" : "Mismatch"}
                    </span>
                    <span
                      className={`${styles.statusBadge} ${
                        contextMenuStatus.folderCommandMatch
                          ? styles.statusBadgeOk
                          : styles.statusBadgeWarn
                      }`}
                    >
                      Folder Cmd{" "}
                      {contextMenuStatus.folderCommandMatch ? "OK" : "Mismatch"}
                    </span>
                    <span
                      className={`${styles.statusBadge} ${styles.statusBadgeOk}`}
                    >
                      Mode{" "}
                      {(contextMenuStatus.mode ?? "top_level") === "submenu"
                        ? "Submenu"
                        : "Top-level"}
                    </span>
                  </>
                ) : (
                  <span
                    className={`${styles.statusBadge} ${styles.statusBadgeWarn}`}
                  >
                    Unsupported on this platform
                  </span>
                )}
              </div>
            )}
            {contextMenuStatus &&
            (contextMenuStatus.backgroundCommandMatch === false ||
              contextMenuStatus.fileCommandMatch === false ||
              contextMenuStatus.folderCommandMatch === false) ? (
              <p className={styles.hint}>
                Command mismatch detected. Use Repair (Install) to rewrite
                entries.
              </p>
            ) : null}
            <div className={styles.buttonGroup}>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void handleRepairContextMenu("install")}
                disabled={contextMenuBusy}
              >
                Repair (Install)
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => void handleRepairContextMenu("uninstall")}
                disabled={contextMenuBusy}
              >
                Repair (Remove)
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => void loadContextMenuStatus()}
                disabled={contextMenuBusy}
              >
                Refresh Status
              </Button>
            </div>
          </div>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={settings.general.enableContextMenu ?? true}
              onChange={(e) => void handleToggleContextMenu(e.target.checked)}
              disabled={contextMenuBusy}
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Start hidden (background mode)</h3>
            <p>
              App runs silently in the background on startup — no main window
              opens, just a system tray icon
            </p>
          </div>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={settings.general.startHidden}
              onChange={(e) =>
                updateSetting("general.startHidden", e.target.checked)
              }
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Launch at startup</h3>
            <p>Automatically start SmartPasteHub when your computer boots</p>
          </div>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={settings.general.startOnBoot ?? false}
              onChange={(e) =>
                updateSetting("general.startOnBoot", e.target.checked)
              }
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Auto-clear clipboard after clean</h3>
            <p>
              Automatically clears the clipboard after a few seconds to protect
              sensitive data
            </p>
          </div>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={settings.security?.autoClear || false}
              onChange={(e) =>
                updateSetting("security.autoClear", e.target.checked)
              }
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Theme</h3>
            <p>Choose your preferred interface appearance</p>
          </div>
          <div className={styles.buttonGroup}>
            <Button
              variant={
                settings.general?.theme === "dark" ? "primary" : "secondary"
              }
              size="sm"
              onClick={() => updateSetting("general.theme", "dark")}
            >
              Dark
            </Button>
            <Button
              variant={
                settings.general?.theme === "light" ? "primary" : "secondary"
              }
              size="sm"
              onClick={() => updateSetting("general.theme", "light")}
            >
              Light
            </Button>
          </div>
        </div>

        <div className={styles.settingRowFull}>
          <div className={styles.settingInfo}>
            <h3>Source &rarr; Target Recipes</h3>
            <p>Auto-switch preset based on app route pairs</p>
          </div>
          <div className={styles.inlineGroup}>
            <input
              className={styles.input}
              placeholder="Source app"
              value={recipeSource}
              onChange={(e) => setRecipeSource(e.target.value)}
            />
            <input
              className={styles.input}
              placeholder="Target app"
              value={recipeTarget}
              onChange={(e) => setRecipeTarget(e.target.value)}
            />
            <input
              className={styles.input}
              placeholder="Preset id"
              value={recipePreset}
              onChange={(e) => setRecipePreset(e.target.value)}
            />
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const recipe = {
                  id: `recipe-${Date.now()}`,
                  sourceApp: recipeSource || undefined,
                  targetApp: recipeTarget || undefined,
                  preset: recipePreset || "keepStructure",
                  enabled: true,
                };
                const next = [...(settings.recipes ?? []), recipe];
                void updateSetting("recipes", next);
                setRecipeSource("");
                setRecipeTarget("");
              }}
            >
              Add
            </Button>
          </div>
          {(settings.recipes ?? []).slice(0, 6).map((recipe) => (
            <div key={recipe.id} className={styles.subItem}>
              <div className={styles.subItemInfo}>
                <h4>
                  {recipe.sourceApp ?? "any"} &rarr; {recipe.targetApp ?? "any"}
                </h4>
                <p>preset: {recipe.preset}</p>
              </div>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => {
                  const next = (settings.recipes ?? []).filter(
                    (entry) => entry.id !== recipe.id,
                  );
                  void updateSetting("recipes", next);
                }}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>

        {(settings.autoLearnedRules ?? []).length > 0 && (
          <div className={styles.settingRowFull}>
            <div className={styles.settingInfo}>
              <h3>Auto-learned Suggestions</h3>
              <p>Promote learned route suggestions into manual recipes</p>
            </div>
            {(settings.autoLearnedRules ?? []).slice(0, 8).map((rule) => (
              <div key={rule.id} className={styles.subItem}>
                <div className={styles.subItemInfo}>
                  <h4>
                    {rule.appName} / {rule.contentType}
                  </h4>
                  <p>
                    Suggest: {rule.suggestedPreset} (confidence{" "}
                    {Math.round(rule.confidence * 100)}%)
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => {
                    const recipe = {
                      id: `from-learn-${Date.now()}`,
                      targetApp: rule.appName,
                      contentType: rule.contentType,
                      preset: rule.suggestedPreset,
                      enabled: true,
                    };
                    const next = [...(settings.recipes ?? []), recipe];
                    void updateSetting("recipes", next);
                  }}
                >
                  Promote
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Hotkeys</h2>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Smart Paste Shortcut</h3>
            <p>Global shortcut to paste cleaned content</p>
          </div>
          <div className={styles.hotkeyInput}>
            <input
              type="text"
              value={
                settings.hotkeys?.pasteClean || RECOMMENDED_PASTE_HOTKEYS[0]
              }
              readOnly // To make this fully functional requires a hotkey recorder, read-only for MVP
              className={styles.input}
              onKeyDown={(e) => {
                e.preventDefault();
                // Simple recorder MVP
                if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return;

                const modifiers = [];
                if (e.ctrlKey) modifiers.push("Ctrl");
                if (e.altKey) modifiers.push("Alt");
                if (e.shiftKey) modifiers.push("Shift");
                if (e.metaKey) modifiers.push("Command");

                const key = e.key.toUpperCase();
                const hotkey = [...modifiers, key].join("+");
                updateSetting("hotkeys.pasteClean", hotkey);
              }}
            />
            <span className={styles.hint}>Click and press keys</span>
          </div>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Per-app hotkey overrides</h3>
            <p>
              Use <code>Ctrl+Alt+P</code> to cycle presets. The main hotkey
              above applies globally.
            </p>
          </div>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Recommended low-collision hotkey</h3>
            <p>
              One click apply: <code>{RECOMMENDED_PASTE_HOTKEYS[0]}</code>. If
              unavailable, app auto-falls back to the next recommended option.
            </p>
          </div>
          <div className={styles.buttonGroup}>
            <Button
              variant="secondary"
              size="sm"
              onClick={applyRecommendedHotkeys}
            >
              Apply Recommended
            </Button>
            <Button variant="primary" size="sm" onClick={applyQuickTestProfile}>
              Quick Test Mode
            </Button>
          </div>
        </div>

        {/* History Ring hotkey */}
        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>History Ring</h3>
            <p>Global shortcut to open the floating History Ring window</p>
          </div>
          <div className={styles.hotkeyInput}>
            <input
              type="text"
              value={settings.hotkeys?.historyOpen || "Ctrl+Alt+H"}
              readOnly
              className={styles.input}
              onKeyDown={(e) => {
                e.preventDefault();
                if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return;
                const modifiers = [];
                if (e.ctrlKey) modifiers.push("Ctrl");
                if (e.altKey) modifiers.push("Alt");
                if (e.shiftKey) modifiers.push("Shift");
                if (e.metaKey) modifiers.push("Command");
                updateSetting(
                  "hotkeys.historyOpen",
                  [...modifiers, e.key.toUpperCase()].join("+"),
                );
              }}
            />
            <span className={styles.hint}>Click and press keys</span>
          </div>
        </div>

        {/* Multi-Copy Toggle hotkey */}
        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Multi-Copy Toggle</h3>
            <p>Global shortcut to start or stop multi-clipboard collection</p>
          </div>
          <div className={styles.hotkeyInput}>
            <input
              type="text"
              value={settings.hotkeys?.multiCopy || "Ctrl+Alt+C"}
              readOnly
              className={styles.input}
              onKeyDown={(e) => {
                e.preventDefault();
                if (["Control", "Shift", "Alt", "Meta"].includes(e.key)) return;
                const modifiers = [];
                if (e.ctrlKey) modifiers.push("Ctrl");
                if (e.altKey) modifiers.push("Alt");
                if (e.shiftKey) modifiers.push("Shift");
                if (e.metaKey) modifiers.push("Command");
                updateSetting(
                  "hotkeys.multiCopy",
                  [...modifiers, e.key.toUpperCase()].join("+"),
                );
              }}
            />
            <span className={styles.hint}>Click and press keys</span>
          </div>
        </div>

        {/* Cycle AI Presets — hardcoded hotkey info */}
        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Cycle AI Presets</h3>
            <p>
              Hardcoded: <code>Ctrl+Alt+P</code> — Cycle through format presets
              in the active window
            </p>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>AI Settings</h2>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Enable AI Features</h3>
            <p>
              Allow AI-powered actions like Summarize, Fix Grammar, Rephrase,
              Formalize
            </p>
          </div>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={settings.ai?.enabled || false}
              disabled={settings.ai?.provider === "local"}
              onChange={(e) => updateSetting("ai.enabled", e.target.checked)}
            />
            <span className={styles.slider}></span>
          </label>
        </div>
        {settings.ai?.provider === "local" && (
          <p className={styles.hint}>
            Switch to Gemini, OpenAI, Anthropic, or Custom above to enable AI
            features.
          </p>
        )}

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Provider</h3>
            <p>Which AI backend to use</p>
          </div>
          <select
            className={styles.input}
            value={settings.ai?.provider || "local"}
            onChange={(e) => updateSetting("ai.provider", e.target.value)}
          >
            <option value="local">Local (no AI)</option>
            <option value="openai">OpenAI (GPT-4o, o3…)</option>
            <option value="gemini">Google Gemini (2.5 Flash, 2.5 Pro…)</option>
            <option value="anthropic">
              Anthropic Claude (claude-3.5, claude-opus…)
            </option>
            <option value="deepseek">
              DeepSeek (deepseek-chat, deepseek-reasoner…)
            </option>
            <option value="xai">xAI Grok (grok-3, grok-3-mini…)</option>
            <option value="custom">Custom / OpenAI-compatible</option>
          </select>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>AI Mode</h3>
            <p>
              How AI rewrites your text. <strong>Auto</strong> picks the best
              mode based on content type. Or lock to a specific mode.
            </p>
          </div>
          <select
            className={styles.input}
            value={settings.ai?.aiMode || "auto"}
            onChange={(e) => updateSetting("ai.aiMode", e.target.value)}
            disabled={
              settings.ai?.provider === "local" || !settings.ai?.enabled
            }
          >
            <option value="auto">Auto-detect</option>
            <option value="fix_grammar">Fix Grammar</option>
            <option value="rephrase">Rephrase</option>
            <option value="summarize">Summarize</option>
            <option value="formalize">Formalize</option>
          </select>
        </div>

        {settings.ai?.provider !== "local" && (
          <>
            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <h3>API Key</h3>
                <p>
                  {settings.ai?.provider === "gemini"
                    ? "Your Google AI Studio / Gemini API key"
                    : settings.ai?.provider === "anthropic"
                      ? "Your Anthropic API key (sk-ant-...)"
                      : settings.ai?.provider === "deepseek"
                        ? "Your DeepSeek API key"
                        : settings.ai?.provider === "xai"
                          ? "Your xAI API key"
                          : "Your OpenAI or compatible provider API key"}
                </p>
              </div>
              <div className={styles.apiKeyWrapper}>
                <input
                  type={showApiKey ? "text" : "password"}
                  className={styles.inputWide}
                  placeholder={
                    settings.ai?.provider === "gemini"
                      ? "AIza..."
                      : settings.ai?.provider === "anthropic"
                        ? "sk-ant-..."
                        : "sk-..."
                  }
                  value={aiApiKey}
                  onChange={(e) => setAiApiKey(e.target.value)}
                />
                <button
                  type="button"
                  className={styles.eyeToggle}
                  onClick={() => setShowApiKey((v) => !v)}
                  title={showApiKey ? "Hide API key" : "Show API key"}
                >
                  {showApiKey ? "🙈" : "👁"}
                </button>
              </div>
            </div>

            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <h3>Test Connection</h3>
                <p>Verify your API key and model are working</p>
              </div>
              <div className={styles.testConnWrapper}>
                <button
                  type="button"
                  className={styles.testConnBtn}
                  onClick={() => void testAiConnection()}
                  disabled={testConnStatus === "loading"}
                >
                  {testConnStatus === "loading"
                    ? "Testing…"
                    : "Test Connection"}
                </button>
                {testConnStatus !== "idle" && testConnStatus !== "loading" && (
                  <span
                    className={
                      testConnStatus === "ok"
                        ? styles.testConnOk
                        : styles.testConnError
                    }
                  >
                    {testConnStatus === "ok" ? "✓" : "✗"} {testConnMsg}
                  </span>
                )}
              </div>
            </div>

            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <h3>Save AI Credentials</h3>
                <p>
                  API key, model, and base URL are only saved when you click
                  here
                </p>
              </div>
              <Button
                size="sm"
                variant="primary"
                onClick={() => void saveAiCredentials()}
                disabled={aiSaving}
              >
                {aiSaving ? "Saving…" : "Save AI Settings"}
              </Button>
            </div>

            {(settings.ai?.provider === "openai" ||
              settings.ai?.provider === "anthropic" ||
              settings.ai?.provider === "deepseek" ||
              settings.ai?.provider === "xai" ||
              settings.ai?.provider === "custom") && (
              <div className={styles.settingRow}>
                <div className={styles.settingInfo}>
                  <h3>Custom Base URL</h3>
                  <p>
                    {settings.ai?.provider === "anthropic" ? (
                      <>
                        Override Anthropic endpoint. Default:{" "}
                        <code>https://api.anthropic.com/v1</code>. Leave empty
                        for official API.
                      </>
                    ) : settings.ai?.provider === "deepseek" ? (
                      <>
                        Override DeepSeek endpoint. Default:{" "}
                        <code>https://api.deepseek.com/v1</code>. Leave empty
                        for official API.
                      </>
                    ) : settings.ai?.provider === "xai" ? (
                      <>
                        Override xAI endpoint. Default:{" "}
                        <code>https://api.x.ai/v1</code>. Leave empty for
                        official API.
                      </>
                    ) : (
                      <>
                        Override the API endpoint. Use for Ollama (
                        <code>http://localhost:11434/v1</code>), LM Studio, or
                        OpenAI-compatible proxies. Leave empty for official
                        OpenAI.
                      </>
                    )}
                  </p>
                </div>
                <input
                  type="text"
                  className={styles.inputWide}
                  placeholder={
                    settings.ai?.provider === "anthropic"
                      ? "https://api.anthropic.com/v1"
                      : settings.ai?.provider === "deepseek"
                        ? "https://api.deepseek.com/v1"
                        : settings.ai?.provider === "xai"
                          ? "https://api.x.ai/v1"
                          : "https://api.openai.com/v1"
                  }
                  value={aiBaseUrl}
                  onChange={(e) => setAiBaseUrl(e.target.value)}
                />
              </div>
            )}

            <div className={styles.settingRow}>
              <div className={styles.settingInfo}>
                <h3>Model</h3>
                <p>
                  {settings.ai?.provider === "gemini" ? (
                    <>
                      Stable: <code>gemini-2.5-flash</code>,{" "}
                      <code>gemini-2.5-pro</code>, <code>gemini-2.0-flash</code>
                      .
                    </>
                  ) : settings.ai?.provider === "anthropic" ? (
                    <>
                      Fast: <code>claude-3-5-haiku-20241022</code>. Balanced:{" "}
                      <code>claude-3-5-sonnet-20241022</code>. Powerful:{" "}
                      <code>claude-opus-4-5</code>.
                    </>
                  ) : settings.ai?.provider === "deepseek" ? (
                    <>
                      Fast: <code>deepseek-chat</code>. Reasoning:{" "}
                      <code>deepseek-reasoner</code>.
                    </>
                  ) : settings.ai?.provider === "xai" ? (
                    <>
                      Fast: <code>grok-3-mini</code>. Powerful:{" "}
                      <code>grok-3</code>, <code>grok-2-1212</code>.
                    </>
                  ) : (
                    <>
                      OpenAI: <code>gpt-4o</code>, <code>gpt-4o-mini</code>,{" "}
                      <code>o3-mini</code>. Ollama: <code>llama3.2</code>,{" "}
                      <code>mistral</code>.
                    </>
                  )}
                </p>
              </div>
              <input
                list="ai-model-suggestions"
                type="text"
                className={styles.inputWide}
                placeholder={
                  settings.ai?.provider === "gemini"
                    ? "gemini-2.5-flash"
                    : settings.ai?.provider === "anthropic"
                      ? "claude-3-5-haiku-20241022"
                      : settings.ai?.provider === "deepseek"
                        ? "deepseek-chat"
                        : settings.ai?.provider === "xai"
                          ? "grok-3-mini"
                          : "gpt-4o-mini"
                }
                value={aiModel}
                onChange={(e) => setAiModel(e.target.value)}
              />
              <datalist id="ai-model-suggestions">
                {settings.ai?.provider === "gemini" && (
                  <>
                    <option value="gemini-2.5-flash" />
                    <option value="gemini-2.5-pro" />
                    <option value="gemini-2.0-flash" />
                    <option value="gemini-2.0-flash-lite" />
                    <option value="gemini-1.5-flash" />
                    <option value="gemini-1.5-pro" />
                  </>
                )}
                {settings.ai?.provider === "anthropic" && (
                  <>
                    <option value="claude-3-5-haiku-20241022" />
                    <option value="claude-3-5-sonnet-20241022" />
                    <option value="claude-3-opus-20240229" />
                    <option value="claude-opus-4-5" />
                    <option value="claude-sonnet-4-5" />
                    <option value="claude-haiku-4-5" />
                  </>
                )}
                {settings.ai?.provider === "deepseek" && (
                  <>
                    <option value="deepseek-chat" />
                    <option value="deepseek-reasoner" />
                  </>
                )}
                {settings.ai?.provider === "xai" && (
                  <>
                    <option value="grok-3-mini" />
                    <option value="grok-3" />
                    <option value="grok-2-1212" />
                    <option value="grok-2-vision-1212" />
                  </>
                )}
                {(settings.ai?.provider === "openai" ||
                  settings.ai?.provider === "custom") && (
                  <>
                    <option value="gpt-4o" />
                    <option value="gpt-4o-mini" />
                    <option value="gpt-4-turbo" />
                    <option value="o3-mini" />
                    <option value="o1-mini" />
                    <option value="llama3.2" />
                    <option value="mistral" />
                    <option value="qwen2.5" />
                  </>
                )}
              </datalist>
            </div>
          </>
        )}
      </div>

      {/* ── App Filter (E no.19) ───────────────────────────────────────── */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>App Filter</h2>
        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Filter mode</h3>
            <p>Control which apps trigger SmartPasteHub auto-clean</p>
          </div>
          <select
            className={styles.input}
            value={settings.appFilter?.mode ?? "off"}
            onChange={(e) => updateSetting("appFilter.mode", e.target.value)}
          >
            <option value="off">Off (all apps)</option>
            <option value="whitelist">Whitelist (only listed apps)</option>
            <option value="blacklist">Blacklist (exclude listed apps)</option>
          </select>
        </div>
        {(settings.appFilter?.mode === "whitelist" ||
          settings.appFilter?.mode === "blacklist") && (
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <h3>App names</h3>
              <p>
                Comma-separated app name patterns (e.g. chrome,slack,notion)
              </p>
            </div>
            <input
              type="text"
              className={styles.inputWide}
              placeholder="chrome,slack,notion"
              value={(settings.appFilter?.apps ?? []).join(",")}
              onChange={(e) =>
                updateSetting(
                  "appFilter.apps",
                  e.target.value
                    .split(",")
                    .map((s) => s.trim().toLowerCase())
                    .filter(Boolean),
                )
              }
            />
          </div>
        )}
      </div>

      {/* ── App Profiles (Smart Paste per App) ───────────────────────── */}
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Smart Paste Profiles per App</h2>
        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Per-app clean profiles</h3>
            <p>Set a default clean mode and auto-translate for specific apps</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <input
              type="text"
              className={styles.input}
              placeholder="App name (e.g. slack)"
              value={newProfileAppName}
              onChange={(e) => setNewProfileAppName(e.target.value)}
            />
            <Button
              size="sm"
              variant="primary"
              onClick={async () => {
                if (!newProfileAppName.trim()) return;
                try {
                  const updated = await invokeIPC<typeof appProfiles>(
                    "settings:set-app-profile",
                    { appName: newProfileAppName.trim(), cleanMode: "default" },
                  );
                  setAppProfiles(updated);
                  setNewProfileAppName("");
                  addToast({ title: "Profile added", type: "success" });
                } catch (err) {
                  addToast({
                    title: "Failed",
                    message: String(err),
                    type: "error",
                  });
                }
              }}
            >
              + Add
            </Button>
          </div>
        </div>
        {appProfiles.length > 0 && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 8,
              marginTop: 8,
            }}
          >
            {appProfiles.map((profile) => (
              <div
                key={profile.appName}
                className={styles.settingRow}
                style={{ padding: "6px 0" }}
              >
                <div className={styles.settingInfo}>
                  <h3 style={{ margin: 0, fontSize: "0.8rem" }}>
                    {profile.appName}
                  </h3>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <select
                    className={styles.input}
                    value={profile.cleanMode}
                    onChange={async (e) => {
                      try {
                        const updated = await invokeIPC<typeof appProfiles>(
                          "settings:set-app-profile",
                          {
                            appName: profile.appName,
                            cleanMode: e.target.value,
                            autoTranslate: profile.autoTranslate,
                            targetLang: profile.targetLang,
                          },
                        );
                        setAppProfiles(updated);
                      } catch {
                        /* ignore */
                      }
                    }}
                  >
                    <option value="default">Default</option>
                    <option value="plain">Plain</option>
                    <option value="code">Code</option>
                    <option value="email">Email</option>
                    <option value="doc">Doc</option>
                  </select>
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: "0.75rem",
                      color: "var(--text-secondary)",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={profile.autoTranslate ?? false}
                      onChange={async (e) => {
                        try {
                          const updated = await invokeIPC<typeof appProfiles>(
                            "settings:set-app-profile",
                            {
                              appName: profile.appName,
                              cleanMode: profile.cleanMode,
                              autoTranslate: e.target.checked,
                              targetLang: profile.targetLang ?? "en",
                            },
                          );
                          setAppProfiles(updated);
                        } catch {
                          /* ignore */
                        }
                      }}
                    />
                    Auto-translate
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>About</h2>
        <div className={styles.aboutCard}>
          <div className={styles.logo}>📋✨</div>
          <div className={styles.aboutInfo}>
            <h3>SmartPasteHub</h3>
            <p>Your intelligent clipboard assistant.</p>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Automation Engine</h2>
        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Universal Paste Fallback</h3>
            <p>
              Ctrl+V -&gt; Shift+Insert -&gt; simulated typing chain per app
            </p>
          </div>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={settings.automation?.enableUniversalFallback ?? true}
              onChange={(e) =>
                updateSetting(
                  "automation.enableUniversalFallback",
                  e.target.checked,
                )
              }
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Paste Preview + Hold to Confirm</h3>
            <p>First press previews, second press confirms paste</p>
          </div>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={settings.automation?.enablePastePreview ?? true}
              onChange={(e) =>
                updateSetting("automation.enablePastePreview", e.target.checked)
              }
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Command Palette</h3>
            <p>Cycle presets quickly with command palette hotkey</p>
          </div>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={settings.automation?.enableCommandPalette ?? true}
              onChange={(e) =>
                updateSetting(
                  "automation.enableCommandPalette",
                  e.target.checked,
                )
              }
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Undo Last Paste</h3>
            <p>Restore previous clipboard paste with global shortcut</p>
          </div>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={settings.automation?.enableUndo ?? true}
              onChange={(e) =>
                updateSetting("automation.enableUndo", e.target.checked)
              }
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Trust Mode Default</h3>
            <p>How aggressive automation behaves by default</p>
          </div>
          <select
            className={styles.input}
            value={settings.automation?.trustModeDefault ?? "balanced"}
            onChange={(e) =>
              updateSetting("automation.trustModeDefault", e.target.value)
            }
          >
            <option value="strict">Strict</option>
            <option value="balanced">Balanced</option>
            <option value="passthrough">Passthrough</option>
          </select>
        </div>

        <div className={styles.settingRowFull}>
          <div className={styles.settingInfo}>
            <h3>Per-app Trust Mode</h3>
            <p>Override trust behavior for specific target apps</p>
          </div>
          <div className={styles.inlineGroup}>
            <input
              className={styles.input}
              type="text"
              placeholder="App name (e.g. slack)"
              value={trustModeAppName}
              onChange={(e) => setTrustModeAppName(e.target.value)}
            />
            <select
              className={styles.input}
              value={trustModeValue}
              onChange={(e) =>
                setTrustModeValue(
                  e.target.value as "strict" | "balanced" | "passthrough",
                )
              }
            >
              <option value="strict">Strict</option>
              <option value="balanced">Balanced</option>
              <option value="passthrough">Passthrough</option>
            </select>
            <Button
              size="sm"
              variant="secondary"
              onClick={async () => {
                if (!trustModeAppName.trim()) return;
                try {
                  await invokeIPC("settings:set-trust-mode", {
                    appName: trustModeAppName.trim(),
                    mode: trustModeValue,
                  });
                  addToast({ title: "Trust mode saved", type: "success" });
                  setTrustModeAppName("");
                } catch (err) {
                  addToast({
                    title: "Failed to save trust mode",
                    message: String(err),
                    type: "error",
                  });
                }
              }}
            >
              Save
            </Button>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Privacy + Portability</h2>
        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Ephemeral Sensitive Clips</h3>
            <p>Auto-clear sensitive clipboard entries after TTL</p>
          </div>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={settings.privacy?.enableEphemeralSensitiveClips ?? true}
              onChange={(e) =>
                updateSetting(
                  "privacy.enableEphemeralSensitiveClips",
                  e.target.checked,
                )
              }
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Privacy Firewall</h3>
            <p>Mask likely secret tokens before paste/history write</p>
          </div>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={settings.privacy?.enablePrivacyFirewall ?? true}
              onChange={(e) =>
                updateSetting("privacy.enablePrivacyFirewall", e.target.checked)
              }
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.settingRowFull}>
          <div className={styles.settingInfo}>
            <h3>Portable Export / Import</h3>
            <p>Sync-less encrypted transfer of local settings</p>
          </div>
          <input
            className={styles.inputWide}
            type="password"
            placeholder="Portable passphrase"
            value={portablePassphrase}
            onChange={(e) => setPortablePassphrase(e.target.value)}
          />
          <textarea
            className={styles.textarea}
            placeholder="Portable settings payload (paste here to import, or exported data will appear here)"
            value={portablePayload}
            onChange={(e) => setPortablePayload(e.target.value)}
          />
          <div className={styles.buttonGroup}>
            <Button size="sm" variant="secondary" onClick={exportPortable}>
              Export
            </Button>
            <Button size="sm" variant="primary" onClick={importPortable}>
              Import
            </Button>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>Diagnostics + Timeline</h2>
        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>Observability</h3>
            <p>Recent transform, fallback, recipe, and learning events</p>
          </div>
          <Button size="sm" variant="secondary" onClick={loadDiagnostics}>
            Refresh
          </Button>
        </div>
        {diagnosticEvents.length > 0 && (
          <div className={styles.settingRowFull}>
            <p className={styles.hint}>Recent events</p>
            {diagnosticEvents.slice(0, 10).map((event) => (
              <div
                key={`${event.ts}-${event.detail}`}
                className={styles.subItem}
              >
                <span className={styles.eventTag} data-kind={event.kind}>
                  {event.kind}
                </span>
                <div className={styles.subItemInfo}>
                  <h4>{event.detail}</h4>
                  <p>
                    {new Date(event.ts).toLocaleTimeString()}
                    {event.app ? ` · ${event.app}` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        {timelineClusters.length > 0 && (
          <div className={styles.settingRowFull}>
            <p className={styles.hint}>Session clusters</p>
            {timelineClusters.slice(0, 8).map((cluster) => (
              <div key={cluster.id} className={styles.subItem}>
                <div className={styles.subItemInfo}>
                  <h4>
                    {cluster.items} items ·{" "}
                    {cluster.topSourceApp ?? "unknown app"}
                  </h4>
                  <p>
                    {cluster.startedAt} &mdash; {cluster.endedAt}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
        {fallbackMethods.length > 0 && (
          <div className={styles.settingRowFull}>
            <p className={styles.hint}>Per-app paste fallback methods</p>
            {fallbackMethods.slice(0, 12).map((entry) => (
              <div
                key={`${entry.app}-${entry.method}`}
                className={styles.subItem}
              >
                <div className={styles.subItemInfo}>
                  <h4>{entry.app}</h4>
                  <p>Preferred fallback: {entry.method}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
