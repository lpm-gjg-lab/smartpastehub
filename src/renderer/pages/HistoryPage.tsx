import React, { useCallback, useEffect, useMemo, useState } from "react";
import styles from "../styles/pages/HistoryPage.module.css";
import { invokeIPC, onIPC } from "../lib/ipc";
import { Button } from "../components/Button";
const CONTENT_TYPE_ICONS: Record<string, string> = {
  plain_text: "📄",
  pdf_text: "📋",
  url_text: "🔗",
  source_code: "💻",
  json_data: "｛",
  csv_table: "📊",
  html_table: "🗂️",
  email_text: "✉️",
  address: "📍",
  date_text: "📅",
};
import type { ContentType } from "../../shared/types";
import { useToastStore } from "../stores/useToastStore";

interface HistoryClip {
  id: number;
  original_text: string;
  cleaned_text: string;
  content_type: ContentType;
  created_at: string;
}

interface UsageSummary {
  recentClips?: HistoryClip[];
  [key: string]: unknown;
}

export const HistoryPage: React.FC = () => {
  const [clips, setClips] = useState<HistoryClip[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [nowMs, setNowMs] = useState(() => Date.now());
  const { addToast } = useToastStore();

  const loadData = useCallback(async () => {
    try {
      const summary = await invokeIPC<UsageSummary>("usage:summary");
      if (summary?.recentClips) {
        setClips(summary.recentClips);
      }
    } catch (err) {
      console.error("Failed to load history", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
    const cleanup = onIPC("usage:updated", () => loadData());
    return cleanup;
  }, [loadData]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowMs(Date.now());
    }, 60_000);
    return () => {
      window.clearInterval(intervalId);
    };
  }, []);

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

  const formatRelativeTime = useCallback(
    (dateStr: string) => {
      const d = new Date(dateStr);
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
    if (!normalizedSearch) {
      return clips;
    }
    return clips.filter(
      (clip) =>
        clip.cleaned_text.toLowerCase().includes(normalizedSearch) ||
        clip.content_type.toLowerCase().includes(normalizedSearch),
    );
  }, [clips, normalizedSearch]);

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

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <h1 className={styles.title}>History</h1>
        <div className={styles.searchBox}>
          <svg
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
            type="text"
            className={styles.searchInput}
            placeholder="Search history..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className={styles.list}>
        {loading ? (
          <div className={styles.emptyState}>Loading...</div>
        ) : renderedClips.length > 0 ? (
          renderedClips.map((clip) => (
            <div key={clip.id} className={styles.clipItem}>
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
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleCopy(clip.cleaned_text)}
                className={styles.copyBtn}
              >
                Copy
              </Button>
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon}>🕰️</div>
            <p>
              {search
                ? "No matches found."
                : "No cleaned pastes yet. Start pasting!"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
