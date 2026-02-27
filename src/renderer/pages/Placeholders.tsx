import React, { useEffect, useState, useCallback } from "react";
import pStyles from "../styles/pages/PlaceholderPage.module.css";
import { hasSmartPasteBridge, invokeIPC } from "../lib/ipc";
import { EmptyState } from "../components/EmptyState";
import { useToastStore } from "../stores/useToastStore";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Snippet {
  id: number;
  name: string;
  content: string;
  tags?: string;
  category?: string;
  use_count: number;
  created_at: string;
}

declare global {
  interface Window {
    smartpaste: {
      invoke: (channel: string, payload?: unknown) => Promise<unknown>;
      on: (
        channel: string,
        listener: (event: unknown, payload: unknown) => void,
      ) => () => void;
    };
  }
}

// ---------------------------------------------------------------------------
// SnippetsPage
// ---------------------------------------------------------------------------
export const SnippetsPage: React.FC = () => {
  const { addToast } = useToastStore();
  const [snippets, setSnippets] = useState<Snippet[]>([]);
  const [filter, setFilter] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({
    name: "",
    content: "",
    category: "",
    tags: "",
  });
  const [showForm, setShowForm] = useState(false);
  const [copied, setCopied] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);

  const load = useCallback(async () => {
    try {
      const list = await invokeIPC<Snippet[]>("snippet:list");
      setSnippets(list ?? []);
    } catch (err) {
      if (!hasSmartPasteBridge()) {
        return;
      }
      addToast({
        title: "Failed to load snippets",
        message: err instanceof Error ? err.message : String(err),
        type: "error",
      });
    }
  }, [addToast]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: "", content: "", category: "", tags: "" });
    setShowForm(true);
  };

  const openEdit = (s: Snippet) => {
    setEditingId(s.id);
    setForm({
      name: s.name,
      content: s.content,
      category: s.category ?? "",
      tags: s.tags ?? "",
    });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
  };

  const save = async () => {
    if (!form.name.trim() || !form.content.trim()) return;
    const payload = {
      name: form.name.trim(),
      content: form.content.trim(),
      category: form.category.trim() || undefined,
      tags: form.tags.trim()
        ? form.tags.split(",").map((t) => t.trim())
        : undefined,
    };
    try {
      if (editingId !== null) {
        await invokeIPC("snippet:update", {
          id: editingId,
          ...payload,
        });
      } else {
        await invokeIPC("snippet:create", payload);
      }
      setShowForm(false);
      setEditingId(null);
      await load();
    } catch (err) {
      addToast({
        title: "Failed to save snippet",
        message: err instanceof Error ? err.message : String(err),
        type: "error",
      });
    }
  };

  const remove = async (id: number) => {
    try {
      await invokeIPC("snippet:delete", { id });
      setConfirmDeleteId(null);
      await load();
    } catch (err) {
      addToast({
        title: "Failed to delete snippet",
        message: err instanceof Error ? err.message : String(err),
        type: "error",
      });
    }
  };

  const copy = (s: Snippet) => {
    navigator.clipboard.writeText(s.content).catch((err) => {
      addToast({
        title: "Copy failed",
        message: err instanceof Error ? err.message : String(err),
        type: "error",
      });
    });
    setCopied(s.id);
    setTimeout(() => setCopied(null), 1500);
  };

  const filtered = snippets.filter(
    (s) =>
      s.name.toLowerCase().includes(filter.toLowerCase()) ||
      s.content.toLowerCase().includes(filter.toLowerCase()) ||
      (s.category ?? "").toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className={pStyles.page}>
      {/* Header */}
      <div className={pStyles.header}>
        <h2 className={pStyles.title}>📌 Snippets</h2>
        <button className={pStyles.btnPrimary} onClick={openCreate}>
          + New Snippet
        </button>
      </div>

      {/* Search */}
      <input
        className={pStyles.search}
        placeholder="Search snippets…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      {/* Form */}
      {showForm && (
        <div className={pStyles.formCard}>
          <div className={pStyles.formRow}>
            <label className={pStyles.label}>Name *</label>
            <input
              className={pStyles.input}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Email signature"
            />
          </div>
          <div className={pStyles.formRow}>
            <label className={pStyles.label}>Content *</label>
            <textarea
              className={pStyles.textarea}
              value={form.content}
              onChange={(e) =>
                setForm((f) => ({ ...f, content: e.target.value }))
              }
              placeholder="Snippet text…"
              rows={4}
            />
          </div>
          <div className={pStyles.formRowDouble}>
            <div className={pStyles.formRow}>
              <label className={pStyles.label}>Category</label>
              <input
                className={pStyles.input}
                value={form.category}
                onChange={(e) =>
                  setForm((f) => ({ ...f, category: e.target.value }))
                }
                placeholder="e.g. Work"
              />
            </div>
            <div className={pStyles.formRow}>
              <label className={pStyles.label}>Tags (comma-separated)</label>
              <input
                className={pStyles.input}
                value={form.tags}
                onChange={(e) =>
                  setForm((f) => ({ ...f, tags: e.target.value }))
                }
                placeholder="e.g. email, greeting"
              />
            </div>
          </div>
          <div className={pStyles.formActions}>
            <button className={pStyles.btnPrimary} onClick={save}>
              {editingId !== null ? "Save Changes" : "Create"}
            </button>
            <button className={pStyles.btnSecondary} onClick={cancelForm}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon="📌"
          title={filter ? "No snippets match your search" : "No snippets yet"}
          subtitle={filter ? "Try a different keyword." : "Create your first snippet to get started."}
          action={!filter ? { label: "Create Snippet", onClick: () => setShowForm(true) } : undefined}
        />
      ) : (
        <div className={pStyles.list}>
          {filtered.map((s) => (
            <div key={s.id} className={pStyles.card}>
              <div className={pStyles.cardTop}>
                <span className={pStyles.cardName}>{s.name}</span>
                {s.category && (
                  <span className={pStyles.badge}>{s.category}</span>
                )}
              </div>
              <pre className={pStyles.preview}>
                {s.content.slice(0, 200)}
                {s.content.length > 200 ? "…" : ""}
              </pre>
              {s.tags && <div className={pStyles.tags}>{s.tags}</div>}
              <div className={pStyles.cardActions}>
                <button className={pStyles.btnSmall} onClick={() => copy(s)}>
                  {copied === s.id ? "✓ Copied" : "Copy"}
                </button>
                <button
                  className={pStyles.btnSmall}
                  onClick={() => openEdit(s)}
                >
                  Edit
                </button>
                <button
                  className={`${pStyles.btnSmall} ${pStyles.btnDanger}`}
                  onClick={() => setConfirmDeleteId(s.id)}
                >
                  Delete
                </button>
                {confirmDeleteId === s.id && (
                  <span className={pStyles.confirmInline}>
                    <span className={pStyles.confirmLabel}>Sure?</span>
                    <button
                      className={`${pStyles.btnSmall} ${pStyles.btnDanger}`}
                      onClick={() => void remove(s.id)}
                    >
                      Yes
                    </button>
                    <button
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

// ---------------------------------------------------------------------------
// TemplatesPage
// ---------------------------------------------------------------------------
interface TemplateItem {
  id: number;
  name: string;
  content: string;
  variables: string[];
  tags: string[];
}

export const TemplatesPage: React.FC = () => {
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
        (list ?? []).map((t) => ({
          ...t,
          variables: Array.isArray(t.variables) ? t.variables : [],
          tags: Array.isArray(t.tags) ? t.tags : [],
        })),
      );
    } catch (err) {
      if (!hasSmartPasteBridge()) {
        return;
      }
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

  const openCreate = () => {
    setEditingId(null);
    setForm({ name: "", content: "", tags: "" });
    setShowForm(true);
  };

  const openEdit = (t: TemplateItem) => {
    setEditingId(t.id);
    setForm({ name: t.name, content: t.content, tags: t.tags.join(", ") });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim() || !form.content.trim()) return;
    const variables = parseVars(form.content);
    const tags = form.tags
      .split(",")
      .map((t) => t.trim())
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
    t.variables.forEach((v) => (init[v] = ""));
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

  const copyFillResult = () => {
    navigator.clipboard.writeText(fillResult).catch((err) => {
      addToast({
        title: "Copy failed",
        message: err instanceof Error ? err.message : String(err),
        type: "error",
      });
    });
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const filtered = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(filter.toLowerCase()) ||
      t.content.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className={pStyles.page}>
      <div className={pStyles.header}>
        <h2 className={pStyles.title}>📝 Templates</h2>
        <button className={pStyles.btnPrimary} onClick={openCreate}>
          + New Template
        </button>
      </div>
      <input
        className={pStyles.search}
        placeholder="Search templates…"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />

      {showForm && (
        <div className={pStyles.formCard}>
          <div className={pStyles.formRow}>
            <label className={pStyles.label}>Name *</label>
            <input
              className={pStyles.input}
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
              placeholder="e.g. Meeting invite"
            />
          </div>
          <div className={pStyles.formRow}>
            <label className={pStyles.label}>
              Content * — use {"{variable}"} for dynamic fields
            </label>
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
          {form.content && parseVars(form.content).length > 0 && (
            <div className={pStyles.varsHint}>
              Detected variables:{" "}
              {parseVars(form.content).map((v) => (
                <code key={v} className={pStyles.varCode}>{`{${v}}`}</code>
              ))}
            </div>
          )}
          <div className={pStyles.formRow}>
            <label className={pStyles.label}>Tags (comma-separated)</label>
            <input
              className={pStyles.input}
              value={form.tags}
              onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
              placeholder="e.g. work, email"
            />
          </div>
          <div className={pStyles.formActions}>
            <button className={pStyles.btnPrimary} onClick={save}>
              {editingId !== null ? "Save Changes" : "Create"}
            </button>
            <button
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
              className={pStyles.btnSecondary}
              onClick={() => setFillModal(null)}
            >
              ✕
            </button>
          </div>
          {fillModal.variables.length === 0 && (
            <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)" }}>
              No variables in this template.
            </p>
          )}
          {fillModal.variables.map((v) => (
            <div key={v} className={pStyles.formRow}>
              <label className={pStyles.label}>{`{${v}}`}</label>
              <input
                className={pStyles.input}
                value={fillValues[v] ?? ""}
                onChange={(e) =>
                  setFillValues((fv) => ({ ...fv, [v]: e.target.value }))
                }
              />
            </div>
          ))}
          <div className={pStyles.formActions}>
            <button className={pStyles.btnPrimary} onClick={doFill}>
              Fill
            </button>
          </div>
          {fillResult && (
            <div>
              <label className={pStyles.label}>Result</label>
              <pre className={pStyles.fillResultPre}>{fillResult}</pre>
              <div className={pStyles.formActions}>
                <button className={pStyles.btnPrimary} onClick={copyFillResult}>
                  {copied ? "✓ Copied" : "Copy Result"}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className={pStyles.empty}>
          <span style={{ fontSize: "2.5rem", opacity: 0.4 }}>📝</span>
          <p>
            {filter
              ? "No templates match your search."
              : "No templates yet. Create one!"}
          </p>
        </div>
      ) : (
        <div className={pStyles.list}>
          {filtered.map((t) => (
            <div key={t.id} className={pStyles.card}>
              <div className={pStyles.cardTop}>
                <span className={pStyles.cardName}>{t.name}</span>
                {t.variables.length > 0 && (
                  <span className={pStyles.badgeSuccess}>
                    {t.variables.length} var
                    {t.variables.length !== 1 ? "s" : ""}
                  </span>
                )}
              </div>
              <pre className={pStyles.preview}>
                {t.content.slice(0, 200)}
                {t.content.length > 200 ? "…" : ""}
              </pre>
              {t.tags.length > 0 && (
                <div className={pStyles.tags}>{t.tags.join(", ")}</div>
              )}
              <div className={pStyles.cardActions}>
                <button
                  className={pStyles.btnSmall}
                  onClick={() => openFill(t)}
                >
                  Use
                </button>
                <button
                  className={pStyles.btnSmall}
                  onClick={() => openEdit(t)}
                >
                  Edit
                </button>
                <button
                  className={`${pStyles.btnSmall} ${pStyles.btnDanger}`}
                  onClick={() => setConfirmDeleteId(t.id)}
                >
                  Delete
                </button>
                {confirmDeleteId === t.id && (
                  <span className={pStyles.confirmInline}>
                    <span className={pStyles.confirmLabel}>Sure?</span>
                    <button
                      className={`${pStyles.btnSmall} ${pStyles.btnDanger}`}
                      onClick={() => void remove(t.id)}
                    >
                      Yes
                    </button>
                    <button
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

// ---------------------------------------------------------------------------
// AISettingsPage
// ---------------------------------------------------------------------------
export const AISettingsPage: React.FC = () => {
  const { addToast } = useToastStore();
  const [settings, setSettings] = useState<{
    ai: {
      enabled: boolean;
      provider: string;
      apiKey?: string;
      baseUrl?: string;
      model?: string;
      autoDetect: boolean;
    };
    ocr: { languages: string[]; autoClean: boolean };
  } | null>(null);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [form, setForm] = useState({
    aiEnabled: true,
    provider: "local",
    apiKey: "",
    baseUrl: "",
    model: "",
    autoDetect: true,
    ocrLanguages: "eng",
    ocrAutoClean: true,
  });

  useEffect(() => {
    if (!hasSmartPasteBridge()) {
      return;
    }

    invokeIPC<typeof settings>("settings:get")
      .then((s) => {
        setSettings(s);
        if (s) {
          setForm({
            aiEnabled: s.ai.enabled ?? true,
            provider: s.ai.provider ?? "local",
            apiKey: s.ai.apiKey ?? "",
            baseUrl: s.ai.baseUrl ?? "",
            model: s.ai.model ?? "",
            autoDetect: s.ai.autoDetect ?? true,
            ocrLanguages: (s.ocr.languages ?? ["eng"]).join(", "),
            ocrAutoClean: s.ocr.autoClean ?? true,
          });
        }
      })
      .catch((err) => {
        if (!hasSmartPasteBridge()) {
          return;
        }
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
          provider: form.provider as "local" | "openai" | "gemini" | "anthropic" | "deepseek" | "xai" | "custom",
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
      setTestResult("⚠️ Test connection is only available in Electron app");
      return;
    }

    setTesting(true);
    setTestResult(null);
    try {
      const res = await invokeIPC<{ ok: boolean; message: string }>("ai:test-connection");
      setTestResult(res.ok ? `✅ ${res.message}` : `❌ ${res.message}`);
    } catch (e) {
      setTestResult(`❌ ${(e as Error)?.message ?? "Connection failed"}`);
    } finally {
      setTesting(false);
    }
  };
  // provider determines which credential/endpoint fields are shown below

  return (
    <div className={pStyles.page}>
      <div className={pStyles.header}>
        <h2 className={pStyles.title}>🤖 AI & OCR</h2>
      </div>

      {/* AI Section */}
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
          <label className={pStyles.rowLabel}>Provider</label>
          <select
            className={pStyles.selectFull}
            value={form.provider}
            onChange={(e) =>
              setForm((f) => ({ ...f, provider: e.target.value }))
            }
            disabled={!form.aiEnabled}
          >
            <option value="local">Local (Ollama / custom endpoint)</option>
            <option value="openai">OpenAI (GPT-4o, GPT-4o-mini, o3…)</option>
            <option value="gemini">Google Gemini (2.5 Flash, 2.5 Pro…)</option>
            <option value="anthropic">Anthropic Claude (claude-3.5, claude-opus…)</option>
            <option value="deepseek">DeepSeek (deepseek-chat, deepseek-reasoner…)</option>
            <option value="xai">xAI Grok (grok-3, grok-3-mini…)</option>
            <option value="custom">Custom / OpenAI-compatible endpoint</option>
          </select>
        </div>
        {(form.provider === "openai" || form.provider === "anthropic" || form.provider === "deepseek" || form.provider === "xai" || form.provider === "custom") && (
          <div className={pStyles.row}>
            <label className={pStyles.rowLabel}>
              {form.provider === "anthropic"
                ? "Anthropic API Key (sk-ant-…)"
                : form.provider === "deepseek"
                ? "DeepSeek API Key"
                : form.provider === "xai"
                ? "xAI API Key"
                : "API Key"}
            </label>
            <input
              className={pStyles.inputFull}
              type="password"
              value={form.apiKey}
              placeholder={
                form.provider === "anthropic" ? "sk-ant-..." : "sk-..."
              }
              onChange={(e) =>
                setForm((f) => ({ ...f, apiKey: e.target.value }))
              }
              disabled={!form.aiEnabled}
            />
          </div>
        )}
        {form.provider === "gemini" && (
          <div className={pStyles.row}>
            <label className={pStyles.rowLabel}>Gemini API Key (AIza…)</label>
            <input
              className={pStyles.inputFull}
              type="password"
              value={form.apiKey}
              placeholder="AIza..."
              onChange={(e) =>
                setForm((f) => ({ ...f, apiKey: e.target.value }))
              }
              disabled={!form.aiEnabled}
            />
          </div>
        )}
        {(form.provider === "local" || form.provider === "openai" || form.provider === "anthropic" || form.provider === "deepseek" || form.provider === "xai" || form.provider === "custom") && (
          <div className={pStyles.row}>
            <label className={pStyles.rowLabel}>Base URL</label>
            <input
              className={pStyles.inputFull}
              value={form.baseUrl}
              placeholder={
                form.provider === "anthropic"
                  ? "https://api.anthropic.com/v1"
                  : form.provider === "deepseek"
                  ? "https://api.deepseek.com/v1"
                  : form.provider === "xai"
                  ? "https://api.x.ai/v1"
                  : form.provider === "local"
                  ? "http://localhost:11434/v1"
                  : "https://api.openai.com/v1"
              }
              onChange={(e) =>
                setForm((f) => ({ ...f, baseUrl: e.target.value }))
              }
              disabled={!form.aiEnabled}
            />
            <span className={pStyles.hint}>
              {form.provider === "anthropic"
                ? "Leave empty to use official Anthropic API"
                : form.provider === "deepseek"
                ? "Leave empty to use official DeepSeek API"
                : form.provider === "xai"
                ? "Leave empty to use official xAI API"
                : form.provider === "local"
                ? "Ollama default: http://localhost:11434/v1"
                : "Leave empty to use official OpenAI API"}
            </span>
          </div>
        )}
        <div className={pStyles.row}>
          <label className={pStyles.rowLabel}>Model</label>
          <input
            list="ai-model-suggestions-page"
            className={pStyles.inputFull}
            value={form.model}
            placeholder={
              form.provider === "deepseek"
                ? "deepseek-chat"
                : form.provider === "xai"
                ? "grok-3-mini"
                : form.provider === "openai" || form.provider === "custom"
                ? "gpt-4o-mini"
                : form.provider === "gemini"
                ? "gemini-2.5-flash"
                : form.provider === "anthropic"
                ? "claude-3-5-haiku-20241022"
                : "llama3.2"
            }
            onChange={(e) => setForm((f) => ({ ...f, model: e.target.value }))}
            disabled={!form.aiEnabled}
          />
          <datalist id="ai-model-suggestions-page">
            {(form.provider === "openai" || form.provider === "custom") && (
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
            {form.provider === "gemini" && (
              <>
                <option value="gemini-2.5-flash" />
                <option value="gemini-2.5-pro" />
                <option value="gemini-2.0-flash" />
                <option value="gemini-2.0-flash-lite" />
                <option value="gemini-1.5-flash" />
                <option value="gemini-1.5-pro" />
              </>
            )}
            {form.provider === "anthropic" && (
              <>
                <option value="claude-3-5-haiku-20241022" />
                <option value="claude-3-5-sonnet-20241022" />
                <option value="claude-3-opus-20240229" />
                <option value="claude-opus-4-5" />
                <option value="claude-sonnet-4-5" />
                <option value="claude-haiku-4-5" />
              </>
            )}
            {form.provider === "deepseek" && (
              <>
                <option value="deepseek-chat" />
                <option value="deepseek-reasoner" />
              </>
            )}
            {form.provider === "xai" && (
              <>
                <option value="grok-3-mini" />
                <option value="grok-3" />
                <option value="grok-2-1212" />
                <option value="grok-2-vision-1212" />
              </>
            )}
            {form.provider === "local" && (
              <>
                <option value="llama3.2" />
                <option value="llama3.1" />
                <option value="mistral" />
                <option value="qwen2.5" />
                <option value="phi3" />
                <option value="gemma2" />
              </>
            )}
          </datalist>
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
              className={pStyles.btnSecondary}
              onClick={testConnection}
              disabled={testing}
            >
              {testing ? "Testing…" : "Test Connection"}
            </button>
            {testResult && (
              <span style={{ fontSize: "0.85rem" }}>{testResult}</span>
            )}
          </div>
        )}
      </div>

      {/* OCR Section */}
      <div className={pStyles.section}>
        <div className={pStyles.sectionTitle}>
          OCR (Optical Character Recognition)
        </div>
        <div className={pStyles.row}>
          <label className={pStyles.rowLabel}>
            Languages (comma-separated Tesseract codes)
          </label>
          <input
            className={pStyles.inputFull}
            value={form.ocrLanguages}
            placeholder="eng, ind"
            onChange={(e) =>
              setForm((f) => ({ ...f, ocrLanguages: e.target.value }))
            }
          />
          <span className={pStyles.hint}>
            eng = English, ind = Indonesian, jpn = Japanese, etc.
          </span>
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
        <button className={pStyles.btnPrimary} onClick={save}>
          {saved ? "✓ Saved" : "Save Settings"}
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
          Loading settings…
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// SyncPage
// ---------------------------------------------------------------------------
export const SyncPage: React.FC = () => {
  const { addToast } = useToastStore();
  const [settings, setSettings] = useState<{
    sync: {
      enabled: boolean;
      deviceId: string;
      pairedDevices: { id: string; name: string }[];
    };
  } | null>(null);
  const [qrText, setQrText] = useState("");
  const [qrUrls, setQrUrls] = useState<string[]>([]);
  const [genLoading, setGenLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);

  useEffect(() => {
    if (!hasSmartPasteBridge()) {
      return;
    }

    invokeIPC<typeof settings>("settings:get")
      .then((s) => {
        setSettings(s);
        setSyncEnabled(s?.sync?.enabled ?? false);
      })
      .catch((err) => {
        if (!hasSmartPasteBridge()) {
          return;
        }
        addToast({
          title: "Failed to load sync settings",
          message: err instanceof Error ? err.message : String(err),
          type: "error",
        });
      });
  }, [addToast]);

  const generateQr = async () => {
    if (!qrText.trim()) return;
    if (!hasSmartPasteBridge()) {
      addToast({
        title: "Not available in browser mode",
        message: "Run this page inside Electron desktop app.",
        type: "warning",
      });
      return;
    }

    setGenLoading(true);
    try {
      const res = await invokeIPC<{ dataUrls: string[] }>("qr:generate", {
        text: qrText,
        options: { size: 240 },
      });
      setQrUrls(res.dataUrls ?? []);
    } catch (err) {
      setQrUrls([]);
      addToast({
        title: "QR generation failed",
        message: err instanceof Error ? err.message : String(err),
        type: "error",
      });
    } finally {
      setGenLoading(false);
    }
  };

  const saveSync = async () => {
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
        sync: { ...settings?.sync, enabled: syncEnabled },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      addToast({
        title: "Failed to save sync settings",
        message: err instanceof Error ? err.message : String(err),
        type: "error",
      });
    }
  };

  const paired = settings?.sync?.pairedDevices ?? [];

  return (
    <div className={pStyles.page}>
      <div className={pStyles.header}>
        <h2 className={pStyles.title}>📱 Cross-Device Sync</h2>
      </div>

      {/* Enable toggle */}
      <div
        className={pStyles.section}
        style={{ display: "flex", alignItems: "center", gap: 10 }}
      >
        <input
          type="checkbox"
          id="sync-enabled"
          checked={syncEnabled}
          onChange={(e) => setSyncEnabled(e.target.checked)}
        />
        <label
          htmlFor="sync-enabled"
          style={{ fontSize: "0.9rem", fontWeight: 500 }}
        >
          Enable sync
        </label>
        <button className={pStyles.btnPrimary} onClick={saveSync}>
          {saved ? "✓ Saved" : "Save"}
        </button>
      </div>

      {/* Device info */}
      {settings?.sync?.deviceId && (
        <div className={pStyles.section}>
          <div className={pStyles.sectionTitle}>This Device</div>
          <div className={pStyles.info}>
            Device ID:{" "}
            <code style={{ fontSize: "0.82rem" }}>
              {settings.sync.deviceId}
            </code>
          </div>
        </div>
      )}

      {/* Paired devices */}
      <div className={pStyles.section}>
        <div className={pStyles.sectionTitle}>
          Paired Devices ({paired.length})
        </div>
        {paired.length === 0 ? (
          <div className={pStyles.info}>
            No devices paired yet. Use a QR code below to pair your phone.
          </div>
        ) : (
          <div>
            {paired.map((d) => (
              <span key={d.id} className={pStyles.deviceChip}>
                📱 {d.name || d.id}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* QR generator */}
      <div className={pStyles.section}>
        <div className={pStyles.sectionTitle}>QR Code Generator</div>
        <div className={pStyles.info}>
          Generate a QR code from any text to share with your mobile device.
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            className={pStyles.inputFull}
            style={{ flex: 1 }}
            value={qrText}
            onChange={(e) => setQrText(e.target.value)}
            placeholder="Enter text to encode…"
            onKeyDown={(e) => e.key === "Enter" && void generateQr()}
          />
          <button
            className={pStyles.btnPrimary}
            onClick={generateQr}
            disabled={genLoading || !qrText.trim()}
          >
            {genLoading ? "Generating…" : "Generate"}
          </button>
        </div>
        {qrUrls.length > 0 && (
          <div className={pStyles.qrBox}>
            {qrUrls.map((url, i) => (
              <div key={i} className={pStyles.qrItem}>
                <img
                  src={url}
                  alt={`QR code part ${i + 1}`}
                  className={pStyles.qrImage}
                />
                {qrUrls.length > 1 && (
                  <div className={pStyles.qrCaption}>
                    Part {i + 1}/{qrUrls.length}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// PluginsPage
// ---------------------------------------------------------------------------
const PLUGIN_CATALOG = [
  {
    id: "p1",
    name: "Markdown Formatter",
    description:
      "Auto-format pasted Markdown with proper heading levels and list indentation.",
    author: "community",
    status: "planned" as const,
  },
  {
    id: "p2",
    name: "CSV Prettifier",
    description:
      "Convert raw CSV clipboard data to a clean, aligned table view.",
    author: "community",
    status: "planned" as const,
  },
  {
    id: "p3",
    name: "URL Expander",
    description:
      "Resolve shortened URLs (bit.ly, t.co) and replace them with full destinations.",
    author: "community",
    status: "planned" as const,
  },
  {
    id: "p4",
    name: "Code Highlighter",
    description: "Detect and syntax-highlight pasted code snippets with Shiki.",
    author: "community",
    status: "planned" as const,
  },
  {
    id: "p5",
    name: "Translation Bridge",
    description:
      "Translate pasted text to your preferred language via LibreTranslate (self-hosted).",
    author: "community",
    status: "planned" as const,
  },
];

export const PluginsPage: React.FC = () => {
  const icons = ["📝", "📊", "🔗", "💻", "🌐"];

  return (
    <div className={pStyles.page}>
      <div className={pStyles.header}>
        <h2 className={pStyles.title}>🔌 Plugins</h2>
      </div>
      <div className={pStyles.pluginBanner}>
        <strong>Plugin system coming soon.</strong> The API is under
        development. Browse the planned plugins below — community contributions
        welcome once the API is stable.
      </div>
      <div className={pStyles.list}>
        {PLUGIN_CATALOG.map((p, i) => (
          <div key={p.id} className={pStyles.pluginCard}>
            <span className={pStyles.pluginIcon}>
              {icons[i % icons.length]}
            </span>
            <div className={pStyles.pluginInfo}>
              <div className={pStyles.pluginName}>{p.name}</div>
              <div className={pStyles.pluginDesc}>{p.description}</div>
              <span className={pStyles.pluginChip}>Planned • {p.author}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
