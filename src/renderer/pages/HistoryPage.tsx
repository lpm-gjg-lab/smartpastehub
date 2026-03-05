import React, { useCallback, useEffect, useMemo, useState } from "react";
import styles from "../styles/pages/HistoryPage.module.css";
import { hasSmartPasteBridge, invokeIPC } from "../lib/ipc";
import { Button } from "../components/Button";
import { EmptyState } from "../components/EmptyState";
import { useTranslation } from "react-i18next";
import { TYPE_ICONS as CONTENT_TYPE_ICONS } from "../types";
import type { ContentType } from "../../shared/types";
import { useToastStore } from "../stores/useToastStore";
import { 
  Link2Icon, 
  MagicWandIcon, 
  ClockIcon, 
  DrawingPinFilledIcon,
  DrawingPinIcon,
  MagnifyingGlassIcon,
  KeyboardIcon
} from "@radix-ui/react-icons";

interface HistoryClip {
  id: number;
  original_text: string;
  cleaned_text: string;
  html_content?: string | null;
  content_type: ContentType;
  source_app?: string | null;
  preset_used?: string | null;
  char_count?: number;
  created_at: string;
  is_pinned?: number;
  is_sensitive?: number;
}

interface UsageSummary {
  recentClips?: HistoryClip[];
  [key: string]: unknown;
}

export const HistoryPage: React.FC = () => {
  const { t } = useTranslation();
  const bridgeAvailable = hasSmartPasteBridge();
  const [clips, setClips] = useState<HistoryClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "7d" | "30d">(
    "all",
  );
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [nowMs, setNowMs] = useState(() => Date.now());
  const { addToast } = useToastStore();
  const [aiModeForClip, setAiModeForClip] = useState<Record<number, string>>(
    {},
  );
  const [aiRerunLoading, setAiRerunLoading] = useState<Record<number, boolean>>(
    {},
  );

  // Phase 4 — Paste Queue
  const [queueSize, setQueueSize] = useState(0);
  const [queuePeek, setQueuePeek] = useState<string | null>(null);

  // Batch AI bar
  const [batchRewriteMode, setBatchRewriteMode] = useState("fix_grammar");
  const [isBatchRunning, setIsBatchRunning] = useState(false);

  const handleBatchRewrite = async () => {
    if (!hasSmartPasteBridge() || selectedIds.size === 0 || isBatchRunning)
      return;
    setIsBatchRunning(true);
    try {
      const updated = [...clips];
      const persisted: Array<Promise<boolean>> = [];
      for (let i = 0; i < updated.length; i++) {
        const clip = updated[i];
        if (!clip || !selectedIds.has(clip.id)) continue;
        try {
          const res = await invokeIPC<{ rewritten: string }>("ai:rewrite", {
            text: clip.cleaned_text,
            mode: batchRewriteMode,
          });
          if (res?.rewritten) {
            updated[i] = { ...clip, cleaned_text: res.rewritten };
            persisted.push(
              invokeIPC<boolean>("history:update", {
                id: clip.id,
                cleanedText: res.rewritten,
                aiMode: batchRewriteMode,
              }),
            );
          }
        } catch {
          // skip individual failures
        }
      }
      if (persisted.length > 0) {
        await Promise.all(persisted);
      }
      setClips(updated);
      setSelectedIds(new Set());
    } finally {
      setIsBatchRunning(false);
    }
  };

  const loadData = useCallback(async () => {
    if (!bridgeAvailable) {
      setClips([]);
      setLoading(false);
      return;
    }

    try {
      const summary = await invokeIPC<UsageSummary>("usage:summary");
      if (summary?.recentClips) {
        setClips(summary.recentClips);
      }
    } catch {
      setClips([]);
    } finally {
      setLoading(false);
    }
  }, [bridgeAvailable]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Poll queue state every 3s
  useEffect(() => {
    if (!bridgeAvailable) {
      return;
    }

    const poll = async () => {
      try {
        const size = await invokeIPC<number>("queue:size");
        const peek = await invokeIPC<string | null>("queue:peek");
        setQueueSize(size);
        setQueuePeek(peek);
      } catch {
        // best-effort
      }
    };
    void poll();
    const id = window.setInterval(poll, 3000);
    return () => window.clearInterval(id);
  }, [bridgeAvailable]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60_000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, []);
  const [pastedIndex, setPastedIndex] = useState<number | null>(null);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      addToast({
        title: "Copied",
        message: "Result copied to clipboard",
        type: "success",
      });
    } catch (err) {
      addToast({
        title: "Copy Failed",
        message: "Could not copy to clipboard",
        type: "error",
      });
    }
  };

  const handlePin = async (clip: HistoryClip) => {
    try {
      await invokeIPC("history:pin", {
        id: clip.id,
        pinned: clip.is_pinned !== 1,
      });
      await loadData();
      addToast({
        title: clip.is_pinned === 1 ? "Unpinned" : "Pinned",
        message: clip.is_pinned === 1 ? "Item unpinned" : "Item pinned to top",
        type: "success",
      });
    } catch {
      addToast({
        title: "Pin Failed",
        message: "Could not toggle pin state",
        type: "error",
      });
    }
  };

  const handleEnqueue = async (text: string) => {
    try {
      await invokeIPC("queue:enqueue", { text });
      const size = await invokeIPC<number>("queue:size");
      setQueueSize(size);
      addToast({
        title: "Added to Queue",
        message: `Queue: ${size} item(s)`,
        type: "success",
        duration: 2000,
      });
    } catch (err) {
      addToast({
        title: "Enqueue Failed",
        message: String(err),
        type: "error",
      });
    }
  };

  const handleQueuePasteNext = async () => {
    try {
      const next = await invokeIPC<string | null>("queue:dequeue");
      if (next) {
        await navigator.clipboard.writeText(next);
        const size = await invokeIPC<number>("queue:size");
        const peek = await invokeIPC<string | null>("queue:peek");
        setQueueSize(size);
        setQueuePeek(peek);
        addToast({
          title: "Queue Pasted",
          message: "Next item dequeued to clipboard",
          type: "success",
        });
      } else {
        addToast({ title: "Queue Empty", type: "info" });
      }
    } catch (err) {
      addToast({
        title: "Dequeue Failed",
        message: String(err),
        type: "error",
      });
    }
  };

  const handleQueueClear = async () => {
    try {
      await invokeIPC("queue:clear");
      setQueueSize(0);
      setQueuePeek(null);
      addToast({ title: "Queue Cleared", type: "info" });
    } catch (err) {
      addToast({ title: "Clear Failed", message: String(err), type: "error" });
    }
  };

  const handleRerunAi = async (clip: HistoryClip) => {
    const mode = aiModeForClip[clip.id] ?? "fix_grammar";
    setAiRerunLoading((prev) => ({ ...prev, [clip.id]: true }));
    try {
      const result = await invokeIPC<{ rewritten?: string }>("ai:rewrite", {
        text: clip.cleaned_text,
        mode,
      });
      if (result?.rewritten) {
        await navigator.clipboard.writeText(result.rewritten);
        addToast({
          title: "AI Rewrite Copied",
          message: `Mode: ${mode} — result copied to clipboard`,
          type: "success",
          duration: 3000,
        });
      }
    } catch (err) {
      addToast({
        title: "AI Rewrite Failed",
        message: String(err),
        type: "error",
      });
    } finally {
      setAiRerunLoading((prev) => ({ ...prev, [clip.id]: false }));
    }
  };

  const formatRelativeTime = useCallback(
    (dateStr: string) => {
      let safeStr = dateStr;
      if (!safeStr.endsWith("Z") && !safeStr.includes("+") && !safeStr.includes("-")) {
        safeStr = safeStr.replace(" ", "T") + "Z";
      }
      const d = new Date(safeStr);
      const diffMins = Math.floor((nowMs - d.getTime()) / 60000);

      if (diffMins < 1) return "Just now";
      if (diffMins < 60) return `${diffMins}m ago`;
      const diffHours = Math.floor(diffMins / 60);
      if (diffHours < 24) return `${diffHours}h ago`;
      return d.toLocaleDateString();
    },
    [nowMs],
  );

  const normalizedSearch = search.toLowerCase();

  const filteredClips = useMemo(() => {
    const now = new Date(nowMs);
    const startToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    const start7d = nowMs - 7 * 24 * 60 * 60 * 1000;
    const start30d = nowMs - 30 * 24 * 60 * 60 * 1000;

    return clips.filter((clip) => {
      const matchSearch =
        !normalizedSearch ||
        clip.cleaned_text.toLowerCase().includes(normalizedSearch) ||
        clip.content_type.toLowerCase().includes(normalizedSearch);

      const matchType =
        typeFilter === "all" || clip.content_type === typeFilter;

      let safeStr = clip.created_at;
      if (!safeStr.endsWith("Z") && !safeStr.includes("+") && !safeStr.includes("-")) {
        safeStr = safeStr.replace(" ", "T") + "Z";
      }
      const createdAtMs = new Date(safeStr).getTime();
      const matchDate =
        dateFilter === "all" ||
        (dateFilter === "today" && createdAtMs >= startToday) ||
        (dateFilter === "7d" && createdAtMs >= start7d) ||
        (dateFilter === "30d" && createdAtMs >= start30d);

      return matchSearch && matchType && matchDate;
    });
  }, [clips, normalizedSearch, typeFilter, dateFilter, nowMs]);

  // no.3 — Digit keys 1-9 to paste from history ring
  useEffect(() => {
    const handler = async (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key < "1" || e.key > "9") return;
      // Guard: skip when input/textarea is focused
      const tag = (document.activeElement?.tagName ?? "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;

      const index = Number.parseInt(e.key, 10) - 1;
      const clip = filteredClips[index];
      if (!clip) return;

      try {
        await invokeIPC("ring:select", clip.id);
        await navigator.clipboard.writeText(clip.cleaned_text);
        setPastedIndex(index);
        setTimeout(() => setPastedIndex(null), 1500);
      } catch {
        // best-effort
      }
    };

    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [filteredClips]);

  const availableTypes = useMemo(
    () => [
      "all",
      ...Array.from(new Set(clips.map((clip) => clip.content_type))),
    ],
    [clips],
  );

  const selectedCount = selectedIds.size;

  const visibleSelectedIds = useMemo(
    () =>
      filteredClips
        .filter((clip) => selectedIds.has(clip.id))
        .map((clip) => clip.id),
    [filteredClips, selectedIds],
  );

  const allVisibleSelected =
    filteredClips.length > 0 &&
    filteredClips.every((clip) => selectedIds.has(clip.id));

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAllVisible = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allVisibleSelected) {
        for (const clip of filteredClips) {
          next.delete(clip.id);
        }
      } else {
        for (const clip of filteredClips) {
          next.add(clip.id);
        }
      }
      return next;
    });
  };

  const handleBulkCopy = async () => {
    const selected = clips.filter((clip) => selectedIds.has(clip.id));
    if (selected.length === 0) {
      return;
    }
    const text = selected.map((clip) => clip.cleaned_text).join("\n\n");
    await handleCopy(text);
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0) {
      return;
    }

    const deletedCache = clips.filter((clip) => selectedIds.has(clip.id));
    try {
      await invokeIPC<boolean>("history:delete-many", { ids });

      let undone = false;
      setSelectedIds(new Set());
      await loadData();
      addToast({
        title: "Deleted",
        message: `${ids.length} item${ids.length > 1 ? "s" : ""} removed`,
        type: "success",
        duration: 5000,
        action: {
          label: "Undo",
          onClick: async () => {
            if (undone || deletedCache.length === 0) {
              return;
            }
            undone = true;
            await invokeIPC<boolean>("history:restore", {
              entries: deletedCache.map((clip) => ({
                originalText: clip.original_text,
                cleanedText: clip.cleaned_text,
                htmlContent: clip.html_content ?? null,
                contentType: clip.content_type,
                sourceApp: clip.source_app ?? null,
                presetUsed: clip.preset_used ?? "default",
                charCount: clip.char_count ?? clip.cleaned_text.length,
                isPinned: Boolean(clip.is_pinned),
                isSensitive: Boolean(clip.is_sensitive),
                createdAt: clip.created_at,
              })),
            });
            await loadData();
            addToast({
              title: "Restored",
              message: `${deletedCache.length} item${deletedCache.length > 1 ? "s" : ""} restored`,
              type: "info",
            });
          },
        },
      });
    } catch {
      addToast({
        title: "Delete Failed",
        message: "Could not delete selected items",
        type: "error",
      });
    }
  };

  const handleDeleteOne = async (clip: HistoryClip) => {
    try {
      await invokeIPC<boolean>("history:delete", { id: clip.id });
      setSelectedIds((prev) => {
        if (!prev.has(clip.id)) {
          return prev;
        }
        const next = new Set(prev);
        next.delete(clip.id);
        return next;
      });
      await loadData();
      addToast({
        title: "Deleted",
        message: "Item removed from history",
        type: "success",
      });
    } catch {
      addToast({
        title: "Delete Failed",
        message: "Could not delete history item",
        type: "error",
      });
    }
  };

  const handleDeleteAll = async () => {
    if (clips.length === 0) {
      return;
    }
    const confirmed = window.confirm(
      `Delete all ${clips.length} history items? This can be undone from the next toast only.`,
    );
    if (!confirmed) {
      return;
    }

    const deletedCache = [...clips];
    try {
      await invokeIPC<boolean>("history:clear");
      setSelectedIds(new Set());
      await loadData();
      let undone = false;
      addToast({
        title: "History Cleared",
        message: "All history items have been deleted",
        type: "success",
        duration: 7000,
        action: {
          label: "Undo",
          onClick: async () => {
            if (undone || deletedCache.length === 0) {
              return;
            }
            undone = true;
            await invokeIPC<boolean>("history:restore", {
              entries: deletedCache.map((clip) => ({
                originalText: clip.original_text,
                cleanedText: clip.cleaned_text,
                htmlContent: clip.html_content ?? null,
                contentType: clip.content_type,
                sourceApp: clip.source_app ?? null,
                presetUsed: clip.preset_used ?? "default",
                charCount: clip.char_count ?? clip.cleaned_text.length,
                isPinned: Boolean(clip.is_pinned),
                isSensitive: Boolean(clip.is_sensitive),
                createdAt: clip.created_at,
              })),
            });
            await loadData();
            addToast({
              title: "Restored",
              message: `${deletedCache.length} item${deletedCache.length > 1 ? "s" : ""} restored`,
              type: "info",
            });
          },
        },
      });
    } catch {
      addToast({
        title: "Clear Failed",
        message: "Could not clear history",
        type: "error",
      });
    }
  };

  const renderedClips = useMemo(() => {
    return filteredClips.map((clip) => ({
      ...clip,
      relativeTime: formatRelativeTime(clip.created_at),
      shortText:
        clip.cleaned_text.length > 120
          ? `${clip.cleaned_text.substring(0, 120)}...`
          : clip.cleaned_text,
    }));
  }, [filteredClips, formatRelativeTime]);

  const handleExport = async (format: "csv" | "json") => {
    try {
      const result = await invokeIPC<{ data: string; filename: string }>(
        "history:export",
        { format },
      );
      if (!result) return;
      const blob = new Blob([result.data], {
        type: format === "json" ? "application/json" : "text/csv",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);
      addToast({
        title: "Exported",
        message: `History exported as ${result.filename}`,
        type: "success",
      });
    } catch (err) {
      addToast({ title: "Export Failed", message: String(err), type: "error" });
    }
  };

  return (
    <div className={styles.page}>
      {/* Phase 4 — Paste Queue Bar */}
      <div className={styles.queueBar} aria-live="polite" aria-atomic="true">
        <span className={styles.queueStatus}>
          <Link2Icon width={16} height={16} style={{ marginRight: 6 }} />
          {queueSize === 1
            ? t("history.queue_label", { count: queueSize })
            : t("history.queue_label_plural", { count: queueSize })}
          {queuePeek && (
            <span style={{ opacity: 0.6, marginLeft: 6, fontWeight: 400 }}>
              {t("history.queue_next", { text: queuePeek.slice(0, 30) })}
              {queuePeek.length > 30 ? "…" : ""}
            </span>
          )}
        </span>
        <div className={styles.queueActions}>
          <button
            type="button"
            className={styles.queueBtn}
            onClick={handleQueuePasteNext}
            disabled={queueSize === 0}
          >
            {t("history.paste_next")}
          </button>
          <button
            type="button"
            className={styles.queueBtn}
            onClick={handleQueueClear}
            disabled={queueSize === 0}
          >
            {t("history.clear_queue")}
          </button>
        </div>
      </div>

      {/* ── Quick Queue (F no.4) ───────────────────────────────── */}
      {clips.length > 0 && (
        <div className={styles.quickQueue}>
          <div className={styles.quickQueueLabel}>
            <KeyboardIcon width={14} height={14} style={{ marginRight: 6 }} /> 
            {t("history.quick_queue", { count: Math.min(5, clips.length) })}
          </div>
          <div className={styles.quickQueueButtons}>
            {clips.slice(0, 5).map((clip, idx) => (
              <button
                type="button"
                key={clip.id}
                className={styles.quickQueueBtn}
                title={clip.cleaned_text}
                aria-label={`Load queue slot ${idx + 1}`}
                onClick={() => invokeIPC("ring:select", clip.id)}
              >
                <strong>{idx + 1}</strong> {clip.cleaned_text.slice(0, 20)}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className={styles.header}>
        <h1 className={styles.title}>{t("history.title")}</h1>
        <div className={styles.searchBox}>
          <svg
            aria-hidden="true"
            focusable="false"
            className={styles.searchIcon}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="search"
            className={styles.searchInput}
            placeholder={t("history.search_placeholder")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            aria-label={t("history.search_placeholder")}
          />
        </div>
      </div>

      <div className={styles.filterRow}>
        <label className={styles.filterField}>
          <span>{t("history.type")}</span>
          <select
            className={styles.select}
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            aria-label={t("history.type_filter")}
          >
            {availableTypes.map((type) => (
              <option key={type} value={type}>
                {type === "all"
                  ? t("history.all_types")
                  : type.replace("_", " ")}
              </option>
            ))}
          </select>
        </label>

        <label className={styles.filterField}>
          <span>{t("history.date_range")}</span>
          <select
            className={styles.select}
            value={dateFilter}
            onChange={(e) =>
              setDateFilter(e.target.value as "all" | "today" | "7d" | "30d")
            }
            aria-label={t("history.date_range_filter")}
          >
            <option value="all">{t("history.all_time")}</option>
            <option value="today">{t("history.today")}</option>
            <option value="7d">{t("history.last_7d")}</option>
            <option value="30d">{t("history.last_30d")}</option>
          </select>
        </label>

        <Button variant="ghost" size="sm" onClick={toggleSelectAllVisible}>
          {allVisibleSelected
            ? t("history.clear_visible")
            : t("history.select_visible")}
        </Button>
      </div>

      <div className={styles.bulkRow}>
        <span className={styles.bulkLabel}>
          {t("history.selected", { count: selectedCount })}
          {visibleSelectedIds.length !== selectedCount
            ? ` ${t("history.visible_selected", {
                count: visibleSelectedIds.length,
              })}`
            : ""}
        </span>
        <div className={styles.bulkActions}>
          <Button
            variant="secondary"
            size="sm"
            onClick={handleBulkCopy}
            disabled={selectedCount === 0}
          >
            {t("history.copy_selected")}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleBulkDelete}
            disabled={selectedCount === 0}
          >
            {t("history.delete_selected")}
          </Button>
          <Button
            variant="danger"
            size="sm"
            onClick={handleDeleteAll}
            disabled={clips.length === 0}
          >
            {t("history.delete_all")}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleExport("json")}
          >
            {t("history.export_json")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleExport("csv")}>
            {t("history.export_csv")}
          </Button>
        </div>
      </div>

      <div className={styles.list}>
        {loading ? (
          <div className={styles.skeletonList}>
            {[0, 1, 2, 3, 4].map((slot) => (
              <div key={slot} className={styles.skeletonRow} />
            ))}
          </div>
        ) : renderedClips.length > 0 ? (
          renderedClips.map((clip, index) => (
            <div
              key={clip.id}
              className={styles.clipItem}
              data-ring-index={index}
              data-pinned={clip.is_pinned === 1 ? "true" : undefined}
            >
              <label className={styles.checkWrap}>
                <input
                  type="checkbox"
                  checked={selectedIds.has(clip.id)}
                  onChange={() => toggleSelect(clip.id)}
                  aria-label={`Select history item ${index + 1}`}
                />
              </label>
              <div className={styles.clipIcon}>
                {CONTENT_TYPE_ICONS[clip.content_type] || "📄"}
              </div>
              <div className={styles.clipContent}>
                <div className={styles.clipText}>{clip.shortText}</div>
                <div className={styles.clipMeta}>
                  <span className={styles.clipType}>
                    {clip.content_type.replace("_", " ")}
                  </span>
                  <span className={styles.clipTime}>{clip.relativeTime}</span>
                </div>
              </div>
              {pastedIndex === index && (
                <span
                  style={{
                    color: "var(--accent-success)",
                    fontSize: 12,
                    fontWeight: 600,
                    marginRight: 4,
                  }}
                >
                  {t("history.pasted")}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(clip.cleaned_text)}
                className={styles.copyBtn}
                aria-label="Copy history item"
              >
                {t("common.copy")}
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => void handleDeleteOne(clip)}
                className={styles.copyBtn}
                aria-label="Delete history item"
              >
                {t("common.delete")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleEnqueue(clip.cleaned_text)}
                className={styles.copyBtn}
                aria-label="Add history item to queue"
              >
                {t("history.queue_add")}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePin(clip)}
                className={styles.copyBtn}
                aria-label={
                  clip.is_pinned === 1
                    ? "Unpin history item"
                    : "Pin history item"
                }
              >
                {clip.is_pinned === 1
                  ? <><DrawingPinFilledIcon style={{ marginRight: 4 }} /> {t("history.pinned")}</>
                  : <><DrawingPinIcon style={{ marginRight: 4 }} /> {t("history.pin")}</>}
              </Button>
              <select
                className={styles.aiModeSelect}
                value={aiModeForClip[clip.id] ?? "fix_grammar"}
                onChange={(e) =>
                  setAiModeForClip((prev) => ({
                    ...prev,
                    [clip.id]: e.target.value,
                  }))
                }
                aria-label={t("history.ai_rewrite_mode")}
              >
                <option value="fix_grammar">
                  {t("history.ai_fix_grammar")}
                </option>
                <option value="rephrase">{t("history.ai_rephrase")}</option>
                <option value="summarize">{t("history.ai_summarize")}</option>
                <option value="formalize">{t("history.ai_formalize")}</option>
              </select>
              <Button
                variant="ghost"
                size="sm"
                className={styles.copyBtn}
                disabled={aiRerunLoading[clip.id] === true}
                onClick={() => void handleRerunAi(clip)}
                aria-label="Run AI rewrite for history item"
              >
                {aiRerunLoading[clip.id] ? "..." : <><MagicWandIcon style={{ marginRight: 4 }}/> AI</>}
              </Button>
            </div>
          ))
        ) : (
          <EmptyState
            icon={<ClockIcon width={32} height={32} />}
            title={
              !bridgeAvailable
                ? t("history.desktop_only")
                : search
                  ? t("history.no_matches")
                  : t("history.empty")
            }
            subtitle={
              !bridgeAvailable
                ? t("history.desktop_only_subtitle")
                : search
                  ? t("history.no_matches_subtitle")
                  : t("history.empty_subtitle")
            }
          />
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className={styles.batchBar}>
          <span className={styles.batchCount}>{selectedIds.size} selected</span>
          <select
            className={styles.batchSelect}
            value={batchRewriteMode}
            onChange={(e) => setBatchRewriteMode(e.target.value)}
            disabled={isBatchRunning}
          >
            <option value="fix_grammar">{t("history.ai_fix_grammar")}</option>
            <option value="rephrase">{t("history.ai_rephrase")}</option>
            <option value="summarize">{t("history.ai_summarize")}</option>
            <option value="formalize">{t("history.ai_formalize")}</option>
            <option value="bullet_list">Bullet List</option>
          </select>
          <button
            type="button"
            className={styles.batchRunBtn}
            onClick={() => void handleBatchRewrite()}
            disabled={isBatchRunning}
          >
            {isBatchRunning
              ? t("history.batch_running")
              : t("history.batch_run")}
          </button>
          <button
            type="button"
            className={styles.batchRunBtn}
            onClick={() => setSelectedIds(new Set())}
            disabled={isBatchRunning}
          >
            {t("common.clear")}
          </button>
        </div>
      )}
    </div>
  );
};
