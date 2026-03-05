import React from "react";
import styles from "../../styles/pages/SmartPastePage.module.css";
import { getSmartActions } from "../../lib/smart-actions";
import type { ContentType } from "../../../shared/types";
import { useTranslation } from "react-i18next";
import { Cross2Icon } from "@radix-ui/react-icons";

type RewriteMode =
  | "summarize"
  | "fix_grammar"
  | "rephrase"
  | "formalize"
  | "translate"
  | "bullet_list"
  | "numbered_list"
  | "to_table"
  | "join_lines";

interface AiRewritePanelProps {
  detectedType: ContentType | null | undefined;
  textLength: number;
  isAiRewriting: boolean;
  isTranslating: boolean;
  isSummarizingUrl: boolean;
  isDetectingTone: boolean;
  isRedacting: boolean;
  moreAiOpen: boolean;
  setMoreAiOpen: React.Dispatch<React.SetStateAction<boolean>>;
  onSmartAction: (action: string) => Promise<void>;
  onAiRewrite: (mode: RewriteMode) => Promise<void>;
  translateLang: "id" | "en";
  setTranslateLang: React.Dispatch<React.SetStateAction<"id" | "en">>;
  onTranslate: () => Promise<void>;
  onDetectTone: () => Promise<void>;
  onRedactPII: () => Promise<void>;
  onGhostWrite: () => Promise<void>;
  ghostWriteDisabled: boolean;
  detectedTone: string | null;
  clearDetectedTone: () => void;
}

export const AiRewritePanel: React.FC<AiRewritePanelProps> = ({
  detectedType,
  textLength,
  isAiRewriting,
  isTranslating,
  isSummarizingUrl,
  isDetectingTone,
  isRedacting,
  moreAiOpen,
  setMoreAiOpen,
  onSmartAction,
  onAiRewrite,
  translateLang,
  setTranslateLang,
  onTranslate,
  onDetectTone,
  onRedactPII,
  onGhostWrite,
  ghostWriteDisabled,
  detectedTone,
  clearDetectedTone,
}) => {
  const { t } = useTranslation();
  const smartActions = getSmartActions(
    detectedType ?? "plain_text",
    textLength,
  );
  const primaryActions = smartActions.filter((a) => a.isPrimary);
  const secondaryActions = smartActions.filter((a) => !a.isPrimary);

  return (
    <div className={styles.aiActions}>
      <span className={styles.aiActionLabel}>{t("smart_paste.ai")}</span>

      {primaryActions.length > 0 ? (
        primaryActions.map(({ action, label, icon }) => (
          <button
            type="button"
            key={action}
            className={`${styles.aiChip} ${styles.aiChipPrimary}`}
            disabled={isAiRewriting || isTranslating || isSummarizingUrl}
            onClick={() => void onSmartAction(action)}
          >
            {icon ? `${icon} ` : ""}
            {isAiRewriting || isTranslating || isSummarizingUrl
              ? t("smart_paste.thinking")
              : label}
          </button>
        ))
      ) : (
        <span className={styles.aiActionHint}>
          {detectedType === "source_code" || detectedType === "json_data"
            ? t("smart_paste.use_transform_lab")
            : t("smart_paste.paste_for_ai")}
        </span>
      )}

      <button
        type="button"
        className={styles.moreAiToggle}
        onClick={() => setMoreAiOpen((v) => !v)}
        aria-expanded={moreAiOpen}
      >
        {moreAiOpen
          ? `▲ ${t("smart_paste.less")}`
          : `▾ ${t("smart_paste.more_ai")}`}
      </button>

      {moreAiOpen && (
        <>
          {secondaryActions.map(({ action, label, icon }) => (
            <button
              type="button"
              key={action}
              className={styles.aiChip}
              disabled={isAiRewriting || isTranslating || isSummarizingUrl}
              onClick={() => void onSmartAction(action)}
            >
              {icon ? `${icon} ` : ""}
              {label}
            </button>
          ))}

          <button
            type="button"
            className={styles.aiChip}
            disabled={isAiRewriting}
            onClick={() => void onAiRewrite("fix_grammar")}
          >
            {t("smart_paste.ai_fix_grammar")}
          </button>
          <button
            type="button"
            className={styles.aiChip}
            disabled={isAiRewriting}
            onClick={() => void onAiRewrite("rephrase")}
          >
            {t("smart_paste.ai_rephrase")}
          </button>
          <button
            type="button"
            className={styles.aiChip}
            disabled={isAiRewriting}
            onClick={() => void onAiRewrite("formalize")}
          >
            {t("smart_paste.ai_formalize")}
          </button>
          <button
            type="button"
            className={styles.aiChip}
            disabled={isAiRewriting}
            onClick={() => void onAiRewrite("summarize")}
          >
            {t("smart_paste.ai_summarize")}
          </button>
          <button
            type="button"
            className={styles.aiChip}
            disabled={isAiRewriting}
            onClick={() => void onAiRewrite("bullet_list")}
          >
            • {t("smart_paste.ai_bullets")}
          </button>
          <button
            type="button"
            className={styles.aiChip}
            disabled={isAiRewriting}
            onClick={() => void onAiRewrite("numbered_list")}
          >
            1. {t("smart_paste.ai_numbered")}
          </button>
          <button
            type="button"
            className={styles.aiChip}
            disabled={isAiRewriting}
            onClick={() => void onAiRewrite("to_table")}
          >
            ⊞ {t("smart_paste.ai_table")}
          </button>
          <button
            type="button"
            className={styles.aiChip}
            disabled={isAiRewriting}
            onClick={() => void onAiRewrite("join_lines")}
          >
            ⊞ {t("smart_paste.ai_join_lines")}
          </button>

          <button
            type="button"
            className={styles.aiChip}
            disabled={isTranslating}
            onClick={() => {
              setTranslateLang((l) => (l === "en" ? "id" : "en"));
              void onTranslate();
            }}
          >
            {isTranslating
              ? t("smart_paste.thinking")
              : `Translate → ${translateLang === "en" ? "ID" : "EN"}`}
          </button>
          <button
            type="button"
            className={styles.aiChip}
            disabled={isDetectingTone}
            onClick={() => void onDetectTone()}
          >
            {isDetectingTone
              ? t("smart_paste.thinking")
              : t("smart_paste.detect_tone")}
          </button>
          <button
            type="button"
            className={styles.aiChip}
            disabled={isRedacting}
            onClick={() => void onRedactPII()}
          >
            {isRedacting
              ? t("smart_paste.thinking")
              : t("smart_paste.redact_pii")}
          </button>
          <button
            type="button"
            className={styles.aiChip}
            onClick={() => void onGhostWrite()}
            disabled={ghostWriteDisabled}
          >
            {t("smart_paste.ghost_write")}
          </button>

          {detectedTone && (
            <span className={styles.toneBadge}>
              {detectedTone}
              <button
                type="button"
                style={{
                  marginLeft: 6,
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                  fontSize: "0.65rem",
                }}
                onClick={clearDetectedTone}
              >
                <Cross2Icon />
              </button>
            </span>
          )}
        </>
      )}
    </div>
  );
};
