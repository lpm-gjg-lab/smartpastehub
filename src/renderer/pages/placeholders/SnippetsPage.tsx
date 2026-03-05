import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import pStyles from "../../styles/pages/PlaceholderPage.module.css";
import { hasSmartPasteBridge, invokeIPC } from "../../lib/ipc";
import { EmptyState } from "../../components/EmptyState";
import { useToastStore } from "../../stores/useToastStore";

interface Snippet {
  id: number;
  name: string;
  content: string;
  tags?: string;
  category?: string;
}

export const SnippetsPage: React.FC = () => {
  const { t } = useTranslation();
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
      if (!hasSmartPasteBridge()) return;
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

  const save = async () => {
    if (!form.name.trim() || !form.content.trim()) return;
    const payload = {
      name: form.name.trim(),
      content: form.content.trim(),
      category: form.category.trim() || undefined,
      tags: form.tags.trim()
        ? form.tags.split(",").map((x) => x.trim())
        : undefined,
    };
    try {
      if (editingId !== null) {
        await invokeIPC("snippet:update", { id: editingId, ...payload });
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
      <div className={pStyles.header}>
        <h2 className={pStyles.title}>{t("placeholders.snippets_title")}</h2>
        <button
          type="button"
          className={pStyles.btnPrimary}
          onClick={openCreate}
        >
          {t("placeholders.new_snippet")}
        </button>
      </div>

      <input
        className={pStyles.search}
        placeholder={t("placeholders.search_snippets")}
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
              placeholder="e.g. Email signature"
            />
          </div>
          <div className={pStyles.formRow}>
            <span className={pStyles.label}>Content *</span>
            <textarea
              className={pStyles.textarea}
              value={form.content}
              onChange={(e) =>
                setForm((f) => ({ ...f, content: e.target.value }))
              }
              placeholder="Snippet text..."
              rows={4}
            />
          </div>
          <div className={pStyles.formRowDouble}>
            <div className={pStyles.formRow}>
              <span className={pStyles.label}>Category</span>
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
              <span className={pStyles.label}>Tags (comma-separated)</span>
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

      {filtered.length === 0 ? (
        <EmptyState
          icon="S"
          title={
            filter
              ? t("placeholders.no_snippets_search")
              : t("placeholders.no_snippets")
          }
          subtitle={
            filter
              ? t("placeholders.try_different_keyword")
              : t("placeholders.create_first_snippet")
          }
          action={
            !filter
              ? {
                  label: t("placeholders.create_snippet"),
                  onClick: () => setShowForm(true),
                }
              : undefined
          }
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
                {s.content.length > 200 ? "..." : ""}
              </pre>
              {s.tags && <div className={pStyles.tags}>{s.tags}</div>}
              <div className={pStyles.cardActions}>
                <button
                  type="button"
                  className={pStyles.btnSmall}
                  onClick={() => copy(s)}
                >
                  {copied === s.id
                    ? t("placeholders.copied")
                    : t("common.copy")}
                </button>
                <button
                  type="button"
                  className={pStyles.btnSmall}
                  onClick={() => openEdit(s)}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className={`${pStyles.btnSmall} ${pStyles.btnDanger}`}
                  onClick={() => setConfirmDeleteId(s.id)}
                >
                  Delete
                </button>
                {confirmDeleteId === s.id && (
                  <span className={pStyles.confirmInline}>
                    <span className={pStyles.confirmLabel}>Sure?</span>
                    <button
                      type="button"
                      className={`${pStyles.btnSmall} ${pStyles.btnDanger}`}
                      onClick={() => void remove(s.id)}
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
