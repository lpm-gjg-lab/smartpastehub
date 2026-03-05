import React from "react";
import { useTranslation } from "react-i18next";
import styles from "../../styles/pages/SettingsPage.module.css";
import type { AppSettings } from "../../../shared/types";

interface GeneralSettingsProps {
  settings: AppSettings;
  showOnboarding: boolean;
  setShowOnboarding: React.Dispatch<React.SetStateAction<boolean>>;
  resolveHotkeyInputValue: (key: keyof AppSettings["hotkeys"]) => string;
  updateSetting: (path: string, value: unknown) => Promise<void>;
}

export const GeneralSettings: React.FC<GeneralSettingsProps> = ({
  settings,
  showOnboarding,
  setShowOnboarding,
  resolveHotkeyInputValue,
  updateSetting,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <div className={styles.section}>
        <button
          type="button"
          className={styles.sectionTitle}
          style={{ cursor: "pointer", textAlign: "left", width: "100%" }}
          onClick={() => setShowOnboarding((prev) => !prev)}
          aria-expanded={showOnboarding}
        >
          {showOnboarding ? "\u25BC" : "\u25B6"} {t("settings.getting_started")}
        </button>
        {showOnboarding && (
          <div
            style={{
              padding: "12px 0",
              display: "flex",
              flexDirection: "column",
              gap: "12px",
            }}
          >
            <div>
              <strong>{t("settings.step_1")}:</strong>{" "}
              {t("settings.copy_any_text")}{" "}
              {settings.general.autoCleanOnCopy
                ? t("settings.smartpastehub_auto_cleans_in_background")
                : t("settings.turn_on_auto_clean_on_copy_below")}
            </div>
            <div>
              <strong>{t("settings.step_2")}:</strong>{" "}
              {t("settings.paste_with_ctrl_v_result_clean")}
            </div>
            <div>
              <strong>{t("settings.bonus")}:</strong> {t("settings.press")}{" "}
              <code>{resolveHotkeyInputValue("pasteClean")}</code>{" "}
              {t("settings.for_manual_smartpaste_or_auto_ocr")}
            </div>
            <div style={{ fontSize: "12px", opacity: 0.6 }}>
              {t("settings.tip_type")} <code>;​snippet-name</code>{" "}
              {t("settings.anywhere_to_expand_snippets")}
            </div>
          </div>
        )}
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{t("settings.general")}</h2>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>{t("settings.language")}</h3>
            <p>{t("settings.language_desc")}</p>
          </div>
          <select
            className={styles.input}
            value={settings.general.language ?? "en"}
            onChange={(e) =>
              void updateSetting("general.language", e.target.value)
            }
            aria-label={t("settings.language")}
          >
            <option value="en">{t("settings.language_english")}</option>
            <option value="id">{t("settings.language_indonesian")}</option>
          </select>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>{t("settings.auto_clean_on_copy")}</h3>
            <p>{t("settings.auto_clean_on_copy_desc")}</p>
          </div>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={settings.general.autoCleanOnCopy}
              onChange={(e) =>
                void updateSetting("general.autoCleanOnCopy", e.target.checked)
              }
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>{t("settings.start_hidden_background_mode")}</h3>
            <p>{t("settings.start_hidden_background_mode_desc")}</p>
          </div>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={settings.general.startHidden}
              onChange={(e) =>
                void updateSetting("general.startHidden", e.target.checked)
              }
            />
            <span className={styles.slider}></span>
          </label>
        </div>

        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>{t("settings.launch_at_startup")}</h3>
            <p>{t("settings.launch_at_startup_desc")}</p>
          </div>
          <label className={styles.toggle}>
            <input
              type="checkbox"
              checked={settings.general.startOnBoot ?? false}
              onChange={(e) =>
                void updateSetting("general.startOnBoot", e.target.checked)
              }
            />
            <span className={styles.slider}></span>
          </label>
        </div>
      </div>
    </>
  );
};
