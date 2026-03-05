import React, { useRef, useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import styles from "../../styles/pages/SettingsPage.module.css";
import { Button } from "../Button";
import type { AppSettings } from "../../../shared/types";

interface AppOption {
  label: string;
  value: string;
}

interface PresetOption {
  label: string;
  value: string;
}

/* ── AppCombobox: input with visible dropdown of running/common apps ── */
interface AppComboboxProps {
  placeholder: string;
  value: string;
  onChange: (displayValue: string, resolvedValue: string) => void;
  runningApps: Array<{ name: string; processName: string }>;
  commonApps: AppOption[];
  datalistId: string;
}

const AppCombobox: React.FC<AppComboboxProps> = ({
  placeholder,
  value,
  onChange,
  runningApps,
  commonApps,
  datalistId,
}) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, handleClickOutside]);

  const options =
    runningApps.length > 0
      ? runningApps.map((a) => ({
        label: a.name,
        value: a.processName,
        sub: a.processName,
      }))
      : commonApps.map((a) => ({ label: a.label, value: a.value, sub: "" }));

  return (
    <div className={styles.comboboxWrapper} ref={wrapperRef}>
      <input
        className={styles.input}
        placeholder={placeholder}
        value={value}
        onChange={(e) => {
          const matchRunning = runningApps.find(
            (a) => a.name === e.target.value,
          );
          const matchCommon = commonApps.find(
            (a) => a.label === e.target.value || a.value === e.target.value,
          );
          onChange(
            e.target.value,
            matchRunning
              ? matchRunning.processName
              : matchCommon
                ? matchCommon.value
                : e.target.value,
          );
        }}
        onFocus={() => setOpen(true)}
      />
      <button
        type="button"
        className={styles.comboboxToggle}
        tabIndex={-1}
        onClick={() => setOpen((prev) => !prev)}
        aria-label="Toggle app list"
      >
        {open ? "▲" : "▼"}
      </button>
      {open && (
        <div className={styles.comboboxDropdown}>
          {options.map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={styles.comboboxOption}
              onClick={() => {
                onChange(opt.label, opt.value);
                setOpen(false);
              }}
            >
              {opt.label}
              {opt.sub ? (
                <span className={styles.comboboxOptionSub}>{opt.sub}</span>
              ) : null}
            </button>
          ))}
          {options.length === 0 && (
            <span
              className={styles.comboboxOption}
              style={{ color: "var(--text-tertiary)", cursor: "default" }}
            >
              No apps detected
            </span>
          )}
        </div>
      )}
    </div>
  );
};

interface AutomationSettingsProps {
  settings: AppSettings;
  runningApps: Array<{ name: string; processName: string }>;
  loadingApps: boolean;
  loadRunningApps: () => Promise<void>;
  recipeSource: string;
  setRecipeSource: React.Dispatch<React.SetStateAction<string>>;
  recipeTarget: string;
  setRecipeTarget: React.Dispatch<React.SetStateAction<string>>;
  recipePreset: string;
  setRecipePreset: React.Dispatch<React.SetStateAction<string>>;
  recipeSourceInput: string;
  setRecipeSourceInput: React.Dispatch<React.SetStateAction<string>>;
  recipeTargetInput: string;
  setRecipeTargetInput: React.Dispatch<React.SetStateAction<string>>;
  appProfiles: Array<{
    appName: string;
    cleanMode: "plain" | "code" | "email" | "doc" | "default";
    autoTranslate?: boolean;
    targetLang?: "id" | "en";
  }>;
  setAppProfiles: React.Dispatch<
    React.SetStateAction<
      Array<{
        appName: string;
        cleanMode: "plain" | "code" | "email" | "doc" | "default";
        autoTranslate?: boolean;
        targetLang?: "id" | "en";
      }>
    >
  >;
  newProfileAppName: string;
  setNewProfileAppName: React.Dispatch<React.SetStateAction<string>>;
  trustModeAppName: string;
  setTrustModeAppName: React.Dispatch<React.SetStateAction<string>>;
  trustModeValue: "strict" | "balanced" | "passthrough";
  setTrustModeValue: React.Dispatch<
    React.SetStateAction<"strict" | "balanced" | "passthrough">
  >;
  diagnosticEvents: Array<{
    ts: string;
    kind: string;
    detail: string;
    app?: string;
  }>;
  timelineClusters: Array<{
    id: string;
    startedAt: string;
    endedAt: string;
    items: number;
    topSourceApp?: string;
    topContentType?: string;
  }>;
  fallbackMethods: Array<{ app: string; method: string }>;
  loadDiagnostics: () => Promise<void>;
  commonApps: AppOption[];
  presetOptions: PresetOption[];
  updateSetting: (path: string, value: unknown) => Promise<void>;
  invokeSetAppProfile: (payload: {
    appName: string;
    cleanMode: string;
    autoTranslate?: boolean;
    targetLang?: "id" | "en";
  }) => Promise<void>;
  invokeSetTrustMode: (payload: {
    appName: string;
    mode: string;
  }) => Promise<void>;
}

export const AutomationSettings: React.FC<AutomationSettingsProps> = ({
  settings,
  runningApps,
  loadingApps,
  loadRunningApps,
  recipeSource,
  setRecipeSource,
  recipeTarget,
  setRecipeTarget,
  recipePreset,
  setRecipePreset,
  recipeSourceInput,
  setRecipeSourceInput,
  recipeTargetInput,
  setRecipeTargetInput,
  appProfiles,
  setAppProfiles,
  newProfileAppName,
  setNewProfileAppName,
  trustModeAppName,
  setTrustModeAppName,
  trustModeValue,
  setTrustModeValue,
  diagnosticEvents,
  timelineClusters,
  fallbackMethods,
  loadDiagnostics,
  commonApps,
  presetOptions,
  updateSetting,
  invokeSetAppProfile,
  invokeSetTrustMode,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          {t("settings.automation_context_recipes")}
        </h2>
        <div className={styles.settingRowFull}>
          <div className={styles.settingInfo}>
            <h3>{t("settings.source_target_recipes")}</h3>
            <p>
              {t("settings.source_target_recipes_desc")}{" "}
              <button
                type="button"
                style={{
                  fontSize: "0.72rem",
                  background: "none",
                  border: "1px solid var(--border)",
                  borderRadius: 4,
                  padding: "1px 6px",
                  cursor: "pointer",
                  color: "var(--text-secondary)",
                }}
                onClick={() => void loadRunningApps()}
                disabled={loadingApps}
              >
                {loadingApps
                  ? t("settings.loading_apps")
                  : runningApps.length > 0
                    ? t("settings.apps_detected", { count: runningApps.length })
                    : t("settings.detect_running_apps")}
              </button>
            </p>
          </div>
          <div className={styles.inlineGroup}>
            <AppCombobox
              placeholder={t("settings.source_app")}
              value={recipeSourceInput}
              onChange={(display, resolved) => {
                setRecipeSourceInput(display);
                setRecipeSource(resolved);
              }}
              runningApps={runningApps}
              commonApps={commonApps}
              datalistId="recipe-source-apps"
            />
            <AppCombobox
              placeholder={t("settings.target_app")}
              value={recipeTargetInput}
              onChange={(display, resolved) => {
                setRecipeTargetInput(display);
                setRecipeTarget(resolved);
              }}
              runningApps={runningApps}
              commonApps={commonApps}
              datalistId="recipe-target-apps"
            />
            <select
              className={styles.input}
              value={recipePreset}
              onChange={(e) => setRecipePreset(e.target.value)}
            >
              {presetOptions.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => {
                const src =
                  recipeSourceInput === "(semua aplikasi)"
                    ? undefined
                    : recipeSource || undefined;
                const tgt =
                  recipeTargetInput === "(semua aplikasi)"
                    ? undefined
                    : recipeTarget || undefined;
                const recipe = {
                  id: `recipe-${Date.now()}`,
                  sourceApp: src,
                  targetApp: tgt,
                  preset: recipePreset || "keepStructure",
                  enabled: true,
                };
                const next = [...(settings.recipes ?? []), recipe];
                void updateSetting("recipes", next);
                setRecipeSource("");
                setRecipeSourceInput("");
                setRecipeTarget("");
                setRecipeTargetInput("");
                setRecipePreset("keepStructure");
              }}
            >
              {t("settings.add")}
            </Button>
          </div>

          {(settings.recipes ?? []).slice(0, 6).map((recipe) => (
            <div key={recipe.id} className={styles.subItem}>
              <div className={styles.subItemInfo}>
                <h4>
                  {commonApps.find((a) => a.value === recipe.sourceApp)
                    ?.label ??
                    recipe.sourceApp ??
                    t("settings.all_apps")}
                  {" → "}
                  {commonApps.find((a) => a.value === recipe.targetApp)
                    ?.label ??
                    recipe.targetApp ??
                    t("settings.all_apps")}
                </h4>
                <p>
                  {presetOptions.find((p) => p.value === recipe.preset)
                    ?.label ?? recipe.preset}
                </p>
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
                {t("settings.remove")}
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          {t("settings.automation_engine")}
        </h2>
        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>{t("settings.universal_paste_fallback")}</h3>
            <p>{t("settings.universal_paste_fallback_desc")}</p>
          </div>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={settings.automation?.enableUniversalFallback ?? true}
              onChange={(e) =>
                void updateSetting(
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
            <h3>{t("settings.paste_preview_hold")}</h3>
            <p>{t("settings.paste_preview_hold_desc")}</p>
          </div>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={settings.automation?.enablePastePreview ?? true}
              onChange={(e) =>
                void updateSetting(
                  "automation.enablePastePreview",
                  e.target.checked,
                )
              }
            />
            <span className={styles.slider}></span>
          </label>
        </div>
        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>{t("settings.command_palette")}</h3>
            <p>{t("settings.command_palette_desc")}</p>
          </div>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={settings.automation?.enableCommandPalette ?? true}
              onChange={(e) =>
                void updateSetting(
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
            <h3>{t("settings.undo_last_paste")}</h3>
            <p>{t("settings.undo_last_paste_desc")}</p>
          </div>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={settings.automation?.enableUndo ?? true}
              onChange={(e) =>
                void updateSetting("automation.enableUndo", e.target.checked)
              }
            />
            <span className={styles.slider}></span>
          </label>
        </div>
        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>{t("settings.trust_mode_default")}</h3>
            <p>{t("settings.trust_mode_default_desc")}</p>
          </div>
          <select
            className={styles.input}
            value={settings.automation?.trustModeDefault ?? "balanced"}
            onChange={(e) =>
              void updateSetting("automation.trustModeDefault", e.target.value)
            }
          >
            <option value="strict">{t("settings.strict")}</option>
            <option value="balanced">{t("settings.balanced")}</option>
            <option value="passthrough">{t("settings.passthrough")}</option>
          </select>
        </div>
        <div className={styles.settingRowFull}>
          <div className={styles.settingInfo}>
            <h3>{t("settings.per_app_trust_mode")}</h3>
            <p>{t("settings.per_app_trust_mode_desc")}</p>
          </div>
          <div className={styles.inlineGroup}>
            <AppCombobox
              placeholder={t("settings.select_or_type_app")}
              value={trustModeAppName}
              onChange={(_display, resolved) => setTrustModeAppName(resolved)}
              runningApps={runningApps}
              commonApps={commonApps}
              datalistId="trust-app-list"
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
              <option value="strict">{t("settings.strict")}</option>
              <option value="balanced">{t("settings.balanced")}</option>
              <option value="passthrough">{t("settings.passthrough")}</option>
            </select>
            <Button
              size="sm"
              variant="secondary"
              onClick={() =>
                void invokeSetTrustMode({
                  appName: trustModeAppName.trim(),
                  mode: trustModeValue,
                })
              }
            >
              {t("settings.save")}
            </Button>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          {t("settings.app_filter_profiles")}
        </h2>
        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>{t("settings.filter_mode")}</h3>
            <p>{t("settings.filter_mode_desc")}</p>
          </div>
          <select
            className={styles.input}
            value={settings.appFilter?.mode ?? "off"}
            onChange={(e) =>
              void updateSetting("appFilter.mode", e.target.value)
            }
          >
            <option value="off">{t("settings.off_all_apps")}</option>
            <option value="whitelist">{t("settings.whitelist")}</option>
            <option value="blacklist">{t("settings.blacklist")}</option>
          </select>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>{t("settings.per_app_clean_profiles")}</h3>
            <p>{t("settings.per_app_clean_profiles_desc")}</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <AppCombobox
              placeholder={t("settings.select_or_type_app")}
              value={newProfileAppName}
              onChange={(display) => setNewProfileAppName(display)}
              runningApps={runningApps}
              commonApps={commonApps}
              datalistId="profile-app-list"
            />
            <Button
              size="sm"
              variant="primary"
              onClick={() =>
                void invokeSetAppProfile({
                  appName: newProfileAppName.trim(),
                  cleanMode: "default",
                })
              }
            >
              {t("settings.add_profile")}
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
                    onChange={(e) =>
                      void invokeSetAppProfile({
                        appName: profile.appName,
                        cleanMode: e.target.value,
                        autoTranslate: profile.autoTranslate,
                        targetLang: profile.targetLang,
                      })
                    }
                  >
                    <option value="default">{t("settings.default")}</option>
                    <option value="plain">{t("settings.plain")}</option>
                    <option value="code">{t("settings.code")}</option>
                    <option value="email">{t("settings.email")}</option>
                    <option value="doc">{t("settings.doc")}</option>
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
                      onChange={(e) =>
                        void invokeSetAppProfile({
                          appName: profile.appName,
                          cleanMode: profile.cleanMode,
                          autoTranslate: e.target.checked,
                          targetLang: profile.targetLang ?? "en",
                        })
                      }
                    />
                    {t("settings.auto_translate")}
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>
          {t("settings.diagnostics_timeline")}
        </h2>
        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>{t("settings.observability")}</h3>
            <p>{t("settings.observability_desc")}</p>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void loadDiagnostics()}
          >
            {t("settings.refresh")}
          </Button>
        </div>

        {diagnosticEvents.length > 0 && (
          <div className={styles.settingRowFull}>
            <p className={styles.hint}>{t("settings.recent_events")}</p>
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
            <p className={styles.hint}>{t("settings.session_clusters")}</p>
            {timelineClusters.slice(0, 8).map((cluster) => (
              <div key={cluster.id} className={styles.subItem}>
                <div className={styles.subItemInfo}>
                  <h4>
                    {t("settings.items_count", { count: cluster.items })}
                    {" · "}
                    {cluster.topSourceApp ?? t("settings.unknown_app")}
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
            <p className={styles.hint}>
              {t("settings.per_app_paste_fallback")}
            </p>
            {fallbackMethods.slice(0, 12).map((entry) => (
              <div
                key={`${entry.app}-${entry.method}`}
                className={styles.subItem}
              >
                <div className={styles.subItemInfo}>
                  <h4>{entry.app}</h4>
                  <p>
                    {t("settings.preferred_fallback", { method: entry.method })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
};
