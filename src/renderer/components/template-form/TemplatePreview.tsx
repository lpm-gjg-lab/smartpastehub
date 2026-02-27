import React from "react";
import styles from "../../styles/components/TemplateForm.module.css";

interface Props {
  preview: string;
}

export function TemplatePreview({ preview }: Props) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionLabel}>Preview</div>
      <div className={styles.previewBox}>
        {preview || (
          <span className={styles.emptyPreview}>Nothing to preview</span>
        )}
      </div>
    </div>
  );
}
