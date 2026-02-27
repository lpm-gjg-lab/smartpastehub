import React from "react";
import styles from "../../styles/components/ToastWindow.module.css";
import { ToastData } from "../../hooks/useToastData";
import { getTransformLabel } from "../../lib/transform-labels";

interface Props {
  data: ToastData;
}

export function ToastHeader({ data }: Props) {
  const transformNames =
    data.changes?.map(getTransformLabel).filter(Boolean) || [];
  const typeLabel = data.type.replace("_", " ").toUpperCase();

  const getIcon = () => {
    if (data.type === "bypass_mode") return "🛑";
    if (data.type === "sensitive_warning") return "⚠️";
    if (data.type === "size_warning") return "⚠️";
    if (data.type === "system") return "⚙️";
    if (data.type === "auto_clean") return "🧹";
    if (data.type === "paste_clean") return "✂️";
    if (data.type === "paste_preview") return "🪄";
    if (data.type === "command_palette") return "⌘";
    return "✨";
  };

  const getTitle = () => {
    if (data.type === "bypass_mode") return "Auto-Clean Snoozed";
    if (data.type === "sensitive_warning")
      return `Sensitive data detected (${data.sensitiveCount ?? 0} item${(data.sensitiveCount ?? 0) !== 1 ? "s" : ""})`;
    if (data.type === "size_warning")
      return `Large clipboard (${data.sizeKb}KB) — skipped`;
    if (data.type === "paste_clean") return "Cleaned & Copied";
    if (data.type === "auto_clean") return "Auto-Cleaned";
    if (data.type === "paste_preview") return "Preview Before Paste";
    if (data.type === "command_palette") return "Command Palette";
    if (data.type === "system") return "System Notification";
    if (data.type === "ocr_result") return "Text Extracted from Image";
    if (data.type === "ai_vision") return "AI Image Description";
    if (data.isMerged) return `Merged ${data.mergedCount} items`;
    if (transformNames.length > 0)
      return `${transformNames.length} formats applied`;
    return "Copied & Cleaned";
  };

  return (
    <div className={styles.header}>
      <div className={styles.title} role="heading" aria-level={2}>
        <span className={styles.icon}>{getIcon()}</span>
        {getTitle()}
        {data.sourceApp && data.type !== "system" && (
          <span className={styles.sourceMeta}>
            from {data.sourceApp.split(".")[0]}
          </span>
        )}
      </div>
      {data.type !== "bypass_mode" && data.type !== "system" && (
        <div
          className={styles.typeBadge}
          aria-label={`Content type ${typeLabel.toLowerCase()}`}
        >
          {typeLabel}
        </div>
      )}
    </div>
  );
}
