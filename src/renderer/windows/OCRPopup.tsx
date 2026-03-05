import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
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
  { value: "eng", label: "window.ocr.language_english" },
  { value: "ind", label: "window.ocr.language_indonesian" },
];

export default function OCRPopup() {
  const { t } = useTranslation();
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
      reader.onerror = () =>
        reject(new Error(t("window.ocr.failed_read_image")));
      reader.readAsDataURL(file);
    });
    setImageData(dataUrl);
    setError("");
  };

  const runOCR = async () => {
    if (!imageData) {
      setError(t("window.ocr.choose_image_first"));
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
        title: t("window.ocr.complete"),
        message: result.warning
          ? t("window.ocr.confidence_warning", {
              confidence: Math.round(result.confidence * 100),
              warning: result.warning,
            })
          : t("window.ocr.confidence_only", {
              confidence: Math.round(result.confidence * 100),
            }),
        type: "success",
      });
    } catch (e) {
      const message =
        e instanceof Error ? e.message : t("window.ocr.failed_generic");
      setError(message);
      addToast({
        title: t("window.ocr.failed_title"),
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
      title: t("window.ocr.copied_title"),
      message: t("window.ocr.copied_message"),
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
      title={t("window.ocr.capture_title")}
      icon="🧾"
      width="100%"
      height="100%"
    >
      <label className={styles.label}>{t("window.ocr.select_image")}</label>
      <input
        className={styles.fileInput}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
      />

      {imageData && (
        <img
          src={imageData}
          alt={t("window.ocr.source_alt")}
          className={styles.image}
        />
      )}

      <div className={styles.section}>
        <div className={styles.label}>{t("window.ocr.languages")}</div>
        <div className={styles.chips}>
          {LANGUAGE_OPTIONS.map((lang) => {
            const active = selectedLanguages.includes(lang.value);
            return (
              <button
                key={lang.value}
                onClick={() => toggleLanguage(lang.value)}
                className={`${styles.chip} ${active ? styles.chipActive : ""}`}
              >
                {t(lang.label)}
              </button>
            );
          })}
        </div>
      </div>

      <label className={styles.label}>
        {t("window.ocr.confidence_threshold", {
          confidence: Math.round(threshold * 100),
        })}
      </label>
      <input
        type="range"
        min={0.1}
        max={0.95}
        step={0.05}
        value={threshold}
        onChange={(e) => setThreshold(Number(e.target.value))}
      />

      <label className={styles.label}>{t("window.ocr.psm_label")}</label>
      <select
        value={psm}
        onChange={(e) => setPsm(Number(e.target.value))}
        className={styles.select}
      >
        <option value={3}>{t("window.ocr.psm_auto")}</option>
        <option value={6}>{t("window.ocr.psm_block")}</option>
        <option value={7}>{t("window.ocr.psm_line")}</option>
        <option value={8}>{t("window.ocr.psm_word")}</option>
      </select>

      <button
        onClick={runOCR}
        disabled={loading || !imageData}
        className={styles.btn}
      >
        {loading
          ? t("window.ocr.processing")
          : ocrResult
            ? t("window.ocr.retry")
            : t("window.ocr.run")}
      </button>

      {error && <div className={styles.error}>{error}</div>}

      <div className={styles.section}>
        <div className={styles.label}>{t("window.ocr.extracted_text")}</div>
        <textarea
          value={ocrResult?.text ?? ""}
          onChange={(e) =>
            setOcrResult({
              text: e.target.value,
              confidence: ocrResult?.confidence ?? 0,
            })
          }
          placeholder={t("window.ocr.placeholder")}
          className={styles.textarea}
        />
        <div className={styles.meta}>
          {t("window.ocr.confidence_label", {
            confidence: Math.round((ocrResult?.confidence ?? 0) * 100),
          })}
        </div>
        <div className={styles.meta}>
          {t("window.ocr.words_kept", {
            count: ocrResult?.blocks?.length ?? 0,
          })}
          {lastTriedAt
            ? ` • ${t("window.ocr.last_run", {
                time: new Date(lastTriedAt).toLocaleTimeString(),
              })}`
            : ""}
        </div>
        <button onClick={copyResult} className={styles.btn}>
          {t("window.ocr.copy_text")}
        </button>
      </div>
    </FloatingWindowShell>
  );
}
