import React, { useId, useState } from "react";
import { invokeIPC } from "../lib/ipc";

interface ChartResult {
  chartType: string;
  title: string;
  description: string;
  dataUrl?: string;
}

export default function AutoChart() {
  const inputId = useId();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ChartResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function generate() {
    const text = input.trim();
    if (!text) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await invokeIPC<ChartResult>("chart:generate", {
        text,
      });
      if (res) {
        setResult(res);
      } else {
        setError("Failed to generate chart");
      }
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  function close() {
    window.close();
  }

  return (
    <main
      aria-label="Auto Chart"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "var(--bg-tertiary)",
        color: "var(--text-primary)",
        fontFamily: "var(--font-sans)",
        padding: "16px",
        boxSizing: "border-box",
      }}
    >
      <div
        className="window-drag-region"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "12px",
        }}
      >
        <h1 style={{ margin: 0, fontSize: "16px", fontWeight: 600 }}>
          Auto Chart
        </h1>
        <button
          type="button"
          className="window-no-drag"
          onClick={close}
          style={{
            background: "none",
            border: "none",
            color: "var(--text-tertiary)",
            cursor: "pointer",
            fontSize: "18px",
            lineHeight: 1,
          }}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      <label
        htmlFor={inputId}
        style={{ fontSize: "12px", marginBottom: "6px" }}
      >
        Paste chart data
      </label>
      <textarea
        id={inputId}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Paste tabular data or numbers to generate a chart…"
        aria-label="Paste chart data"
        style={{
          flex: 1,
          resize: "none",
          background: "var(--bg-primary)",
          color: "var(--text-primary)",
          border: "1px solid var(--border-default)",
          borderRadius: "6px",
          padding: "10px",
          fontSize: "13px",
          fontFamily: "monospace",
          marginBottom: "10px",
        }}
      />

      {error && (
        <div
          role="alert"
          style={{
            color: "var(--accent-danger)",
            fontSize: "12px",
            marginBottom: "8px",
            padding: "6px 10px",
            background: "var(--danger-glow)",
            borderRadius: "4px",
          }}
        >
          {error}
        </div>
      )}

      {result && (
        <section
          aria-label="Generated chart summary"
          style={{
            marginBottom: "10px",
            padding: "10px",
            background: "var(--bg-secondary)",
            borderRadius: "6px",
            fontSize: "13px",
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: "4px" }}>
            {result.title}
          </div>
          <div style={{ color: "var(--text-secondary)", marginBottom: "4px" }}>
            Type: {result.chartType}
          </div>
          <div style={{ color: "var(--text-secondary)" }}>
            {result.description}
          </div>
          {result.dataUrl && (
            <img
              src={result.dataUrl}
              alt="Generated chart"
              style={{
                marginTop: "8px",
                maxWidth: "100%",
                borderRadius: "4px",
              }}
            />
          )}
        </section>
      )}

      <button
        type="button"
        onClick={() => void generate()}
        disabled={loading || !input.trim()}
        aria-label={loading ? "Generating chart" : "Generate chart"}
        style={{
          padding: "10px",
          background: loading ? "var(--bg-elevated)" : "var(--accent-primary)",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          cursor: loading ? "default" : "pointer",
          fontWeight: 600,
          fontSize: "14px",
        }}
      >
        {loading ? "Generating…" : "Generate Chart"}
      </button>
      <div
        aria-live="polite"
        aria-atomic="true"
        style={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0, 0, 0, 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {loading ? "Generating chart" : result ? "Chart generated" : ""}
      </div>
    </main>
  );
}
