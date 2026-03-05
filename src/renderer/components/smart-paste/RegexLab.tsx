import React from "react";
import { useTranslation } from "react-i18next";
import styles from "../../styles/pages/SmartPastePage.module.css";

interface RegexLabProps {
  showRegexLab: boolean;
  setShowRegexLab: React.Dispatch<React.SetStateAction<boolean>>;
  regexPattern: string;
  setRegexPattern: React.Dispatch<React.SetStateAction<string>>;
  regexReplacement: string;
  setRegexReplacement: React.Dispatch<React.SetStateAction<string>>;
  regexFlags: string;
  setRegexFlags: React.Dispatch<React.SetStateAction<string>>;
  regexError: string | null;
  regexPreview: string | null;
  handleRegexTest: () => void;
  handleRegexApply: () => void;
}

export const RegexLab: React.FC<RegexLabProps> = ({
  showRegexLab,
  setShowRegexLab,
  regexPattern,
  setRegexPattern,
  regexReplacement,
  setRegexReplacement,
  regexFlags,
  setRegexFlags,
  regexError,
  regexPreview,
  handleRegexTest,
  handleRegexApply,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <button
        type="button"
        className={styles.transformToggle}
        onClick={() => setShowRegexLab((v) => !v)}
      >
        {showRegexLab ? "▲" : "▼"} {t("smart_paste.regex_lab")}
      </button>
      {showRegexLab && (
        <div className={styles.regexLab}>
          <div className={styles.regexLabRow}>
            <label>Pattern</label>
            <input
              className={styles.regexInput}
              value={regexPattern}
              onChange={(e) => setRegexPattern(e.target.value)}
              placeholder="e.g. \s+"
              spellCheck={false}
            />
            <label>Flags</label>
            <input
              className={styles.regexFlagsInput}
              value={regexFlags}
              onChange={(e) => setRegexFlags(e.target.value)}
              placeholder="g"
            />
          </div>
          <div className={styles.regexLabRow}>
            <label>Replace</label>
            <input
              className={styles.regexInput}
              value={regexReplacement}
              onChange={(e) => setRegexReplacement(e.target.value)}
              placeholder="replacement (use $1, $2 for groups)"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={handleRegexTest}
              className={styles.aiBtn}
            >
              Test
            </button>
            <button
              type="button"
              onClick={handleRegexApply}
              className={styles.aiBtn}
              disabled={!regexPreview}
            >
              Apply
            </button>
          </div>
          {regexError && <div className={styles.regexError}>{regexError}</div>}
          {regexPreview && (
            <div className={styles.regexPreview}>
              <span>Preview:</span> {regexPreview}
            </div>
          )}
        </div>
      )}
    </>
  );
};
