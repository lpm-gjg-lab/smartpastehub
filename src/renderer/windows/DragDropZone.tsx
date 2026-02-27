import React, { useState, useEffect, useCallback, useRef } from "react";
import { invokeIPC } from "../lib/ipc";

interface ZoneItem {
  id: number;
  content: string;
  contentType: string;
}

const BADGE_COLORS: Record<string, string> = {
  plain_text: "#4a9eff",
  code: "#a78bfa",
  json: "#34d399",
  url: "#f59e0b",
  email: "#f87171",
};

function badgeColor(ct: string): string {
  return BADGE_COLORS[ct] ?? "#9ca3af";
}

export default function DragDropZone() {
  const [items, setItems] = useState<ZoneItem[]>([]);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [dragSrcId, setDragSrcId] = useState<number | null>(null);
  const zoneRef = useRef<HTMLDivElement>(null);

  const loadItems = useCallback(async () => {
    try {
      const nextItems = await invokeIPC<ZoneItem[]>("dragdrop:get-items");
      setItems(nextItems ?? []);
    } catch (err) {
      console.error("Failed to load drag-drop items:", err);
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  /* ── External drop (from other apps) ── */
  const handleZoneDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "copy";
  };

  const handleZoneDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const text = e.dataTransfer.getData("text/plain");
    if (!text) return;
    await invokeIPC("dragdrop:add-item", {
      content: text,
      contentType: "plain_text",
    });
    void loadItems();
  };

  /* ── Internal drag-to-reorder ── */
  const handleCardDragStart = (id: number) => {
    setDragSrcId(id);
  };

  const handleCardDragOver = (e: React.DragEvent, id: number) => {
    e.preventDefault();
    if (dragSrcId !== id) setDragOverId(id);
  };

  const handleCardDrop = async (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (dragSrcId === null || dragSrcId === targetId) return;
    const ids = items.map((i) => i.id);
    const srcIdx = ids.indexOf(dragSrcId);
    const tgtIdx = ids.indexOf(targetId);
    const reordered = [...ids];
    reordered.splice(srcIdx, 1);
    reordered.splice(tgtIdx, 0, dragSrcId);
    await invokeIPC("dragdrop:reorder", reordered);
    setDragSrcId(null);
    setDragOverId(null);
    void loadItems();
  };

  const handleCardDragEnd = () => {
    setDragSrcId(null);
    setDragOverId(null);
  };

  /* ── Actions ── */
  const handleCombine = async () => {
    const res = await invokeIPC<string>("dragdrop:combine", {
      separator: "\n",
    });
    if (res) {
      await navigator.clipboard.writeText(res);
    }
  };

  const handleCopyAll = async () => {
    const combined = items.map((i) => i.content).join("\n");
    await navigator.clipboard.writeText(combined);
  };

  const handleClear = async () => {
    await invokeIPC("dragdrop:clear");
    void loadItems();
  };

  const preview = (s: string) => (s.length > 60 ? s.slice(0, 60) + "…" : s);

  return (
    <div
      style={{
        width: 400,
        height: 500,
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-tertiary)",
        backdropFilter: "blur(16px)",
        fontFamily: "var(--font-sans)",
        color: "var(--text-primary)",
        overflow: "hidden",
        borderRadius: 12,
        border: "1px solid var(--glass-border)",
        boxShadow: "var(--shadow-lg)",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "10px 14px",
          borderBottom: "1px solid var(--border-subtle)",
          fontWeight: 600,
          fontSize: 13,
          display: "flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        <span>⬇</span>
        <span>Drag & Drop Zone</span>
        <span style={{ marginLeft: "auto", fontSize: 11, opacity: 0.5 }}>
          {items.length} item{items.length !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Drop zone */}
      <div
        ref={zoneRef}
        onDragOver={handleZoneDragOver}
        onDrop={(e) => void handleZoneDrop(e)}
        style={{
          flex: 1,
          overflowY: "auto",
          padding: items.length === 0 ? 0 : "6px 8px",
          display: "flex",
          flexDirection: "column",
          gap: 4,
        }}
      >
        {items.length === 0 ? (
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              opacity: 0.4,
              gap: 8,
            }}
          >
            <div style={{ fontSize: 32 }}>📋</div>
            <div style={{ fontSize: 12 }}>Drop text here from any app</div>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              draggable
              onDragStart={() => handleCardDragStart(item.id)}
              onDragOver={(e) => handleCardDragOver(e, item.id)}
              onDrop={(e) => void handleCardDrop(e, item.id)}
              onDragEnd={handleCardDragEnd}
              style={{
                background:
                  dragOverId === item.id
                    ? "var(--accent-glow)"
                    : "var(--glass-bg)",
                borderRadius: 8,
                padding: "8px 10px",
                border:
                  dragOverId === item.id
                    ? "1px solid var(--border-accent)"
                    : "1px solid var(--glass-border)",
                cursor: "grab",
                display: "flex",
                alignItems: "flex-start",
                gap: 8,
                transition: "background 0.12s",
              }}
            >
              {/* Drag handle */}
              <span style={{ opacity: 0.35, fontSize: 14, userSelect: "none" }}>
                ⠿
              </span>
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
                </div>
                <span
                  style={{
                    display: "inline-block",
                    marginTop: 4,
                    fontSize: 10,
                    padding: "1px 6px",
                    borderRadius: 4,
                    background: badgeColor(item.contentType),
                    color: "#fff",
                  }}
                >
                  {item.contentType}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Action bar */}
      <div
        style={{
          padding: "8px 12px",
          borderTop: "1px solid var(--border-subtle)",
          display: "flex",
          gap: 8,
        }}
      >
        {[
          { label: "Combine", onClick: handleCombine, primary: true },
          { label: "Copy All", onClick: handleCopyAll, primary: false },
          { label: "Clear", onClick: handleClear, primary: false },
        ].map(({ label, onClick, primary }) => (
          <button
            key={label}
            onClick={() => void onClick()}
            style={{
              flex: primary ? 2 : 1,
              padding: "6px 0",
              borderRadius: 6,
              border: "none",
              cursor: "pointer",
              fontSize: 12,
              fontWeight: primary ? 600 : 400,
              background: primary
                ? "var(--accent-primary)"
                : "var(--glass-bg-hover)",
              color: "#fff",
              transition: "opacity 0.12s",
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
