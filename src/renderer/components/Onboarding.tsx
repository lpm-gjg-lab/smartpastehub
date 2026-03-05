import React, { useEffect, useMemo, useRef, useState } from "react";
import { invokeIPC } from "../lib/ipc";
import type { AppSettings } from "../../shared/types";
import { DEFAULT_SETTINGS } from "../../shared/constants";
import { useTranslation } from "react-i18next";
import type { AppTab } from "../types";
import appLogo from "../assets/app-logo.png";
import styles from "../styles/components/Onboarding.module.css";

interface OnboardingProps {
  onComplete: () => void;
  onNavigate?: (tab: AppTab) => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({
  onComplete,
  onNavigate,
}) => {
  const { t } = useTranslation();
  const primaryBtnRef = useRef<HTMLButtonElement>(null);
  const [step, setStep] = useState(0);
  const [pasteHotkey, setPasteHotkey] = useState<string>(
    DEFAULT_SETTINGS.hotkeys.pasteClean,
  );

  const totalSteps = 3;

  const steps = useMemo(
    () => [
      {
        title: t("onboarding.step1_title"),
        description: t("onboarding.step1_desc", { hotkey: pasteHotkey }),
        points: [
          t("onboarding.step1_point_hotkey", { hotkey: pasteHotkey }),
          t("onboarding.step1_point_preview"),
        ],
      },
      {
        title: t("onboarding.step2_title"),
        description: t("onboarding.step2_desc"),
        points: [
          t("onboarding.step2_point_dashboard"),
          t("onboarding.step2_point_settings"),
        ],
      },
      {
        title: t("onboarding.step3_title"),
        description: t("onboarding.step3_desc"),
        points: [
          t("onboarding.step3_point_clipper"),
          t("onboarding.step3_point_tools"),
        ],
      },
    ],
    [pasteHotkey, t],
  );

  const openToolWindow = async (
    route: string,
    width: number,
    height: number,
  ): Promise<void> => {
    try {
      await invokeIPC("window:open", {
        route,
        width,
        height,
      });
    } catch {
      // No-op: desktop-only helper action
    }
  };

  useEffect(() => {
    const loadHotkey = async () => {
      try {
        const settings = await invokeIPC<AppSettings>("settings:get");
        if (settings?.hotkeys?.pasteClean) {
          setPasteHotkey(settings.hotkeys.pasteClean);
        }
      } catch {
        // Keep default hint
      }
    };

    void loadHotkey();
  }, []);

  useEffect(() => {
    const currentStep = step;
    requestAnimationFrame(() => {
      if (currentStep >= 0) {
        primaryBtnRef.current?.focus();
      }
    });
  }, [step]);

  const nextStep = () => {
    setStep((current) => Math.min(current + 1, totalSteps - 1));
  };

  const previousStep = () => {
    setStep((current) => Math.max(current - 1, 0));
  };

  const isFinalStep = step === totalSteps - 1;
  const currentStep = steps[step];

  if (!currentStep) {
    return null;
  }

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="onboarding-title"
      aria-describedby="onboarding-description"
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          onComplete();
        }
      }}
    >
      <div className={styles.modal}>
        <div className={styles.header}>
          <div className={styles.brandRow}>
            <span className={styles.logoBadge}>
              <img
                src={appLogo}
                alt="SmartPasteHub"
                className={styles.logoImage}
              />
            </span>
            <div>
              <p className={styles.badge}>{t("onboarding.ready_badge")}</p>
              <h2 id="onboarding-title" className={styles.title}>
                {t("onboarding.title")}
              </h2>
            </div>
          </div>
          <p className={styles.stepCounter}>
            {t("onboarding.step_counter", {
              current: step + 1,
              total: totalSteps,
            })}
          </p>
        </div>

        <div className={styles.content}>
          <h3 className={styles.stepTitle}>{currentStep.title}</h3>
          <p id="onboarding-description" className={styles.stepDescription}>
            {currentStep.description}
          </p>
          <ul className={styles.points}>
            {currentStep.points.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>

          {step === 1 && (
            <div className={styles.quickActions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => onNavigate?.("dashboard")}
              >
                {t("onboarding.open_dashboard")}
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => onNavigate?.("settings")}
              >
                {t("onboarding.open_settings")}
              </button>
            </div>
          )}

          {step === 2 && (
            <div className={styles.quickActions}>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => void openToolWindow("/web-clipper", 480, 640)}
              >
                {t("onboarding.open_web_clipper")}
              </button>
              <button
                type="button"
                className={styles.secondaryBtn}
                onClick={() => void openToolWindow("/auto-chart", 440, 600)}
              >
                {t("onboarding.open_auto_chart")}
              </button>
            </div>
          )}
        </div>

        <div className={styles.footer}>
          <button
            type="button"
            className={styles.ghostBtn}
            onClick={onComplete}
          >
            {t("onboarding.skip")}
          </button>

          <div className={styles.navActions}>
            <button
              type="button"
              className={styles.secondaryBtn}
              onClick={previousStep}
              disabled={step === 0}
            >
              {t("onboarding.back")}
            </button>
            {isFinalStep ? (
              <button
                ref={primaryBtnRef}
                type="button"
                className={styles.primaryBtn}
                onClick={onComplete}
              >
                {t("onboarding.finish")}
              </button>
            ) : (
              <button
                ref={primaryBtnRef}
                type="button"
                className={styles.primaryBtn}
                onClick={nextStep}
              >
                {t("onboarding.next")}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
