import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import pStyles from "../../styles/pages/PlaceholderPage.module.css";
import { hasSmartPasteBridge, invokeIPC } from "../../lib/ipc";
import { useToastStore } from "../../stores/useToastStore";

type AIProvider =
  | "local"
  | "openai"
  | "gemini"
  | "anthropic"
  | "deepseek"
  | "xai"
  | "custom";

interface SettingsEnvelope {
  ai: {
    enabled: boolean;
    provider: AIProvider;
    apiKey?: string;
    baseUrl?: string;
    model?: string;
    autoDetect: boolean;
  };
  ocr: { languages: string[]; autoClean: boolean };
}

export const AISettingsPage: React.FC = () => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const [settings, setSettings] = useState<SettingsEnvelope | null>(null);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [form, setForm] = useState({
    aiEnabled: true,
    provider: "local" as AIProvider,
    apiKey: "",
    baseUrl: "",
    model: "",
    autoDetect: true,
    ocrLanguages: "eng",
    ocrAutoClean: true,
  });

  useEffect(() => {
    if (!hasSmartPasteBridge()) return;
    invokeIPC<SettingsEnvelope>("settings:get")
      .then((s) => {
        setSettings(s);
        setForm({
          aiEnabled: s?.ai.enabled ?? true,
          provider: s?.ai.provider ?? "local",
          apiKey: s?.ai.apiKey ?? "",
          baseUrl: s?.ai.baseUrl ?? "",
          model: s?.ai.model ?? "",
          autoDetect: s?.ai.autoDetect ?? true,
          ocrLanguages: (s?.ocr.languages ?? ["eng"]).join(", "),
          ocrAutoClean: s?.ocr.autoClean ?? true,
        });
      })
      .catch((err) => {
        if (!hasSmartPasteBridge()) return;
        addToast({
          title: "Failed to load AI settings",
          message: err instanceof Error ? err.message : String(err),
          type: "error",
        });
      });
  }, [addToast]);

  const save = async () => {
    if (!hasSmartPasteBridge()) {
      addToast({
        title: "Not available in browser mode",
        message: "Run this page inside Electron desktop app.",
        type: "warning",
      });
      return;
    }
    try {
      await invokeIPC("settings:update", {
        ai: {
          enabled: form.aiEnabled,
          provider: form.provider,
          apiKey: form.apiKey || undefined,
          baseUrl: form.baseUrl || undefined,
          model: form.model || undefined,
          autoDetect: form.autoDetect,
        },
        ocr: {
          languages: form.ocrLanguages
            .split(",")
            .map((l) => l.trim())
            .filter(Boolean),
          autoClean: form.ocrAutoClean,
        },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      addToast({
        title: "Failed to save AI settings",
        message: err instanceof Error ? err.message : String(err),
        type: "error",
      });
    }
  };

  const testConnection = async () => {
    if (!hasSmartPasteBridge()) {
      setTestResult(t("placeholders.test_connection_desktop_only"));
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const res = await invokeIPC<{ ok: boolean; message: string }>(
        "ai:test-connection",
      );
      setTestResult(res.message);
    } catch (e) {
      setTestResult(
        (e as Error)?.message ?? t("placeholders.connection_failed"),
      );
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className={pStyles.page}>
      <div className={pStyles.header}>
        <h2 className={pStyles.title}>{t("placeholders.ai_ocr_title")}</h2>
      </div>

      <div className={pStyles.section}>
        <div className={pStyles.sectionTitle}>AI Rewriting</div>
        <div className={pStyles.rowHoriz}>
          <input
            type="checkbox"
            id="ai-enabled"
            checked={form.aiEnabled}
            onChange={(e) =>
              setForm((f) => ({ ...f, aiEnabled: e.target.checked }))
            }
          />
          <label htmlFor="ai-enabled" className={pStyles.rowLabel}>
            Enable AI rewriting
          </label>
        </div>

        <div className={pStyles.row}>
          <span className={pStyles.rowLabel}>Provider</span>
          <select
            className={pStyles.selectFull}
            value={form.provider}
            onChange={(e) =>
              setForm((f) => ({ ...f, provider: e.target.value as AIProvider }))
            }
            disabled={!form.aiEnabled}
          >
            <option value="local">Local (Ollama / custom endpoint)</option>
            <option value="openai">OpenAI</option>
            <option value="gemini">Google Gemini</option>
            <option value="anthropic">Anthropic Claude</option>
            <option value="deepseek">DeepSeek</option>
            <option value="xai">xAI Grok</option>
            <option value="custom">Custom / OpenAI-compatible endpoint</option>
          </select>
        </div>

        {(form.provider === "openai" ||
          form.provider === "anthropic" ||
          form.provider === "deepseek" ||
          form.provider === "xai" ||
          form.provider === "custom" ||
          form.provider === "gemini") && (
          <div className={pStyles.row}>
            <span className={pStyles.rowLabel}>API Key</span>
            <input
              className={pStyles.inputFull}
              type="password"
              value={form.apiKey}
              onChange={(e) =>
                setForm((f) => ({ ...f, apiKey: e.target.value }))
              }
              disabled={!form.aiEnabled}
            />
          </div>
        )}

        {(form.provider === "local" ||
          form.provider === "openai" ||
          form.provider === "anthropic" ||
          form.provider === "deepseek" ||
          form.provider === "xai" ||
          form.provider === "custom") && (
          <div className={pStyles.row}>
            <span className={pStyles.rowLabel}>Base URL</span>
            <input
              className={pStyles.inputFull}
              value={form.baseUrl}
              onChange={(e) =>
                setForm((f) => ({ ...f, baseUrl: e.target.value }))
              }
              disabled={!form.aiEnabled}
            />
          </div>
        )}

        <div className={pStyles.row}>
          <span className={pStyles.rowLabel}>Model</span>
          <input
            className={pStyles.inputFull}
            value={form.model}
            onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
            disabled={!form.aiEnabled}
          />
        </div>

        <div className={pStyles.rowHoriz}>
          <input
            type="checkbox"
            id="ai-autodetect"
            checked={form.autoDetect}
            onChange={(e) =>
              setForm((f) => ({ ...f, autoDetect: e.target.checked }))
            }
            disabled={!form.aiEnabled}
          />
          <label htmlFor="ai-autodetect" className={pStyles.rowLabel}>
            Auto-suggest AI actions based on content type
          </label>
        </div>

        {form.aiEnabled && (
          <div className={pStyles.rowHoriz} style={{ marginTop: 4 }}>
            <button
              type="button"
              className={pStyles.btnSecondary}
              onClick={testConnection}
              disabled={testing}
            >
              {testing ? t("settings.testing") : t("settings.test_connection")}
            </button>
            {testResult && (
              <span style={{ fontSize: "0.85rem" }}>{testResult}</span>
            )}
          </div>
        )}
      </div>

      <div className={pStyles.section}>
        <div className={pStyles.sectionTitle}>
          OCR (Optical Character Recognition)
        </div>
        <div className={pStyles.row}>
          <span className={pStyles.rowLabel}>
            Languages (comma-separated Tesseract codes)
          </span>
          <input
            className={pStyles.inputFull}
            value={form.ocrLanguages}
            placeholder="eng, ind"
            onChange={(e) =>
              setForm((f) => ({ ...f, ocrLanguages: e.target.value }))
            }
          />
        </div>
        <div className={pStyles.rowHoriz}>
          <input
            type="checkbox"
            id="ocr-autoclean"
            checked={form.ocrAutoClean}
            onChange={(e) =>
              setForm((f) => ({ ...f, ocrAutoClean: e.target.checked }))
            }
          />
          <label htmlFor="ocr-autoclean" className={pStyles.rowLabel}>
            Auto-clean OCR output
          </label>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <button type="button" className={pStyles.btnPrimary} onClick={save}>
          {saved ? t("placeholders.saved") : t("placeholders.save_settings")}
        </button>
      </div>

      {!settings && (
        <div
          style={{
            color: "var(--text-secondary)",
            fontSize: "0.82rem",
            marginTop: 8,
          }}
        >
          Loading settings...
        </div>
      )}
    </div>
  );
};
