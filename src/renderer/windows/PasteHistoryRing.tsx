import React, { useState, useEffect, useRef, useCallback } from 'react';

interface StackItem {
  id: number;
  slotIndex: number;
  content: string;
  contentType: string;
  timestamp: number;
}

declare global {
  interface Window {
    electronAPI?: {
      invoke: (channel: string, payload?: unknown) => Promise<unknown>;
    };
  }
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts;
  if (diff < 60_000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  return `${Math.floor(diff / 3_600_000)}h ago`;
}

export default function PasteHistoryRing() {
  const [items, setItems] = useState<StackItem[]>([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const searchRef = useRef<HTMLInputElement>(null);

  const loadItems = useCallback(async () => {
    const q = query.trim();
    const channel = q ? 'ring:search' : 'ring:get-items';
    const res = (await window.electronAPI?.invoke(channel, q || undefined)) as
      | { data: StackItem[] }
      | undefined;
    setItems(res?.data ?? []);
    setSelected(0);
  }, [query]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback(
    async (e: React.KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        setSelected((s) => Math.min(s + 1, items.length - 1));
      } else if (e.key === 'ArrowUp') {
        setSelected((s) => Math.max(s - 1, 0));
      } else if (e.key === 'Enter') {
        const item = items[selected];
        if (item) await window.electronAPI?.invoke('ring:select', item.id);
      } else if (e.key === 'Escape') {
        await window.electronAPI?.invoke('ring:hide');
      } else if (e.key === 'Delete') {
        const item = items[selected];
        if (item) {
          await window.electronAPI?.invoke('ring:delete', item.id);
          void loadItems();
        }
      }
    },
    [items, selected, loadItems],
  );

  const handlePin = async (id: number) => {
    await window.electronAPI?.invoke('ring:pin', id);
    void loadItems();
  };

  const preview = (content: string) =>
    content.length > 80 ? content.slice(0, 80) + '…' : content;

  return (
    <div
      onKeyDown={handleKeyDown}
      style={{
        width: 320,
        maxHeight: 400,
        background: 'rgba(20,20,30,0.92)',
        backdropFilter: 'blur(12px)',
        borderRadius: 10,
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'system-ui, sans-serif',
        color: '#e8e8f0',
        overflow: 'hidden',
      }}
    >
      {/* Search bar */}
      <div
        style={{
          padding: '8px 10px',
          borderBottom: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <input
          ref={searchRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search clipboard…"
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.08)',
            border: 'none',
            borderRadius: 6,
            padding: '6px 10px',
            color: '#e8e8f0',
            fontSize: 13,
            outline: 'none',
            boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Items list */}
      <div style={{ overflowY: 'auto', flex: 1 }}>
        {items.length === 0 && (
          <div
            style={{
              padding: 16,
              textAlign: 'center',
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
            onDoubleClick={() =>
              void window.electronAPI?.invoke('ring:select', item.id)
            }
            style={{
              padding: '8px 12px',
              cursor: 'pointer',
              background:
                idx === selected ? 'rgba(100,120,255,0.25)' : 'transparent',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: 8,
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 12,
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                }}
              >
                {preview(item.content)}
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
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: 'rgba(255,255,255,0.4)',
                fontSize: 12,
                padding: '2px 4px',
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
          padding: '4px 12px',
          fontSize: 10,
          opacity: 0.4,
          borderTop: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        ↑↓ navigate · Enter paste · Del remove · Esc close
      </div>
    </div>
  );
}
