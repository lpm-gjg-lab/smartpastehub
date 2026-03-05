import React from "react";
import { useTranslation } from "react-i18next";
import styles from "../../styles/pages/SettingsPage.module.css";
import { Button } from "../Button";
import type { AppSettings } from "../../../shared/types";

interface AiUsageStats {
  totalRequests: number;
  totalTokens: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  byModel: Record<string, { requests: number; tokens: number }>;
  byMode: Record<string, { requests: number; tokens: number }>;
}

interface AiSettingsProps {
  settings: AppSettings;
  showApiKey: boolean;
  setShowApiKey: React.Dispatch<React.SetStateAction<boolean>>;
  testConnStatus: "idle" | "loading" | "ok" | "error";
  testConnMsg: string;
  testAiConnection: () => Promise<void>;
  aiApiKey: string;
  setAiApiKey: React.Dispatch<React.SetStateAction<string>>;
  aiModel: string;
  setAiModel: React.Dispatch<React.SetStateAction<string>>;
  aiBaseUrl: string;
  setAiBaseUrl: React.Dispatch<React.SetStateAction<string>>;
  aiSaving: boolean;
  saveAiCredentials: () => Promise<void>;
  aiUsageStats: AiUsageStats | null;
  bridgeAvailable: boolean;
  loadAiUsage: () => Promise<void>;
  clearAiUsage: () => Promise<void>;
  updateSetting: (path: string, value: unknown) => Promise<void>;
}

export const AiSettings: React.FC<AiSettingsProps> = ({
  settings,
  showApiKey,
  setShowApiKey,
  testConnStatus,
  testConnMsg,
  testAiConnection,
  aiApiKey,
  setAiApiKey,
  aiModel,
  setAiModel,
  aiBaseUrl,
  setAiBaseUrl,
  aiSaving,
  saveAiCredentials,
  aiUsageStats,
  bridgeAvailable,
  loadAiUsage,
  clearAiUsage,
  updateSetting,
}) => {
  const { t } = useTranslation();

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>{t("settings.ai_settings")}</h2>

      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <h3>{t("settings.enable_ai_features")}</h3>
          <p>
            {t("settings.enable_ai_features_desc")}
          </p>
        </div>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={settings.ai?.enabled || false}
            disabled={settings.ai?.provider === "local"}
            onChange={(e) => void updateSetting("ai.enabled", e.target.checked)}
          />
          <span className={styles.slider}></span>
        </label>
      </div>
      {settings.ai?.provider === "local" && (
        <p className={styles.hint}>
          {t("settings.switch_to_cloud_provider")}
        </p>
      )}

      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <h3>{t("settings.provider")}</h3>
          <p>{t("settings.which_ai_backend")}</p>
        </div>
        <select
          className={styles.input}
          value={settings.ai?.provider || "local"}
          onChange={(e) => void updateSetting("ai.provider", e.target.value)}
        >
          <option value="local">{t("settings.local_no_ai")}</option>
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
          <h3>{t("settings.ai_mode")}</h3>
          <p>
            {t("settings.ai_mode_desc")}
          </p>
        </div>
        <select
          className={styles.input}
          value={settings.ai?.aiMode || "auto"}
          onChange={(e) => void updateSetting("ai.aiMode", e.target.value)}
          disabled={settings.ai?.provider === "local" || !settings.ai?.enabled}
        >
          <option value="auto">{t("settings.auto_detect")}</option>
          <option value="fix_grammar">{t("settings.fix_grammar")}</option>
          <option value="rephrase">{t("settings.rephrase")}</option>
          <option value="summarize">{t("settings.summarize")}</option>
          <option value="formalize">{t("settings.formalize")}</option>
        </select>
      </div>

      {settings.ai?.provider !== "local" && (
        <>
          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <h3>{t("settings.api_key")}</h3>
              <p>{t("settings.your_provider_api_key")}</p>
            </div>
            <div className={styles.apiKeyWrapper}>
              <input
                type={showApiKey ? "text" : "password"}
                className={styles.inputWide}
                placeholder="sk-..."
                value={aiApiKey}
                onChange={(e) => setAiApiKey(e.target.value)}
              />
              <button
                type="button"
                className={styles.eyeToggle}
                onClick={() => setShowApiKey((v) => !v)}
                title={showApiKey ? t("settings.hide_api_key") : t("settings.show_api_key")}
              >
                {showApiKey ? "🙈" : "👁"}
              </button>
            </div>
          </div>

          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <h3>{t("settings.custom_base_url")}</h3>
              <p>{t("settings.override_endpoint")}</p>
            </div>
            <input
              type="text"
              className={styles.inputWide}
              placeholder="https://api.openai.com/v1"
              value={aiBaseUrl}
              onChange={(e) => setAiBaseUrl(e.target.value)}
            />
          </div>

          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <h3>{t("settings.model")}</h3>
              <p>{t("settings.choose_model_name")}</p>
            </div>
            <input
              list="ai-model-suggestions"
              type="text"
              className={styles.inputWide}
              placeholder="gpt-4o-mini"
              value={aiModel}
              onChange={(e) => setAiModel(e.target.value)}
            />
          </div>

          <div className={styles.settingRow}>
            <div className={styles.settingInfo}>
              <h3>{t("settings.test_connection")}</h3>
              <p>{t("settings.verify_api_key_model")}</p>
            </div>
            <div className={styles.testConnWrapper}>
              <button
                type="button"
                className={styles.testConnBtn}
                onClick={() => void testAiConnection()}
                disabled={testConnStatus === "loading"}
              >
                {testConnStatus === "loading" ? t("settings.testing") : t("settings.test_connection")}
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
              <h3>{t("settings.save_ai_credentials")}</h3>
              <p>
                {t("settings.save_ai_credentials_desc")}
              </p>
            </div>
            <Button
              size="sm"
              variant="primary"
              onClick={() => void saveAiCredentials()}
              disabled={aiSaving}
            >
              {aiSaving ? t("settings.saving") : t("settings.save_ai_settings")}
            </Button>
          </div>

          <div
            className={styles.settingRowFull}
            style={{ flexDirection: "column", gap: 0 }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 8,
              }}
            >
              <div className={styles.settingInfo} style={{ marginBottom: 0 }}>
                <h3>📊 {t("settings.token_usage")}</h3>
                <p>
                  {t("settings.token_usage_desc")}
                </p>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                <button
                  type="button"
                  style={{
                    fontSize: "0.72rem",
                    background: "none",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    padding: "2px 8px",
                    cursor: "pointer",
                    color: "var(--text-secondary)",
                  }}
                  onClick={() => void loadAiUsage()}
                >
                  🔄 {t("settings.refresh")}
                </button>
                <button
                  type="button"
                  style={{
                    fontSize: "0.72rem",
                    background: "none",
                    border: "1px solid var(--border)",
                    borderRadius: 4,
                    padding: "2px 8px",
                    cursor: "pointer",
                    color: "var(--danger, #e53935)",
                  }}
                  onClick={() => void clearAiUsage()}
                >
                  🗑 {t("settings.reset")}
                </button>
              </div>
            </div>
            {aiUsageStats ? (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
                  gap: 8,
                }}
              >
                {[
                  {
                    label: t("settings.total_request"),
                    value: aiUsageStats.totalRequests.toLocaleString(),
                    icon: "🔁",
                  },
                  {
                    label: t("settings.input_token"),
                    value: aiUsageStats.totalPromptTokens.toLocaleString(),
                    icon: "📥",
                  },
                  {
                    label: t("settings.output_token"),
                    value: aiUsageStats.totalCompletionTokens.toLocaleString(),
                    icon: "📤",
                  },
                  {
                    label: t("settings.total_token"),
                    value: aiUsageStats.totalTokens.toLocaleString(),
                    icon: "🪙",
                  },
                ].map(({ label, value, icon }) => (
                  <div
                    key={label}
                    style={{
                      background: "var(--bg-secondary, rgba(255,255,255,0.05))",
                      borderRadius: 8,
                      padding: "10px 12px",
                      border: "1px solid var(--border)",
                    }}
                  >
                    <div style={{ fontSize: "1.2rem" }}>{icon}</div>
                    <div
                      style={{
                        fontSize: "1.1rem",
                        fontWeight: 700,
                        color: "var(--text-primary)",
                      }}
                    >
                      {value}
                    </div>
                    <div
                      style={{
                        fontSize: "0.68rem",
                        color: "var(--text-secondary)",
                      }}
                    >
                      {label}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div
                style={{
                  fontSize: "0.8rem",
                  color: "var(--text-secondary)",
                  padding: "6px 0",
                }}
              >
                {bridgeAvailable
                  ? t("settings.no_usage_data")
                  : t("settings.desktop_only")}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
