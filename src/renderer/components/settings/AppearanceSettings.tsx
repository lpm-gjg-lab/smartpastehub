import React from "react";
import { useTranslation } from "react-i18next";
import styles from "../../styles/pages/SettingsPage.module.css";
import { Button } from "../Button";
import type { AppSettings } from "../../../shared/types";
import appLogo from "../../assets/app-logo.png";

interface AppearanceSettingsProps {
  settings: AppSettings;
  updateSetting: (path: string, value: unknown) => Promise<void>;
}

export const AppearanceSettings: React.FC<AppearanceSettingsProps> = ({
  settings,
  updateSetting,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{t("settings.appearance")}</h2>
        <div className={styles.settingRow}>
          <div className={styles.settingInfo}>
            <h3>{t("settings.theme")}</h3>
            <p>{t("settings.choose_interface_appearance")}</p>
          </div>
          <div className={styles.buttonGroup}>
            <Button
              variant={
                settings.general?.theme === "dark" ? "primary" : "secondary"
              }
              size="sm"
              onClick={() => void updateSetting("general.theme", "dark")}
            >
              {t("settings.dark")}
            </Button>
            <Button
              variant={
                settings.general?.theme === "light" ? "primary" : "secondary"
              }
              size="sm"
              onClick={() => void updateSetting("general.theme", "light")}
            >
              {t("settings.light")}
            </Button>
          </div>
        </div>
      </div>

      <div className={styles.section}>
        <h2 className={styles.sectionTitle}>{t("settings.about")}</h2>
        <div className={styles.aboutCard}>
          <div className={styles.logo}>
            <img
              src={appLogo}
              alt="SmartPasteHub"
              style={{ width: 28, height: 28 }}
            />
          </div>
          <div className={styles.aboutInfo}>
            <h3>SmartPasteHub</h3>
            <p>{t("settings.about_tagline")}</p>
          </div>
          <div
            className={styles.aboutRow}
            style={{ display: "flex", gap: "8px", marginTop: "12px" }}
          >
            <button
              type="button"
              className={styles.btnSecondary}
              onClick={() =>
                window.dispatchEvent(new CustomEvent("app:open-onboarding"))
              }
            >
              Replay Onboarding Tour
            </button>
            <a
              href="https://github.com/your-org/smartpastehub/issues"
              target="_blank"
              rel="noreferrer"
              className={styles.btnSecondary}
              style={{ textDecoration: "none" }}
            >
              Support & Issues
            </a>
          </div>
        </div>
      </div>
    </>
  );
};
