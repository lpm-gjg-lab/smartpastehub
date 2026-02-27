import React, { useState, useEffect, useRef, useCallback } from "react";
import { invokeIPC } from "../lib/ipc";

interface StackItem {
  id: number;
  slotIndex: number;
  content: string;
  originalText: string;
  hasBeenCleaned: boolean;
  contentType: string;
  timestamp: number;
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

export default function PasteHistoryRing() {
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
    async (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        setSelected((s) => Math.min(s + 1, items.length - 1));
      } else if (e.key === "ArrowUp") {
        setSelected((s) => Math.max(s - 1, 0));
      } else if (e.key === "Enter") {
        const item = items[selected];
        if (item) await invokeIPC("ring:select", item.id);
      } else if (e.key === "o" || e.key === "O") {
        const item = items[selected];
        if (item?.hasBeenCleaned) await invokeIPC("ring:select-original", item.id);
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

  const handlePin = async (id: number) => {
    await invokeIPC("ring:pin", id);
    void loadItems();
  };

  const preview = (content: string) =>
    content.length > 80 ? content.slice(0, 80) + "…" : content;

  return (
    <div
      onKeyDown={handleKeyDown}
      style={{
        width: 320,
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
      {/* Search bar */}
      <div
        style={{
          padding: "8px 10px",
          borderBottom: "1px solid var(--border-subtle)",
        }}
      >
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clipboard…"
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
      <div style={{ overflowY: "auto", flex: 1 }}>
        {items.length === 0 && (
          <div
            style={{
              padding: 16,
              textAlign: "center",
              opacity: 0.5,
              fontSize: 13,
            }}
          >
            No items
          </div>
        )}
        {items.map((item, idx) => (
          <div
            key={item.id}
            onClick={() => setSelected(idx)}
            onDoubleClick={() => void invokeIPC("ring:select", item.id)}
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
            <div style={{ flex: 1, minWidth: 0 }}>
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
                    title={`Original: ${item.originalText.slice(0, 120)}${item.originalText.length > 120 ? "…" : ""}`}
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
                    cleaned
                  </span>
                )}
              </div>
              <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>
                {item.contentType} · {timeAgo(item.timestamp)}
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                void handlePin(item.id);
              }}
              title="Pin to top"
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                color: "var(--text-tertiary)",
                fontSize: 12,
                padding: "2px 4px",
              }}
            >
              📌
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
        ↑↓ navigate · Enter paste cleaned · O paste original · Del remove · Esc close
      </div>
    </div>
  );
}
