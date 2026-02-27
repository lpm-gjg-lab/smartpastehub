import React from "react";
import { TemplateField } from "../../hooks/template/useTemplateFields";
import styles from "../../styles/components/TemplateForm.module.css";

interface Props {
  fields: TemplateField[];
  userValues: Record<string, string>;
  setUserValues: React.Dispatch<React.SetStateAction<Record<string, string>>>;
}

export function FieldInputs({ fields, userValues, setUserValues }: Props) {
  const systemFields = fields.filter((f) => f.type === "system");
  const customFields = fields.filter((f) => f.type === "user");

  if (fields.length === 0) return null;

  return (
    <div className={styles.section}>
      <div className={styles.sectionLabel}>Variables</div>
      {systemFields.length > 0 && (
        <div className={styles.chips}>
          {systemFields.map((sf) => (
            <span key={sf.name} className={styles.sysChip}>
              ⚙️ {sf.name}
            </span>
          ))}
        </div>
      )}
      {customFields.map((uf) => (
        <div key={uf.name} className={styles.field}>
          <label className={styles.fieldLabel}>
            {uf.name}{" "}
            {uf.defaultValue && (
              <span className={styles.fieldHint}>
                (default: {uf.defaultValue})
              </span>
            )}
          </label>
          <input
            type="text"
            value={userValues[uf.name] || ""}
            onChange={(e) =>
              setUserValues((prev) => ({
                ...prev,
                [uf.name]: e.target.value,
              }))
            }
            className={styles.input}
          />
        </div>
      ))}
    </div>
  );
}
