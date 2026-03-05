import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import pStyles from "../../styles/pages/PlaceholderPage.module.css";
import { hasSmartPasteBridge, invokeIPC } from "../../lib/ipc";
import { useToastStore } from "../../stores/useToastStore";

interface TemplateItem {
  id: number;
  name: string;
  content: string;
  variables: string[];
  tags: string[];
}

export const TemplatesPage: React.FC = () => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const [templates, setTemplates] = useState<TemplateItem[]>([]);
  const [filter, setFilter] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", content: "", tags: "" });
  const [fillModal, setFillModal] = useState<TemplateItem | null>(null);
  const [fillValues, setFillValues] = useState<Record<string, string>>({});
  const [fillResult, setFillResult] = useState("");
  const [copied, setCopied] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const parseVars = (content: string) =>
    Array.from(
      new Set((content.match(/\{(\w+)\}/g) ?? []).map((m) => m.slice(1, -1))),
    );

  const load = useCallback(async () => {
    try {
      const list = await invokeIPC<TemplateItem[]>("template:list");
      setTemplates(
        (list ?? []).map((v) => ({
          ...v,
          variables: Array.isArray(v.variables) ? v.variables : [],
          tags: Array.isArray(v.tags) ? v.tags : [],
        })),
      );
    } catch (err) {
      if (!hasSmartPasteBridge()) return;
      addToast({
        title: "Failed to load templates",
        message: err instanceof Error ? err.message : String(err),
        type: "error",
      });
    }
  }, [addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async () => {
    if (!form.name.trim() || !form.content.trim()) return;
    const variables = parseVars(form.content);
    const tags = form.tags
      .split(",")
      .map((x) => x.trim())
      .filter(Boolean);
    try {
      if (editingId !== null) {
        await invokeIPC("template:update", {
          id: editingId,
          name: form.name.trim(),
          content: form.content.trim(),
          variables,
          tags,
        });
      } else {
        await invokeIPC("template:create", {
          name: form.name.trim(),
          content: form.content.trim(),
          variables,
          tags,
        });
      }
      setShowForm(false);
      setEditingId(null);
      await load();
    } catch (err) {
      addToast({
        title: "Failed to save template",
        message: err instanceof Error ? err.message : String(err),
        type: "error",
      });
    }
  };

  const remove = async (id: number) => {
    try {
      await invokeIPC("template:delete", { id });
      setConfirmDeleteId(null);
      await load();
    } catch (err) {
      addToast({
        title: "Failed to delete template",
        message: err instanceof Error ? err.message : String(err),
        type: "error",
      });
    }
  };

  const openFill = (t: TemplateItem) => {
    setFillModal(t);
    const init: Record<string, string> = {};
    t.variables.forEach((v) => {
      init[v] = "";
    });
    setFillValues(init);
    setFillResult("");
    setCopied(false);
  };

  const doFill = async () => {
    if (!fillModal) return;
    try {
      const result = await invokeIPC<string>("template:fill", {
        id: fillModal.id,
        values: fillValues,
      });
      setFillResult(result);
    } catch {
      setFillResult(
        fillModal.content.replace(
          /\{(\w+)\}/g,
          (_, k: string) => fillValues[k] ?? `{${k}}`,
        ),
      );
    }
  };

  const filtered = templates.filter(
    (x) =>
      x.name.toLowerCase().includes(filter.toLowerCase()) ||
      x.content.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className={pStyles.page}>
      <div className={pStyles.header}>
        <h2 className={pStyles.title}>{t("placeholders.templates_title")}</h2>
        <button
          type="button"
          className={pStyles.btnPrimary}
          onClick={() => {
            setEditingId(null);
            setForm({ name: "", content: "", tags: "" });
            setShowForm(true);
          }}
        >
          {t("placeholders.new_template")}
        </button>
      </div>
      <input
        className={pStyles.search}
        placeholder={t("placeholders.search_templates")}
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      {showForm && (
        <div className={pStyles.formCard}>
          <div className={pStyles.formRow}>
            <span className={pStyles.label}>Name *</span>
            <input
              className={pStyles.input}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Meeting invite"
            />
          </div>
          <div className={pStyles.formRow}>
            <span className={pStyles.label}>
              Content * - use {"{variable}"} for dynamic fields
            </span>
            <textarea
              className={pStyles.textarea}
              rows={5}
              value={form.content}
              onChange={(e) =>
                setForm((f) => ({ ...f, content: e.target.value }))
              }
              placeholder="Hi {name}, meeting at {time} on {date}."
            />
          </div>
          <div className={pStyles.formRow}>
            <span className={pStyles.label}>Tags (comma-separated)</span>
            <input
              className={pStyles.input}
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="e.g. work, email"
            />
          </div>
          <div className={pStyles.formActions}>
            <button type="button" className={pStyles.btnPrimary} onClick={save}>
              {editingId !== null ? "Save Changes" : "Create"}
            </button>
            <button
              type="button"
              className={pStyles.btnSecondary}
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {fillModal && (
        <div className={`${pStyles.formCard} ${pStyles.fillModal}`}>
          <div className={pStyles.fillModalHeader}>
            <strong>Fill: {fillModal.name}</strong>
            <button
              type="button"
              className={pStyles.btnSecondary}
              onClick={() => setFillModal(null)}
            >
              {t("common.close")}
            </button>
          </div>
          {fillModal.variables.map((v) => (
            <div key={v} className={pStyles.formRow}>
              <span className={pStyles.label}>{`{${v}}`}</span>
              <input
                className={pStyles.input}
                value={fillValues[v] ?? ""}
                onChange={(e) =>
                  setFillValues((p) => ({ ...p, [v]: e.target.value }))
                }
              />
            </div>
          ))}
          <div className={pStyles.formActions}>
            <button
              type="button"
              className={pStyles.btnPrimary}
              onClick={doFill}
            >
              Fill
            </button>
          </div>
          {fillResult && (
            <div>
              <span className={pStyles.label}>Result</span>
              <pre className={pStyles.fillResultPre}>{fillResult}</pre>
              <div className={pStyles.formActions}>
                <button
                  type="button"
                  className={pStyles.btnPrimary}
                  onClick={() => {
                    navigator.clipboard
                      .writeText(fillResult)
                      .catch(() => undefined);
                    setCopied(true);
                    setTimeout(() => setCopied(false), 1500);
                  }}
                >
                  {copied
                    ? t("placeholders.copied")
                    : t("placeholders.copy_result")}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className={pStyles.empty}>
          <span style={{ fontSize: "2.5rem", opacity: 0.4 }}>T</span>
          <p>
            {filter
              ? t("placeholders.no_templates_search")
              : t("placeholders.no_templates")}
          </p>
        </div>
      ) : (
        <div className={pStyles.list}>
          {filtered.map((item) => (
            <div key={item.id} className={pStyles.card}>
              <div className={pStyles.cardTop}>
                <span className={pStyles.cardName}>{item.name}</span>
                {item.variables.length > 0 && (
                  <span className={pStyles.badgeSuccess}>
                    {item.variables.length} vars
                  </span>
                )}
              </div>
              <pre className={pStyles.preview}>
                {item.content.slice(0, 200)}
                {item.content.length > 200 ? "..." : ""}
              </pre>
              {item.tags.length > 0 && (
                <div className={pStyles.tags}>{item.tags.join(", ")}</div>
              )}
              <div className={pStyles.cardActions}>
                <button
                  type="button"
                  className={pStyles.btnSmall}
                  onClick={() => openFill(item)}
                >
                  Use
                </button>
                <button
                  type="button"
                  className={pStyles.btnSmall}
                  onClick={() => {
                    setEditingId(item.id);
                    setForm({
                      name: item.name,
                      content: item.content,
                      tags: item.tags.join(", "),
                    });
                    setShowForm(true);
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className={`${pStyles.btnSmall} ${pStyles.btnDanger}`}
                  onClick={() => setConfirmDeleteId(item.id)}
                >
                  Delete
                </button>
                {confirmDeleteId === item.id && (
                  <span className={pStyles.confirmInline}>
                    <span className={pStyles.confirmLabel}>Sure?</span>
                    <button
                      type="button"
                      className={`${pStyles.btnSmall} ${pStyles.btnDanger}`}
                      onClick={() => void remove(item.id)}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      className={pStyles.btnSmall}
                      onClick={() => setConfirmDeleteId(null)}
                    >
                      No
                    </button>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
