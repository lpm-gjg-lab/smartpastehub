import React, { useState, useCallback, useEffect, useRef } from "react";
import styles from "./styles/components/ToastWindow.module.css";
import { useToastTimers } from "./hooks/useToastTimers";
import { useToastData } from "./hooks/useToastData";
import { runToastAction } from "./components/toast/toastActions";
import { ToastHeader } from "./components/toast/ToastHeader";
import { ToastActionBar } from "./components/toast/ToastActionBar";

export default function ToastApp() {
  const [copied, setCopied] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);

  const hideWindow = useCallback(() => {
    window.close();
  }, []);

  const {
    closing,
    setClosing,
    startDismissTimers,
    clearDismissTimers,
    scheduleClose,
  } = useToastTimers(hideWindow);

  const { data, setData } = useToastData(() => {
    setClosing(false);
    setCopied(false);
    setIsAiLoading(false);
    startDismissTimers();
  });

  if (!data) return null;

  const handleAction = (action: string) => {
    runToastAction(
      action,
      data,
      setData,
      setIsAiLoading,
      setCopied,
      scheduleClose,
      clearDismissTimers,
    );
  };

  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-focus the toast container when data arrives so keyboard users can interact immediately
  useEffect(() => {
    if (data) {
      containerRef.current?.focus();
    }
  }, [data]);

  // Dismiss on Escape
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setClosing(true);
        scheduleClose(0);
      }
    },
    [setClosing, scheduleClose],
  );

  return (
    <div
      ref={containerRef}
      className={styles.toastContainer}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      tabIndex={0}
      onKeyDown={handleKeyDown}
      style={{ outline: "none" }}
    >
      <div className={`${styles.toastBox} ${closing ? styles.closing : ""}`}>
        <ToastHeader data={data} />
        <div className={styles.content}>
          {data.securityAlert
            ? "⚠️ Sensitive data masked"
            : data.type === "bypass_mode" || data.type === "system"
              ? data.cleaned
              : data.cleaned}
        </div>
        {data.previewOriginal || data.previewCleaned ? (
          <div className={styles.previewDiff}>
            <div>
              <strong>Before</strong>
              <div className={styles.previewBlock}>
                {data.previewOriginal ?? ""}
              </div>
            </div>
            <div>
              <strong>After</strong>
              <div className={styles.previewBlock}>
                {data.previewCleaned ?? ""}
              </div>
            </div>
          </div>
        ) : null}
        {data.previewStats && data.previewStats.length > 0 ? (
          <div className={styles.metaText}>{data.previewStats.join(" • ")}</div>
        ) : null}
        {data.previewRequired && data.preview ? (
          <div className={styles.metaText}>Preview: {data.preview}</div>
        ) : null}
        {data.fieldIntent ? (
          <div className={styles.metaText}>
            Target intent: {data.fieldIntent}
          </div>
        ) : null}
        {data.paletteOptions && data.paletteOptions.length > 0 ? (
          <div className={styles.metaText}>
            Palette: {data.paletteOptions.slice(0, 5).join(" | ")}
          </div>
        ) : null}
        <ToastActionBar
          data={data}
          isAiLoading={isAiLoading}
          copied={copied}
          onAction={handleAction}
        />
      </div>
    </div>
  );
}
