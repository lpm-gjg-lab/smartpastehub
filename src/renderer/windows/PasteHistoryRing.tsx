import React, { useState, useEffect, useRef, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { invokeIPC } from "../lib/ipc";
import { Cross2Icon } from "@radix-ui/react-icons";

interface StackItem {
  id: number;
  slotIndex: number;
  content: string;
  originalText: string;
  hasBeenCleaned: boolean;
  contentType: string;
  timestamp: number;
}

function timeAgo(
  ts: number,
  t: (key: string, options?: Record<string, unknown>) => string,
): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) {
    return t("window.ring.seconds_ago", { count: Math.floor(diff / 1000) });
  }
  if (diff < 3_600_000) {
    return t("window.ring.minutes_ago", { count: Math.floor(diff / 60_000) });
  }
  return t("window.ring.hours_ago", { count: Math.floor(diff / 3_600_000) });
}

export default function PasteHistoryRing() {
  const { t } = useTranslation();
  const [items, setItems] = useState<StackItem[]>([]);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  const loadItems = useCallback(async () => {
    try {
      const q = query.trim();
      const channel = q ? "ring:search" : "ring:get-items";
      const entries = await invokeIPC<StackItem[]>(channel, q || undefined);
      setItems(entries ?? []);
      setSelected(0);
    } catch (err) {
      console.error("Failed to load ring items:", err);
      setItems([]);
      setSelected(0);
    }
  }, [query]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    async (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        setSelected((s) => Math.min(s + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        setSelected((s) => Math.max(s - 1, 0));
      } else if (e.key === "Enter") {
        const item = items[selected];
        if (item) await invokeIPC("ring:select", item.id);
      } else if (e.key === "o" || e.key === "O") {
        const item = items[selected];
        if (item?.hasBeenCleaned)
          await invokeIPC("ring:select-original", item.id);
      } else if (e.key === "Escape") {
        window.close();
      } else if (e.key === "Delete") {
        const item = items[selected];
        if (item) {
          await invokeIPC("ring:delete", item.id);
          void loadItems();
        }
      }
    },
    [items, selected, loadItems],
  );

  useEffect(() => {
    const listener = (e: KeyboardEvent) => {
      void handleKeyDown(e);
    };
    window.addEventListener("keydown", listener);
    return () => {
      window.removeEventListener("keydown", listener);
    };
  }, [handleKeyDown]);

  const handlePin = async (id: number) => {
    await invokeIPC("ring:pin", id);
    void loadItems();
  };

  const preview = (content: string) =>
    content.length > 80 ? content.slice(0, 80) + "…" : content;

  return (
    <div
      className="window-drag-region"
      style={{
        width: "100%",
        height: "100%",
        maxHeight: 400,
        background: "var(--bg-tertiary)",
        backdropFilter: "blur(12px)",
        borderRadius: 10,
        border: "1px solid rgba(255,255,255,0.12)",
        boxShadow: "var(--shadow-md)",
        display: "flex",
        flexDirection: "column",
        fontFamily: "var(--font-sans)",
        color: "var(--text-primary)",
        overflow: "hidden",
      }}
    >
      {/* Header with close button */}
      <div
        style={{
          padding: "8px 12px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 600 }}>History Ring</span>
        <button
          type="button"
          className="window-no-drag"
          onClick={() => window.close()}
          aria-label="Close window"
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontSize: 16,
          }}
        >
          <Cross2Icon />
        </button>
      </div>
      {/* Search bar */}
      <div
        className="window-no-drag"
        style={{
          padding: "8px 10px",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("window.ring.search_placeholder")}
          style={{
            width: "100%",
            background: "var(--glass-bg-hover)",
            border: "none",
            borderRadius: 6,
            padding: "6px 10px",
            color: "var(--text-primary)",
            fontSize: 13,
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>
      {/* Items list */}
      <div className="window-no-drag" style={{ overflowY: "auto", flex: 1 }}>
        {items.length === 0 && (
          <div
            style={{
              padding: 16,
              textAlign: "center",
              opacity: 0.5,
              fontSize: 13,
            }}
          >
            {t("window.ring.no_items")}
          </div>
        )}
        {items.map((item, idx) => (
          <div
            key={item.id}
            style={{
              padding: "8px 12px",
              cursor: "pointer",
              background:
                idx === selected ? "var(--accent-glow)" : "transparent",
              borderBottom: "1px solid var(--border-subtle)",
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            <button
              type="button"
              onClick={() => setSelected(idx)}
              onDoubleClick={() => void invokeIPC("ring:select", item.id)}
              style={{
                flex: 1,
                minWidth: 0,
                background: "transparent",
                border: "none",
                color: "inherit",
                padding: 0,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  fontSize: 12,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {preview(item.content)}
                {item.hasBeenCleaned && (
                  <span
                    title={`${t("window.ring.original_prefix")}: ${item.originalText.slice(0, 120)}${item.originalText.length > 120 ? "…" : ""}`}
                    style={{
                      marginLeft: 5,
                      fontSize: 9,
                      background: "var(--accent-primary, #4f8ef7)",
                      color: "#fff",
                      borderRadius: 3,
                      padding: "1px 4px",
                      verticalAlign: "middle",
                      opacity: 0.85,
                      cursor: "help",
                    }}
                  >
                    {t("window.ring.cleaned_badge")}
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>
                {item.contentType} · {timeAgo(item.timestamp, t)}
              </div>
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                void handlePin(item.id);
              }}
              title={t("window.ring.pin_to_top")}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-tertiary)",
                fontSize: 12,
                padding: "2px 4px",
              }}
            >
              Pin
            </button>
          </div>
        ))}
      </div>

      {/* Footer hint */}
      <div
        style={{
          padding: "4px 12px",
          fontSize: 10,
          opacity: 0.4,
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        {t("window.ring.footer_hint")}
      </div>
    </div>
  );
}
