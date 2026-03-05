import React from "react";
import { useTranslation } from "react-i18next";
import styles from "../../styles/pages/SettingsPage.module.css";
import { Button } from "../Button";
import { RECOMMENDED_PASTE_HOTKEYS } from "../../../shared/constants";
import type { AppSettings } from "../../../shared/types";

interface HotkeySettingsProps {
  resolveHotkeyInputValue: (key: keyof AppSettings["hotkeys"]) => string;
  buildHotkeyFromKeydown: (
    e: React.KeyboardEvent<HTMLInputElement>,
  ) => string | null;
  updateSetting: (path: string, value: unknown) => Promise<void>;
  applyRecommendedHotkeys: () => Promise<void>;
  applyQuickTestProfile: () => Promise<void>;
}

const HOTKEY_ROWS: Array<{
  titleKey: string;
  descriptionKey: string;
  keyName: keyof AppSettings["hotkeys"];
}> = [
  {
    titleKey: "settings.hotkey_smart_paste_shortcut",
    descriptionKey: "settings.hotkey_smart_paste_shortcut_desc",
    keyName: "pasteClean",
  },
  {
    titleKey: "settings.hotkey_ocr_screenshot",
    descriptionKey: "settings.hotkey_ocr_screenshot_desc",
    keyName: "ocrCapture",
  },
  {
    titleKey: "settings.hotkey_history_ring",
    descriptionKey: "settings.hotkey_history_ring_desc",
    keyName: "historyOpen",
  },
  {
    titleKey: "settings.hotkey_multi_copy_toggle",
    descriptionKey: "settings.hotkey_multi_copy_toggle_desc",
    keyName: "multiCopy",
  },
  {
    titleKey: "settings.hotkey_translate_clipboard",
    descriptionKey: "settings.hotkey_translate_clipboard_desc",
    keyName: "translateClipboard",
  },
  {
    titleKey: "settings.hotkey_ghost_write",
    descriptionKey: "settings.hotkey_ghost_write_desc",
    keyName: "ghostWrite",
  },
  {
    titleKey: "settings.hotkey_cycle_ai_presets",
    descriptionKey: "settings.hotkey_cycle_ai_presets_desc",
    keyName: "presetSwitch",
  },
  {
    titleKey: "settings.hotkey_screenshot_only",
    descriptionKey: "settings.hotkey_screenshot_only_desc",
    keyName: "screenshotCapture",
  },
];

export const HotkeySettings: React.FC<HotkeySettingsProps> = ({
  resolveHotkeyInputValue,
  buildHotkeyFromKeydown,
  updateSetting,
  applyRecommendedHotkeys,
  applyQuickTestProfile,
}) => {
  const { t } = useTranslation();

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>{t("settings.hotkeys")}</h2>

      {HOTKEY_ROWS.map((row) => (
        <div className={styles.settingRow} key={row.keyName}>
          <div className={styles.settingInfo}>
            <h3>{t(row.titleKey)}</h3>
            <p>{t(row.descriptionKey)}</p>
          </div>
          <div className={styles.hotkeyInput}>
            <input
              type="text"
              value={resolveHotkeyInputValue(row.keyName)}
              readOnly
              className={styles.input}
              onKeyDown={(e) => {
                e.preventDefault();
                const hotkey = buildHotkeyFromKeydown(e);
                if (!hotkey) return;
                void updateSetting(`hotkeys.${row.keyName}`, hotkey);
              }}
            />
            <span className={styles.hint}>
              {t("settings.click_and_press_keys")}
            </span>
          </div>
        </div>
      ))}

      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <h3>{t("settings.per_app_hotkey_overrides")}</h3>
          <p>
            {t("settings.use")}{" "}
            <code>{resolveHotkeyInputValue("presetSwitch")}</code>{" "}
            {t("settings.to_cycle_presets_main_hotkey_global")}
          </p>
        </div>
      </div>

      <div className={styles.settingRow}>
        <div className={styles.settingInfo}>
          <h3>{t("settings.recommended_low_collision_hotkey")}</h3>
          <p>
            {t("settings.one_click_apply")}{" "}
            <code>{RECOMMENDED_PASTE_HOTKEYS[0]}</code>.{" "}
            {t("settings.if_unavailable_auto_fallback")}
          </p>
        </div>
        <div className={styles.buttonGroup}>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => void applyRecommendedHotkeys()}
          >
            {t("settings.apply_recommended")}
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => void applyQuickTestProfile()}
          >
            {t("settings.quick_test_mode")}
          </Button>
        </div>
      </div>
    </div>
  );
};
