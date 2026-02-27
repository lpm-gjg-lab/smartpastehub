import React from "react";
import { Template } from "../../hooks/template/useTemplates";
import styles from "../../styles/components/TemplateForm.module.css";

interface Props {
  templates: Template[];
  selectedId: number | null;
  onSelect: (id: number | null) => void;
  newName: string;
  setNewName: (name: string) => void;
}

export function TemplateSelector({
  templates,
  selectedId,
  onSelect,
  newName,
  setNewName,
}: Props) {
  return (
    <>
      <div className={styles.row}>
        <select
          value={selectedId === null ? "" : String(selectedId)}
          onChange={(e) =>
            onSelect(
              e.target.value ? Number.parseInt(e.target.value, 10) : null,
            )
          }
          className={styles.control}
        >
          <option value="">-- Custom Template --</option>
          {templates.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <button
          onClick={() => {
            onSelect(null);
            setNewName("");
          }}
          className={styles.chipBtn}
        >
          New
        </button>
      </div>
      <input
        type="text"
        placeholder="Template Name (to save)"
        value={newName}
        onChange={(e) => setNewName(e.target.value)}
        className={styles.input}
      />
    </>
  );
}
