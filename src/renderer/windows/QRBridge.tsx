import React, { useState, useEffect, useCallback } from "react";
import { invokeIPC } from "../lib/ipc";

type ErrorCorrection = "L" | "M" | "Q" | "H";

export default function QRBridge() {
  const [inputText, setInputText] = useState("");
  const [dataUrls, setDataUrls] = useState<string[]>([]);
  const [currentChunk, setCurrentChunk] = useState(0);
  const [errorCorrection, setErrorCorrection] = useState<ErrorCorrection>("M");
  const [size, setSize] = useState(256);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const generateQR = useCallback(async () => {
    if (!inputText.trim()) {
      setDataUrls([]);
      setError("");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await invokeIPC<{ dataUrls: string[]; chunks: number }>(
        "qr:generate",
        {
          text: inputText,
          options: { errorCorrection, size },
        },
      );
      if (res) {
        setDataUrls(res.dataUrls);
        setCurrentChunk(0);
      }
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
    }
  }, [inputText, errorCorrection, size]);

  // Load clipboard on mount
  useEffect(() => {
    void (async () => {
      try {
        const text = await navigator.clipboard.readText();
        if (text) setInputText(text);
      } catch {
        // clipboard permission may be denied — ignore
      }
    })();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => void generateQR(), 300);
    return () => clearTimeout(t);
  }, [generateQR]);

  const handleCopyImage = async () => {
    const url = dataUrls[currentChunk];
    if (!url) return;
    // Convert data URL to blob and write to clipboard
    const res = await fetch(url);
    const blob = await res.blob();
    await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const handleSave = async () => {
    const url = dataUrls[currentChunk];
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    a.download = `qr-${currentChunk + 1}-of-${dataUrls.length}.png`;
    a.click();
  };

  const ecLevels: ErrorCorrection[] = ["L", "M", "Q", "H"];

  return (
    <div
      style={{
        width: 360,
        height: 460,
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
        }}
      >
        📱 QR Code Bridge
      </div>

      {/* Content */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "10px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {/* Text input */}
        <div>
          <label style={{ fontSize: 11, opacity: 0.6 }}>Text to encode</label>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste text here or it loads from clipboard automatically"
            rows={3}
            style={{
              display: "block",
              width: "100%",
              marginTop: 4,
              padding: "6px 8px",
              background: "var(--glass-bg)",
              border: "1px solid var(--glass-border)",
              borderRadius: 6,
              color: "var(--text-primary)",
              fontSize: 12,
              resize: "none",
              boxSizing: "border-box",
            }}
          />
        </div>

        {/* Controls */}
        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <div>
            <label style={{ fontSize: 11, opacity: 0.6 }}>
              Error correction
            </label>
            <div style={{ display: "flex", gap: 4, marginTop: 4 }}>
              {ecLevels.map((lvl) => (
                <button
                  key={lvl}
                  onClick={() => setErrorCorrection(lvl)}
                  style={{
                    padding: "3px 8px",
                    borderRadius: 4,
                    border: "none",
                    cursor: "pointer",
                    fontSize: 11,
                    background:
                      errorCorrection === lvl
                        ? "var(--accent-primary)"
                        : "var(--glass-bg-hover)",
                    color: "#fff",
                  }}
                >
                  {lvl}
                </button>
              ))}
            </div>
          </div>

          <div style={{ flex: 1 }}>
            <label style={{ fontSize: 11, opacity: 0.6 }}>Size: {size}px</label>
            <input
              type="range"
              min={128}
              max={512}
              step={32}
              value={size}
              onChange={(e) => setSize(Number(e.target.value))}
              style={{ display: "block", width: "100%", marginTop: 6 }}
            />
          </div>
        </div>

        {/* QR display */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            minHeight: 160,
            background: "var(--glass-bg)",
            borderRadius: 8,
            border: "1px solid var(--glass-border)",
          }}
        >
          {loading && (
            <div style={{ opacity: 0.5, fontSize: 12 }}>Generating…</div>
          )}
          {error && (
            <div style={{ color: "var(--accent-danger)", fontSize: 12 }}>{error}</div>
          )}
          {!loading && !error && dataUrls.length > 0 && (
            <img
              src={dataUrls[currentChunk]}
              alt={`QR code ${currentChunk + 1} of ${dataUrls.length}`}
              style={{ maxWidth: "100%", borderRadius: 4 }}
            />
          )}
          {!loading && !error && dataUrls.length === 0 && (
            <div style={{ opacity: 0.4, fontSize: 12 }}>Enter text above</div>
          )}
        </div>

        {/* Chunk pagination */}
        {dataUrls.length > 1 && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
            }}
          >
            <button
              onClick={() => setCurrentChunk((c) => Math.max(0, c - 1))}
              disabled={currentChunk === 0}
              style={{
                padding: "4px 10px",
                borderRadius: 5,
                border: "none",
                cursor: currentChunk === 0 ? "not-allowed" : "pointer",
                background: "var(--glass-bg-hover)",
                color: "#fff",
                fontSize: 12,
              }}
            >
              ‹
            </button>
            <span style={{ fontSize: 12, opacity: 0.7 }}>
              {currentChunk + 1} / {dataUrls.length}
            </span>
            <button
              onClick={() =>
                setCurrentChunk((c) => Math.min(dataUrls.length - 1, c + 1))
              }
              disabled={currentChunk === dataUrls.length - 1}
              style={{
                padding: "4px 10px",
                borderRadius: 5,
                border: "none",
                cursor:
                  currentChunk === dataUrls.length - 1
                    ? "not-allowed"
                    : "pointer",
                background: "var(--glass-bg-hover)",
                color: "#fff",
                fontSize: 12,
              }}
            >
              ›
            </button>
          </div>
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
        <button
          onClick={() => void handleCopyImage()}
          disabled={dataUrls.length === 0}
          style={{
            flex: 2,
            padding: "7px 0",
            borderRadius: 6,
            border: "none",
            cursor: dataUrls.length > 0 ? "pointer" : "not-allowed",
            fontSize: 12,
            fontWeight: 600,
            background: copied
              ? "var(--success-glow)"
              : "var(--accent-primary)",
            color: "#fff",
          }}
        >
          {copied ? "✓ Copied!" : "Copy QR Image"}
        </button>
        <button
          onClick={() => void handleSave()}
          disabled={dataUrls.length === 0}
          style={{
            flex: 1,
            padding: "7px 0",
            borderRadius: 6,
            border: "none",
            cursor: dataUrls.length > 0 ? "pointer" : "not-allowed",
            fontSize: 12,
            background: "var(--glass-bg-hover)",
            color: "#fff",
          }}
        >
          Save QR
        </button>
      </div>
    </div>
  );
}
