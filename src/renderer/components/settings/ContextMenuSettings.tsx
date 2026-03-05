import React from "react";
import { useTranslation } from "react-i18next";
import styles from "../../styles/pages/SettingsPage.module.css";
import { Button } from "../Button";
import type { AppSettings } from "../../../shared/types";

interface ContextMenuStatus {
  supported: boolean;
  installed: boolean;
  mode?: "top_level" | "submenu";
  installedCount: number;
}

interface ContextMenuSettingsProps {
  settings: AppSettings;
  contextMenuStatus: ContextMenuStatus | null;
  contextMenuBusy: boolean;
  handleContextMenuModeChange: (
    menuMode: "top_level" | "submenu",
  ) => Promise<void>;
  handleRepairContextMenu: (mode?: "install" | "uninstall") => Promise<void>;
  loadContextMenuStatus: () => Promise<void>;
  handleToggleContextMenu: (enabled: boolean) => Promise<void>;
}

export const ContextMenuSettings: React.FC<ContextMenuSettingsProps> = ({
  settings,
  contextMenuStatus,
  contextMenuBusy,
  handleContextMenuModeChange,
  handleRepairContextMenu,
  loadContextMenuStatus,
  handleToggleContextMenu,
}) => {
  const { t } = useTranslation();

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>{t("settings.context_menu")}</h2>
      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <h3>{t("settings.enable_windows_context_menu")}</h3>
          <p>{t("settings.context_menu_desc")}</p>
          <div className={styles.buttonGroup}>
            <select
              className={styles.input}
              value={settings.general.contextMenuMode ?? "top_level"}
              onChange={(e) =>
                void handleContextMenuModeChange(
                  e.target.value as "top_level" | "submenu",
                )
              }
              disabled={
                contextMenuBusy || !(settings.general.enableContextMenu ?? true)
              }
            >
              <option value="top_level">
                {t("settings.top_level_actions")}
              </option>
              <option value="submenu">
                {t("settings.single_submenu_smart_paste_hub")}
              </option>
            </select>
          </div>
          {contextMenuStatus && (
            <div className={styles.statusMetaRow}>
              <span
                className={`${styles.statusBadge} ${
                  contextMenuStatus.installedCount > 0
                    ? styles.statusBadgeOk
                    : styles.statusBadgeWarn
                }`}
              >
                {contextMenuStatus.installedCount > 0
                  ? t("settings.commands_installed", {
                      count: contextMenuStatus.installedCount,
                    })
                  : t("settings.not_installed")}
              </span>
              {contextMenuStatus.supported ? (
                <>
                  <span
                    className={`${styles.statusBadge} ${
                      contextMenuStatus.installed
                        ? styles.statusBadgeOk
                        : styles.statusBadgeWarn
                    }`}
                  >
                    {t("settings.status")}:
                    {contextMenuStatus.installed
                      ? t("settings.perfect_match")
                      : t("settings.partial_missing")}
                  </span>
                  <span
                    className={`${styles.statusBadge} ${styles.statusBadgeOk}`}
                  >
                    {t("settings.mode")}
                    {(contextMenuStatus.mode ?? "top_level") === "submenu"
                      ? t("settings.submenu")
                      : t("settings.top_level")}
                  </span>
                </>
              ) : (
                <span
                  className={`${styles.statusBadge} ${styles.statusBadgeWarn}`}
                >
                  {t("settings.unsupported_on_this_platform")}
                </span>
              )}
            </div>
          )}
          {contextMenuStatus &&
          contextMenuStatus.installedCount > 0 &&
          !contextMenuStatus.installed ? (
            <p className={styles.hint}>
              {t("settings.context_menu_repair_hint")}
            </p>
          ) : null}
          <div className={styles.buttonGroup}>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void handleRepairContextMenu("install")}
              disabled={contextMenuBusy}
            >
              {t("settings.repair_install")}
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => void handleRepairContextMenu("uninstall")}
              disabled={contextMenuBusy}
            >
              {t("settings.repair_remove")}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => void loadContextMenuStatus()}
              disabled={contextMenuBusy}
            >
              {t("settings.refresh_status")}
            </Button>
          </div>
        </div>
        <label className={styles.toggle}>
          <input
            type="checkbox"
            checked={settings.general.enableContextMenu ?? true}
            onChange={(e) => void handleToggleContextMenu(e.target.checked)}
            disabled={contextMenuBusy}
          />
          <span className={styles.slider}></span>
        </label>
      </div>
    </div>
  );
};
