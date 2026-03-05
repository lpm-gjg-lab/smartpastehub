import React from "react";
import { useTranslation } from "react-i18next";
import styles from "../../styles/pages/SettingsPage.module.css";
import { Button } from "../Button";
import type { AppSettings } from "../../../shared/types";

interface SecuritySettingsProps {
  settings: AppSettings;
  portablePassphrase: string;
  setPortablePassphrase: React.Dispatch<React.SetStateAction<string>>;
  portablePayload: string;
  setPortablePayload: React.Dispatch<React.SetStateAction<string>>;
  exportPortable: () => Promise<void>;
  importPortable: () => Promise<void>;
  updateSetting: (path: string, value: unknown) => Promise<void>;
}

export const SecuritySettings: React.FC<SecuritySettingsProps> = ({
  settings,
  portablePassphrase,
  setPortablePassphrase,
  portablePayload,
  setPortablePayload,
  exportPortable,
  importPortable,
  updateSetting,
}) => {
  const { t } = useTranslation();

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>
        {t("settings.privacy_portability")}
      </h2>

      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <h3>{t("settings.auto_clear_clipboard_after_clean")}</h3>
          <p>{t("settings.auto_clear_clipboard_after_clean_desc")}</p>
        </div>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={settings.security?.autoClear || false}
            onChange={(e) =>
              void updateSetting("security.autoClear", e.target.checked)
            }
          />
          <span className={styles.slider}></span>
        </label>
      </div>

      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <h3>{t("settings.ephemeral_sensitive_clips")}</h3>
          <p>{t("settings.ephemeral_sensitive_clips_desc")}</p>
        </div>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={settings.privacy?.enableEphemeralSensitiveClips ?? true}
            onChange={(e) =>
              void updateSetting(
                "privacy.enableEphemeralSensitiveClips",
                e.target.checked,
              )
            }
          />
          <span className={styles.slider}></span>
        </label>
      </div>

      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <h3>{t("settings.privacy_firewall")}</h3>
          <p>{t("settings.privacy_firewall_desc")}</p>
        </div>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={settings.privacy?.enablePrivacyFirewall ?? true}
            onChange={(e) =>
              void updateSetting(
                "privacy.enablePrivacyFirewall",
                e.target.checked,
              )
            }
          />
          <span className={styles.slider}></span>
        </label>
      </div>

      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <h3>Privacy firewall paste behavior</h3>
          <p>
            Display-only keeps original clipboard value and masks only
            preview/HUD. Redact clipboard rewrites the pasted value.
          </p>
        </div>
        <select
          className={styles.input}
          value={settings.privacy?.firewallRedactionMode ?? "display_only"}
          onChange={(e) =>
            void updateSetting(
              "privacy.firewallRedactionMode",
              e.target.value as "display_only" | "mutate_clipboard",
            )
          }
        >
          <option value="display_only">Display-only (recommended)</option>
          <option value="mutate_clipboard">Redact clipboard value</option>
        </select>
      </div>

      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <h3>Strict mode for public apps</h3>
          <p>
            When enabled, chat/browser-like targets auto-switch to clipboard
            redaction mode.
          </p>
        </div>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={settings.privacy?.autoMutateOnPublicApps ?? false}
            onChange={(e) =>
              void updateSetting(
                "privacy.autoMutateOnPublicApps",
                e.target.checked,
              )
            }
          />
          <span className={styles.slider}></span>
        </label>
      </div>

      <div className={styles.settingRowFull}>
        <div className={styles.settingInfo}>
          <h3>Always redact for specific apps</h3>
          <p>
            Comma-separated app hints. Example: slack, discord, chrome,
            telegram.
          </p>
        </div>
        <input
          className={styles.inputWide}
          value={(settings.privacy?.mutateClipboardApps ?? []).join(", ")}
          onChange={(e) =>
            void updateSetting(
              "privacy.mutateClipboardApps",
              e.target.value
                .split(",")
                .map((entry) => entry.trim())
                .filter(Boolean),
            )
          }
          placeholder="slack, discord, chrome"
        />
      </div>

      <div className={styles.settingRowFull}>
        <div className={styles.settingInfo}>
          <h3>{t("settings.portable_export_import")}</h3>
          <p>{t("settings.portable_export_import_desc")}</p>
        </div>
        <input
          className={styles.inputWide}
          type="password"
          placeholder={t("settings.portable_passphrase")}
          value={portablePassphrase}
          onChange={(e) => setPortablePassphrase(e.target.value)}
        />
        <textarea
          className={styles.textarea}
          placeholder={t("settings.portable_settings_payload_placeholder")}
          value={portablePayload}
          onChange={(e) => setPortablePayload(e.target.value)}
        />
        <div className={styles.buttonGroup}>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => void exportPortable()}
          >
            {t("settings.export")}
          </Button>
          <Button
            size="sm"
            variant="primary"
            onClick={() => void importPortable()}
          >
            {t("settings.import")}
          </Button>
        </div>
      </div>
    </div>
  );
};
