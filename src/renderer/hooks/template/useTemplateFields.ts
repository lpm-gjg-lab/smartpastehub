import { useState, useEffect } from "react";

export interface TemplateField {
  name: string;
  type: "system" | "user";
  defaultValue?: string;
}

function parseUserTemplateFields(content: string): TemplateField[] {
  const matches = content.match(/\{(\w+)\}/g) ?? [];
  const variables = Array.from(
    new Set(matches.map((match) => match.replace(/[{}]/g, ""))),
  );
  return variables.map((name) => ({ name, type: "user" }));
}

export function useTemplateFields(rawContent: string) {
  const [fields, setFields] = useState<TemplateField[]>([]);
  const [userValues, setUserValues] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!rawContent) {
      setFields([]);
      return;
    }
    const parsedFields = parseUserTemplateFields(rawContent);
    setFields(parsedFields);

    setUserValues((prev) => {
      const next: Record<string, string> = {};
      for (const field of parsedFields) {
        if (field.type === "user") {
          next[field.name] = prev[field.name] ?? "";
        }
      }
      return next;
    });
  }, [rawContent]);

  return { fields, userValues, setUserValues };
}
