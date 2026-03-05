import React from "react";
import { useTranslation } from "react-i18next";
import styles from "../../styles/pages/SmartPastePage.module.css";

type TargetFormat = "json" | "yaml" | "toml";
type CaseType =
  | "camelCase"
  | "PascalCase"
  | "snake_case"
  | "kebab-case"
  | "SCREAMING_SNAKE"
  | "Title Case"
  | "lowercase"
  | "UPPERCASE";

interface TransformLabProps {
  showTransform: boolean;
  setShowTransform: React.Dispatch<React.SetStateAction<boolean>>;
  outputText: string;
  targetFormat: TargetFormat;
  setTargetFormat: React.Dispatch<React.SetStateAction<TargetFormat>>;
  selectedCase: CaseType;
  setSelectedCase: React.Dispatch<React.SetStateAction<CaseType>>;
  handleTransform: (
    channel: string,
    label: string,
    arg?: unknown,
  ) => Promise<void>;
  handleCaseConvert: () => Promise<void>;
}

export const TransformLab: React.FC<TransformLabProps> = ({
  showTransform,
  setShowTransform,
  outputText,
  targetFormat,
  setTargetFormat,
  selectedCase,
  setSelectedCase,
  handleTransform,
  handleCaseConvert,
}) => {
  const { t } = useTranslation();

  return (
    <div className={styles.transformPanel}>
      <button
        type="button"
        className={styles.transformToggle}
        onClick={() => setShowTransform((v) => !v)}
      >
        {showTransform ? "▼" : "▶"} {t("smart_paste.transform_lab")}
      </button>
      {showTransform && (
        <>
          <div className={styles.transformGrid}>
            <button
              type="button"
              className={styles.transformBtn}
              onClick={() =>
                void handleTransform("transform:math", "Math", outputText)
              }
            >
              Calculate Expression
            </button>
            <button
              type="button"
              className={styles.transformBtn}
              onClick={() =>
                void handleTransform("transform:color", "Color", outputText)
              }
            >
              Convert Color Format
            </button>
            <button
              type="button"
              className={styles.transformBtn}
              onClick={() =>
                void handleTransform(
                  "transform:open-links",
                  "Open Links",
                  outputText,
                )
              }
            >
              Open Links
            </button>
            <button
              type="button"
              className={styles.transformBtn}
              onClick={() =>
                void handleTransform(
                  "transform:scrape-url",
                  "Scrape URL",
                  outputText,
                )
              }
            >
              Scrape URL Content
            </button>
            <button
              type="button"
              className={styles.transformBtn}
              onClick={() =>
                void handleTransform(
                  "transform:extract-file",
                  "Extract File",
                  outputText,
                )
              }
            >
              Extract File Content
            </button>
            <button
              type="button"
              className={styles.transformBtn}
              onClick={() =>
                void handleTransform(
                  "transform:make-secret",
                  "Make Secret",
                  outputText,
                )
              }
            >
              Create Secret Link
            </button>
          </div>
          <button
            type="button"
            className={styles.transformBtn}
            onClick={() =>
              void handleTransform("transform:md-to-rtf", "MD→Text", outputText)
            }
          >
            Convert Markdown to Text
          </button>
          <div className={styles.transformFormatRow}>
            <span className={styles.aiActionLabel}>Convert to</span>
            <select
              className={styles.transformSelect}
              value={targetFormat}
              onChange={(e) => setTargetFormat(e.target.value as TargetFormat)}
            >
              <option value="json">JSON</option>
              <option value="yaml">YAML</option>
              <option value="toml">TOML</option>
            </select>
            <button
              type="button"
              className={styles.transformBtn}
              onClick={() =>
                void handleTransform(
                  "transform:convert-format",
                  `Convert→${targetFormat}`,
                  {
                    text: outputText,
                    targetFormat,
                  },
                )
              }
            >
              Convert Format
            </button>
          </div>
          <div className={styles.transformFormatRow}>
            <span className={styles.aiActionLabel}>Case</span>
            <select
              className={styles.transformSelect}
              value={selectedCase}
              onChange={(e) => setSelectedCase(e.target.value as CaseType)}
            >
              <option value="camelCase">camelCase</option>
              <option value="PascalCase">PascalCase</option>
              <option value="snake_case">snake_case</option>
              <option value="kebab-case">kebab-case</option>
              <option value="SCREAMING_SNAKE">SCREAMING_SNAKE</option>
              <option value="Title Case">Title Case</option>
              <option value="lowercase">lowercase</option>
              <option value="UPPERCASE">Uppercase</option>
            </select>
            <button
              type="button"
              className={styles.transformBtn}
              onClick={() => void handleCaseConvert()}
            >
              Convert Case
            </button>
          </div>
        </>
      )}
    </div>
  );
};
