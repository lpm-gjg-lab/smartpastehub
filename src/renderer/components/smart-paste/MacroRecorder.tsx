import React from "react";
import { useTranslation } from "react-i18next";
import styles from "../../styles/pages/SmartPastePage.module.css";
import {
  Cross2Icon,
  PlayIcon,
  PlusCircledIcon,
  StopIcon,
  TrashIcon,
} from "@radix-ui/react-icons";

interface Macro {
  name: string;
  steps: string[];
}

interface MacroRecorderProps {
  showMacroPanel: boolean;
  setShowMacroPanel: React.Dispatch<React.SetStateAction<boolean>>;
  isRecording: boolean;
  setIsRecording: React.Dispatch<React.SetStateAction<boolean>>;
  recordedSteps: string[];
  setRecordedSteps: React.Dispatch<React.SetStateAction<string[]>>;
  macroName: string;
  setMacroName: React.Dispatch<React.SetStateAction<string>>;
  macros: Macro[];
  startRecording: () => void;
  stopAndSaveMacro: () => void;
  runMacro: (macro: Macro) => Promise<void>;
  deleteMacro: (index: number) => void;
}

export const MacroRecorder: React.FC<MacroRecorderProps> = ({
  showMacroPanel,
  setShowMacroPanel,
  isRecording,
  setIsRecording,
  recordedSteps,
  setRecordedSteps,
  macroName,
  setMacroName,
  macros,
  startRecording,
  stopAndSaveMacro,
  runMacro,
  deleteMacro,
}) => {
  const { t } = useTranslation();

  return (
    <div className={styles.macroPanel}>
      <div className={styles.multiHeader}>
        <span className={styles.multiLabel}>
          {t("smart_paste.macro_recorder")}
        </span>
        <button
          type="button"
          className={styles.multiBtn}
          onClick={() => setShowMacroPanel((v) => !v)}
        >
          {showMacroPanel ? "Hide" : "Show"}
        </button>
      </div>
      {showMacroPanel && (
        <div className={styles.macroBody}>
          <div className={styles.macroRecordRow}>
            {isRecording ? (
              <>
                <span className={styles.macroRecordingBadge}>● REC</span>
                <span className={styles.macroStepCount}>
                  {recordedSteps.length} step(s)
                </span>
                <input
                  className={styles.macroNameInput}
                  placeholder="Macro name…"
                  value={macroName}
                  onChange={(e) => setMacroName(e.target.value)}
                />
                <button
                  type="button"
                  className={styles.multiBtn}
                  onClick={stopAndSaveMacro}
                >
                  <StopIcon /> Save
                </button>
                <button
                  type="button"
                  className={styles.multiBtn}
                  onClick={() => {
                    setIsRecording(false);
                    setRecordedSteps([]);
                  }}
                >
                  <Cross2Icon /> Cancel
                </button>
              </>
            ) : (
              <button
                type="button"
                className={styles.multiBtn}
                onClick={startRecording}
              >
                <PlusCircledIcon /> Record New Macro
              </button>
            )}
          </div>
          {macros.length > 0 && (
            <div className={styles.macroList}>
              {macros.map((m, idx) => (
                <div
                  key={`${m.name}-${m.steps.join("|")}`}
                  className={styles.macroItem}
                >
                  <span className={styles.macroItemName}>{m.name}</span>
                  <span className={styles.macroItemSteps}>
                    {m.steps.length} steps: {m.steps.join(" → ")}
                  </span>
                  <div className={styles.macroItemActions}>
                    <button
                      type="button"
                      className={styles.multiBtn}
                      onClick={() => void runMacro(m)}
                    >
                      <PlayIcon /> Run
                    </button>
                    <button
                      type="button"
                      className={styles.multiBtn}
                      onClick={() => deleteMacro(idx)}
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
          {macros.length === 0 && !isRecording && (
            <p className={styles.macroEmpty}>
              No macros yet. Hit Record New Macro to capture a transform
              sequence.
            </p>
          )}
        </div>
      )}
    </div>
  );
};
