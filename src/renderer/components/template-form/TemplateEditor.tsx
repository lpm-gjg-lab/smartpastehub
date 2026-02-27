import React from "react";
import styles from "../../styles/components/TemplateForm.module.css";

interface Props {
  rawContent: string;
  setRawContent: (val: string) => void;
}

export function TemplateEditor({ rawContent, setRawContent }: Props) {
  return (
    <textarea
      placeholder="Type template with {{variables}} and [[system:date]]"
      value={rawContent}
      onChange={(e) => setRawContent(e.target.value)}
      className={styles.textarea}
    />
  );
}
