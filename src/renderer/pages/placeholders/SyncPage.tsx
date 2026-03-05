import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import pStyles from "../../styles/pages/PlaceholderPage.module.css";
import { hasSmartPasteBridge, invokeIPC } from "../../lib/ipc";
import { useToastStore } from "../../stores/useToastStore";

interface SyncSettings {
  sync: {
    enabled: boolean;
    deviceId: string;
    pairedDevices: { id: string; name: string }[];
  };
}

export const SyncPage: React.FC = () => {
  const { t } = useTranslation();
  const { addToast } = useToastStore();
  const [settings, setSettings] = useState<SyncSettings | null>(null);
  const [qrText, setQrText] = useState("");
  const [qrUrls, setQrUrls] = useState<string[]>([]);
  const [genLoading, setGenLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [syncEnabled, setSyncEnabled] = useState(false);

  useEffect(() => {
    if (!hasSmartPasteBridge()) return;
    invokeIPC<SyncSettings>("settings:get")
      .then((s) => {
        setSettings(s);
        setSyncEnabled(s?.sync?.enabled ?? false);
      })
      .catch((err) => {
        if (!hasSmartPasteBridge()) return;
        addToast({
          title: "Failed to load sync settings",
          message: err instanceof Error ? err.message : String(err),
          type: "error",
        });
      });
  }, [addToast]);

  const saveSync = async () => {
    if (!hasSmartPasteBridge()) {
      addToast({
        title: "Not available in browser mode",
        message: "Run this page inside Electron desktop app.",
        type: "warning",
      });
      return;
    }
    try {
      await invokeIPC("settings:update", {
        sync: { ...settings?.sync, enabled: syncEnabled },
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      addToast({
        title: "Failed to save sync settings",
        message: err instanceof Error ? err.message : String(err),
        type: "error",
      });
    }
  };

  const generateQr = async () => {
    if (!qrText.trim()) return;
    if (!hasSmartPasteBridge()) {
      addToast({
        title: "Not available in browser mode",
        message: "Run this page inside Electron desktop app.",
        type: "warning",
      });
      return;
    }
    setGenLoading(true);
    try {
      const res = await invokeIPC<{ dataUrls: string[] }>("qr:generate", {
        text: qrText,
        options: { size: 240 },
      });
      setQrUrls(res.dataUrls ?? []);
    } catch (err) {
      setQrUrls([]);
      addToast({
        title: "QR generation failed",
        message: err instanceof Error ? err.message : String(err),
        type: "error",
      });
    } finally {
      setGenLoading(false);
    }
  };

  const paired = settings?.sync?.pairedDevices ?? [];

  return (
    <div className={pStyles.page}>
      <div className={pStyles.header}>
        <h2 className={pStyles.title}>{t("placeholders.sync_title")}</h2>
      </div>

      <div
        className={pStyles.section}
        style={{ display: "flex", alignItems: "center", gap: 10 }}
      >
        <input
          type="checkbox"
          id="sync-enabled"
          checked={syncEnabled}
          onChange={(e) => setSyncEnabled(e.target.checked)}
        />
        <label
          htmlFor="sync-enabled"
          style={{ fontSize: "0.9rem", fontWeight: 500 }}
        >
          {t("placeholders.enable_sync")}
        </label>
        <button type="button" className={pStyles.btnPrimary} onClick={saveSync}>
          {saved ? t("placeholders.saved") : t("common.save")}
        </button>
      </div>

      {settings?.sync?.deviceId && (
        <div className={pStyles.section}>
          <div className={pStyles.sectionTitle}>This Device</div>
          <div className={pStyles.info}>
            Device ID:{" "}
            <code style={{ fontSize: "0.82rem" }}>
              {settings.sync.deviceId}
            </code>
          </div>
        </div>
      )}

      <div className={pStyles.section}>
        <div className={pStyles.sectionTitle}>
          Paired Devices ({paired.length})
        </div>
        {paired.length === 0 ? (
          <div className={pStyles.info}>
            No devices paired yet. Use a QR code below to pair your phone.
          </div>
        ) : (
          <div>
            {paired.map((d) => (
              <span key={d.id} className={pStyles.deviceChip}>
                {d.name || d.id}
              </span>
            ))}
          </div>
        )}
      </div>

      <div className={pStyles.section}>
        <div className={pStyles.sectionTitle}>QR Code Generator</div>
        <div className={pStyles.info}>
          Generate a QR code from any text to share with your mobile device.
        </div>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          <input
            className={pStyles.inputFull}
            style={{ flex: 1 }}
            value={qrText}
            onChange={(e) => setQrText(e.target.value)}
            placeholder="Enter text to encode..."
            onKeyDown={(e) => e.key === "Enter" && void generateQr()}
          />
          <button
            type="button"
            className={pStyles.btnPrimary}
            onClick={generateQr}
            disabled={genLoading || !qrText.trim()}
          >
            {genLoading ? "Generating..." : "Generate"}
          </button>
        </div>
        {qrUrls.length > 0 && (
          <div className={pStyles.qrBox}>
            {qrUrls.map((url, i) => (
              <div key={url} className={pStyles.qrItem}>
                <img
                  src={url}
                  alt={`QR code part ${i + 1}`}
                  className={pStyles.qrImage}
                />
                {qrUrls.length > 1 && (
                  <div className={pStyles.qrCaption}>
                    Part {i + 1}/{qrUrls.length}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
