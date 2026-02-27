import React, { useState, useEffect } from "react";
import { invokeIPC } from "../lib/ipc";
import { FloatingWindowShell } from "../components/FloatingWindowShell";
import { useToastStore } from "../stores/useToastStore";
import styles from "../styles/windows/OCRPopup.module.css";

interface OCRResult {
  text: string;
  confidence: number;
  blocks?: Array<{ text: string; confidence: number }>;
  warning?: string;
}

type OCRLanguage = "eng" | "ind";

const LANGUAGE_OPTIONS: Array<{ value: OCRLanguage; label: string }> = [
  { value: "eng", label: "English" },
  { value: "ind", label: "Indonesian" },
];

export default function OCRPopup() {
  const [imageData, setImageData] = useState<string>("");
  const [ocrResult, setOcrResult] = useState<OCRResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [selectedLanguages, setSelectedLanguages] = useState<OCRLanguage[]>([
    "eng",
  ]);
  const [threshold, setThreshold] = useState(0.5);
  const [psm, setPsm] = useState(3);
  const [lastTriedAt, setLastTriedAt] = useState<number | null>(null);
  const { addToast } = useToastStore();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      return;
    }
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ""));
      reader.onerror = () => reject(new Error("Failed to read image"));
      reader.readAsDataURL(file);
    });
    setImageData(dataUrl);
    setError("");
  };

  const runOCR = async () => {
    if (!imageData) {
      setError("Choose an image first.");
      return;
    }
    setLoading(true);
    setError("");
    setLastTriedAt(Date.now());
    try {
      const result = await invokeIPC<OCRResult>("ocr:recognize", {
        image: imageData,
        options: {
          languages: selectedLanguages,
          psm,
          confidence_threshold: threshold,
        },
      });
      setOcrResult(result);
      // ── #7 Auto-copy hasil OCR ke clipboard (✔ auto)
      await invokeIPC("clipboard:write", { text: result.text });
      addToast({
        title: "OCR Complete",
        message: result.warning
          ? `${Math.round(result.confidence * 100)}% confidence • ${result.warning}`
          : `${Math.round(result.confidence * 100)}% confidence`,
        type: "success",
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : "OCR failed.";
      setError(message);
      addToast({
        title: "OCR Failed",
        message,
        type: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const copyResult = async () => {
    if (!ocrResult?.text) {
      return;
    }
    await invokeIPC("clipboard:write", { text: ocrResult.text });
    addToast({
      title: "Copied",
      message: "OCR text copied to clipboard",
      type: "info",
    });
  };

  const toggleLanguage = (lang: OCRLanguage) => {
    setSelectedLanguages((prev) => {
      if (prev.includes(lang)) {
        const next = prev.filter((item) => item !== lang);
        return next.length > 0 ? next : prev;
      }
      return [...prev, lang];
    });
  };

  return (
    <FloatingWindowShell
      title="OCR Capture"
      icon="🧾"
      width="100%"
      height="100%"
    >
      <label className={styles.label}>Select image for OCR</label>
      <input
        className={styles.fileInput}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
      />

      {imageData && (
        <img src={imageData} alt="OCR source" className={styles.image} />
      )}

      <div className={styles.section}>
        <div className={styles.label}>Languages</div>
        <div className={styles.chips}>
          {LANGUAGE_OPTIONS.map((lang) => {
            const active = selectedLanguages.includes(lang.value);
            return (
              <button
                key={lang.value}
                onClick={() => toggleLanguage(lang.value)}
                className={`${styles.chip} ${active ? styles.chipActive : ""}`}
              >
                {lang.label}
              </button>
            );
          })}
        </div>
      </div>

      <label className={styles.label}>
        Confidence threshold: {Math.round(threshold * 100)}%
      </label>
      <input
        type="range"
        min={0.1}
        max={0.95}
        step={0.05}
        value={threshold}
        onChange={(e) => setThreshold(Number(e.target.value))}
      />

      <label className={styles.label}>Segmentation mode (PSM)</label>
      <select
        value={psm}
        onChange={(e) => setPsm(Number(e.target.value))}
        className={styles.select}
      >
        <option value={3}>3 - Auto</option>
        <option value={6}>6 - Single block</option>
        <option value={7}>7 - Single line</option>
        <option value={8}>8 - Single word</option>
      </select>

      <button
        onClick={runOCR}
        disabled={loading || !imageData}
        className={styles.btn}
      >
        {loading ? "Processing..." : ocrResult ? "Retry OCR" : "Run OCR"}
      </button>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.section}>
        <div className={styles.label}>Extracted text</div>
        <textarea
          value={ocrResult?.text ?? ""}
          onChange={(e) =>
            setOcrResult({
              text: e.target.value,
              confidence: ocrResult?.confidence ?? 0,
            })
          }
          placeholder="OCR result appears here"
          className={styles.textarea}
        />
        <div className={styles.meta}>
          Confidence: {Math.round((ocrResult?.confidence ?? 0) * 100)}%
        </div>
        <div className={styles.meta}>
          Words kept: {ocrResult?.blocks?.length ?? 0}
          {lastTriedAt
            ? ` • Last run ${new Date(lastTriedAt).toLocaleTimeString()}`
            : ""}
        </div>
        <button onClick={copyResult} className={styles.btn}>
          Copy Text
        </button>
      </div>
    </FloatingWindowShell>
  );
}
