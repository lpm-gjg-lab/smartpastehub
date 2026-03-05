import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { invokeIPC } from "../../lib/ipc";
import { useToastStore } from "../../stores/useToastStore";
import { Button } from "../Button";
import styles from "../../styles/pages/SettingsPage.module.css";

interface ContextRuleItem {
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

interface PresetOption {
  label: string;
  value: string;
}

interface ContextRulesSettingsProps {
  presetOptions: PresetOption[];
}

interface RuleDraft {
  name: string;
  sourceApp: string;
  targetApp: string;
  contentType: string;
  preset: string;
  transformsText: string;
  priority: number;
  enabled: boolean;
}

const CONTENT_TYPE_OPTIONS = [
  "",
  "plain_text",
  "source_code",
  "json_data",
  "yaml_data",
  "toml_data",
  "email_text",
  "html_table",
  "csv_table",
  "tsv_table",
  "md_text",
  "url_text",
  "phone_number",
  "pdf_text",
] as const;

function parseTransforms(input: string): string[] {
  return input
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function stringifyTransforms(values: string[]): string {
  return values.join(", ");
}

const createInitialDraft = (preset: string): RuleDraft => ({
  name: "",
  sourceApp: "",
  targetApp: "",
  contentType: "",
  preset,
  transformsText: "",
  priority: 0,
  enabled: true,
});

export const ContextRulesSettings: React.FC<ContextRulesSettingsProps> = ({
  presetOptions,
}) => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const defaultPreset = presetOptions[0]?.value ?? "keepStructure";

  const [rules, setRules] = useState<ContextRuleItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<RuleDraft>(
    createInitialDraft(defaultPreset),
  );

  const resetDraft = useCallback(() => {
    setDraft(createInitialDraft(defaultPreset));
    setEditingId(null);
  }, [defaultPreset]);

  const loadRules = useCallback(async () => {
    setLoading(true);
    try {
      const result = await invokeIPC<ContextRuleItem[]>(
        "settings:context-rules:list",
      );
      setRules(result ?? []);
    } catch (error) {
      addToast({
        title: t("settings.context_rules_failed_load"),
        message: String(error),
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  }, [addToast, t]);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  const handleSave = async () => {
    const name = draft.name.trim();
    if (!name) {
      addToast({
        title: t("settings.context_rules_name_required"),
        type: "warning",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name,
        sourceApp: draft.sourceApp.trim() || null,
        targetApp: draft.targetApp.trim() || null,
        contentType: draft.contentType.trim() || null,
        preset: draft.preset,
        transforms: parseTransforms(draft.transformsText),
        priority: Number(draft.priority) || 0,
        enabled: draft.enabled,
      };

      const channel = editingId
        ? "settings:context-rules:update"
        : "settings:context-rules:create";

      const result = await invokeIPC<ContextRuleItem[]>(
        channel,
        editingId ? { ...payload, id: editingId } : payload,
      );

      setRules(result ?? []);
      addToast({
        title: editingId
          ? t("settings.context_rules_updated")
          : t("settings.context_rules_created"),
        type: "success",
      });
      resetDraft();
    } catch (error) {
      addToast({
        title: t("settings.context_rules_failed_save"),
        message: String(error),
        type: "error",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (rule: ContextRuleItem) => {
    setEditingId(rule.id);
    setDraft({
      name: rule.name,
      sourceApp: rule.sourceApp ?? "",
      targetApp: rule.targetApp ?? "",
      contentType: rule.contentType ?? "",
      preset: rule.preset,
      transformsText: stringifyTransforms(rule.transforms),
      priority: rule.priority,
      enabled: rule.enabled,
    });
  };

  const handleDelete = async (rule: ContextRuleItem) => {
    const confirmed = window.confirm(
      t("settings.context_rules_delete_confirm", { name: rule.name }),
    );
    if (!confirmed) {
      return;
    }

    try {
      const result = await invokeIPC<ContextRuleItem[]>(
        "settings:context-rules:delete",
        {
          id: rule.id,
        },
      );
      setRules(result ?? []);
      if (editingId === rule.id) {
        resetDraft();
      }
      addToast({ title: t("settings.context_rules_deleted"), type: "success" });
    } catch (error) {
      addToast({
        title: t("settings.context_rules_failed_delete"),
        message: String(error),
        type: "error",
      });
    }
  };

  const handleToggleEnabled = async (rule: ContextRuleItem) => {
    try {
      const result = await invokeIPC<ContextRuleItem[]>(
        "settings:context-rules:update",
        {
          id: rule.id,
          name: rule.name,
          sourceApp: rule.sourceApp,
          targetApp: rule.targetApp,
          contentType: rule.contentType,
          preset: rule.preset,
          transforms: rule.transforms,
          priority: rule.priority,
          enabled: !rule.enabled,
        },
      );
      setRules(result ?? []);
    } catch (error) {
      addToast({
        title: t("settings.context_rules_failed_update"),
        message: String(error),
        type: "error",
      });
    }
  };

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>{t("settings.context_rules")}</h2>
      <div className={styles.settingRowFull}>
        <div className={styles.settingInfo}>
          <h3>{t("settings.context_rules_manage")}</h3>
          <p>{t("settings.context_rules_manage_desc")}</p>
        </div>

        <div className={styles.inlineGroup}>
          <input
            className={styles.input}
            value={draft.name}
            placeholder={t("settings.context_rules_name")}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, name: e.target.value }))
            }
          />
          <input
            className={styles.input}
            value={draft.sourceApp}
            placeholder={t("settings.context_rules_source_app")}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, sourceApp: e.target.value }))
            }
          />
          <input
            className={styles.input}
            value={draft.targetApp}
            placeholder={t("settings.context_rules_target_app")}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, targetApp: e.target.value }))
            }
          />
        </div>

        <div className={styles.inlineGroup}>
          <select
            className={styles.input}
            value={draft.contentType}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, contentType: e.target.value }))
            }
          >
            <option value="">
              {t("settings.context_rules_any_content_type")}
            </option>
            {CONTENT_TYPE_OPTIONS.filter(Boolean).map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>

          <select
            className={styles.input}
            value={draft.preset}
            onChange={(e) =>
              setDraft((prev) => ({ ...prev, preset: e.target.value }))
            }
          >
            {presetOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          <input
            className={styles.input}
            type="number"
            value={draft.priority}
            placeholder={t("settings.context_rules_priority")}
            onChange={(e) =>
              setDraft((prev) => ({
                ...prev,
                priority: Number(e.target.value || "0"),
              }))
            }
          />
        </div>

        <textarea
          className={styles.textarea}
          value={draft.transformsText}
          placeholder={t("settings.context_rules_transforms_placeholder")}
          onChange={(e) =>
            setDraft((prev) => ({ ...prev, transformsText: e.target.value }))
          }
        />

        <div className={styles.inlineGroup}>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={draft.enabled}
              onChange={(e) =>
                setDraft((prev) => ({ ...prev, enabled: e.target.checked }))
              }
            />
            <span className={styles.slider}></span>
          </label>
          <span className={styles.hint}>
            {t("settings.context_rules_enabled")}
          </span>

          <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
            {editingId
              ? t("settings.context_rules_update")
              : t("settings.context_rules_add")}
          </Button>
          {editingId ? (
            <Button size="sm" variant="secondary" onClick={resetDraft}>
              {t("settings.context_rules_cancel_edit")}
            </Button>
          ) : null}
          <Button size="sm" variant="ghost" onClick={() => void loadRules()}>
            {t("settings.context_rules_refresh")}
          </Button>
        </div>
      </div>

      <div className={styles.settingRowFull}>
        <div className={styles.settingInfo}>
          <h3>{t("settings.context_rules_active_rules")}</h3>
        </div>

        {loading ? (
          <div className={styles.hint}>
            {t("settings.context_rules_loading")}
          </div>
        ) : null}

        {!loading && rules.length === 0 ? (
          <div className={styles.hint}>{t("settings.context_rules_empty")}</div>
        ) : null}

        {!loading
          ? rules.map((rule) => (
              <div className={styles.subItem} key={rule.id}>
                <div className={styles.subItemInfo}>
                  <h4>
                    {rule.name}{" "}
                    {rule.enabled
                      ? ""
                      : `(${t("settings.context_rules_disabled")})`}
                  </h4>
                  <p>
                    {`${rule.sourceApp ?? "*"} -> ${rule.targetApp ?? "*"}`} •{" "}
                    {rule.contentType ?? "*"} • {rule.preset} •{" "}
                    {t("settings.context_rules_priority_short")}:{" "}
                    {rule.priority}
                  </p>
                  <p>
                    {t("settings.context_rules_transforms_short")}:{" "}
                    {rule.transforms.join(", ") || "-"}
                  </p>
                </div>
                <div className={styles.buttonGroup}>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleEdit(rule)}
                  >
                    {t("settings.context_rules_edit")}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => void handleToggleEnabled(rule)}
                  >
                    {rule.enabled
                      ? t("settings.context_rules_disable")
                      : t("settings.context_rules_enable")}
                  </Button>
                  <Button
                    size="sm"
                    variant="danger"
                    onClick={() => void handleDelete(rule)}
                  >
                    {t("settings.context_rules_delete")}
                  </Button>
                </div>
              </div>
            ))
          : null}
      </div>
    </div>
  );
};
